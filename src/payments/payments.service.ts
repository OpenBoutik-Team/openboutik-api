import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  UnauthorizedException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { InitiatePaymentDto } from './dto/initiate-payment.dto';
import { WebhookPayloadDto, WebhookPaymentStatus } from './dto/webhook-payload.dto';
import {
  PaymentProvider,
  PaymentTxStatus,
  OrderStatus,
  EscrowStatus,
  Role,
  Prisma,
} from '../generated/prisma/client';

@Injectable()
export class PaymentsService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * 1. Initiation d'un paiement Mobile Money sur une commande client
   */
  async initiatePayment(clientId: string, dto: InitiatePaymentDto) {
    const order = await this.prisma.order.findUnique({
      where: { id: dto.orderId },
      include: {
        shop: true,
      },
    });

    if (!order) {
      throw new NotFoundException('Commande introuvable');
    }

    if (order.clientId !== clientId) {
      throw new ForbiddenException('Vous ne pouvez régler que vos propres commandes');
    }

    if (order.status !== OrderStatus.PENDING_PAYMENT) {
      throw new BadRequestException(
        `Cette commande ne peut plus être payée (statut actuel : ${order.status})`,
      );
    }

    // Création d'une transaction de paiement en statut INITIATED
    const transaction = await this.prisma.paymentTransaction.create({
      data: {
        orderId: order.id,
        amountFcfa: order.totalAmountFcfa,
        provider: dto.provider,
        phone: dto.phone,
        status: PaymentTxStatus.INITIATED,
      },
    });

    return {
      transactionId: transaction.id,
      orderId: order.id,
      orderNumber: order.orderNumber,
      amountFcfa: order.totalAmountFcfa,
      provider: dto.provider,
      phone: dto.phone,
      status: transaction.status,
      checkoutUrl: `https://pay.openboutik.sn/checkout/${transaction.id}?provider=${dto.provider.toLowerCase()}`,
      instructions:
        dto.provider === PaymentProvider.FREE_MONEY
          ? `Veuillez composer le #150# ou valider la notification Push Free Money (Mixx by Yas) sur le numéro ${dto.phone} pour le montant de ${order.totalAmountFcfa} FCFA.`
          : `Veuillez valider le paiement de ${order.totalAmountFcfa} FCFA sur votre application ${dto.provider}.`,
    };
  }

  /**
   * 2. Réception Webhook sécurisé et idempotent des opérateurs Mobile Money
   */
  async handleWebhook(
    provider: PaymentProvider,
    payload: WebhookPayloadDto,
    secretHeader?: string,
  ) {
    // Vérification de la signature / clé secrète du webhook
    const expectedSecret =
      process.env[`${provider}_WEBHOOK_SECRET`] ||
      process.env.PAYMENT_WEBHOOK_SECRET ||
      'whsec_openboutik_dev_secret';

    if (!secretHeader || secretHeader !== expectedSecret) {
      throw new UnauthorizedException(
        'Signature webhook opérateur invalide ou manquante',
      );
    }

    // Vérification d'idempotence stricte sur externalTxId
    const existingSuccessTx = await this.prisma.paymentTransaction.findUnique({
      where: { externalTxId: payload.externalTxId },
    });

    if (existingSuccessTx && existingSuccessTx.status === PaymentTxStatus.SUCCESS) {
      return {
        success: true,
        message: 'Transaction déjà traitée avec succès (idempotent)',
        transactionId: existingSuccessTx.id,
        externalTxId: existingSuccessTx.externalTxId,
        idempotent: true,
      };
    }


    const order = await this.prisma.order.findUnique({
      where: { id: payload.orderId },
      include: {
        shop: {
          include: {
            wallet: true,
          },
        },
        escrow: true,
      },
    });

    if (!order) {
      throw new NotFoundException(`Commande ${payload.orderId} introuvable`);
    }

    // Gestion de l'échec de transaction
    if (payload.status === WebhookPaymentStatus.FAILED) {
      const failedTx = await this.prisma.paymentTransaction.create({
        data: {
          orderId: order.id,
          amountFcfa: payload.amountFcfa,
          provider,
          phone: order.deliveryPhone,
          externalTxId: payload.externalTxId,
          status: PaymentTxStatus.FAILED,
          rawWebhookPayload: payload as unknown as Prisma.InputJsonValue,
        },
      });

      return {
        success: false,
        message: 'Paiement échoué enregistré',
        transactionId: failedTx.id,
      };
    }

    // Transaction atomique ACID pour le succès du paiement :
    // 1. Enregistrement/mise à jour de la PaymentTransaction en SUCCESS
    // 2. Passage de la commande en PAID_ESCROW
    // Transaction atomique ACID pour le succès du paiement :
    // 1. Enregistrement/mise à jour de la PaymentTransaction en SUCCESS
    // 2. Passage de la commande en PAID_ESCROW
    // 3. Création ou mise à jour du séquestre en HELD_IN_ESCROW
    // 4. Crédit du escrowBalanceFcfa du vendeur
    // 5. Ajout de l'événement daté dans OrderTracking
    let result: {
      paymentTx: any;
      updatedOrder: any;
    };

    try {
      result = await this.prisma.$transaction(async (tx) => {
        // Vérification intra-transactionnelle de l'état actuel de la commande
        const currentOrder = await tx.order.findUnique({
          where: { id: order.id },
        });
        const isAlreadyPaid = currentOrder?.status === OrderStatus.PAID_ESCROW;

        // 1. PaymentTransaction
        const paymentTx = await tx.paymentTransaction.create({
          data: {
            orderId: order.id,
            amountFcfa: payload.amountFcfa,
            provider,
            phone: order.deliveryPhone,
            externalTxId: payload.externalTxId,
            status: PaymentTxStatus.SUCCESS,
            rawWebhookPayload: payload as unknown as Prisma.InputJsonValue,
          },
        });

        // 2. Mise à jour de la commande
        const updatedOrder = await tx.order.update({
          where: { id: order.id },
          data: {
            status: OrderStatus.PAID_ESCROW,
          },
        });

        // Ne créditer le séquestre et n'enregistrer le tracking que lors du premier passage en PAID_ESCROW
        if (!isAlreadyPaid) {
          // 3. Mise à jour ou création du séquestre
          if (order.escrow) {
            await tx.escrowTransaction.update({
              where: { id: order.escrow.id },
              data: {
                status: EscrowStatus.HELD_IN_ESCROW,
                paymentProvider: provider,
                providerReference: payload.externalTxId,
              },
            });
          } else {
            await tx.escrowTransaction.create({
              data: {
                orderId: order.id,
                totalAmountFcfa: order.totalAmountFcfa,
                commissionAmountFcfa: order.commissionAmountFcfa,
                netVendorAmountFcfa: order.netVendorAmountFcfa,
                paymentProvider: provider,
                providerReference: payload.externalTxId,
                status: EscrowStatus.HELD_IN_ESCROW,
              },
            });
          }

          // 4. Crédit du portefeuille vendeur (solde séquestre)
          if (order.shop.wallet) {
            await tx.vendorWallet.update({
              where: { id: order.shop.wallet.id },
              data: {
                escrowBalanceFcfa: {
                  increment: order.netVendorAmountFcfa,
                },
              },
            });
          }

          // 5. Historique OrderTracking automatique
          await tx.orderTracking.create({
            data: {
              orderId: order.id,
              statusStep: OrderStatus.PAID_ESCROW,
              title: 'Paiement sécurisé sur le séquestre OpenBoutik',
              comment: `Paiement de ${order.totalAmountFcfa} FCFA validé via ${provider} (Réf : ${payload.externalTxId}). Fonds sous séquestre jusqu'à livraison.`,
            },
          });
        }

        return {
          paymentTx,
          updatedOrder,
        };
      });
    } catch (err: any) {
      // Interception gracieuse du doublon concurrent P2002 sur externalTxId (attaque rejeu simultané Promise.all)
      if (
        err?.code === 'P2002' ||
        err?.message?.includes('Unique constraint failed')
      ) {
        const existing = await this.prisma.paymentTransaction.findUnique({
          where: { externalTxId: payload.externalTxId },
        });
        if (existing) {
          return {
            success: true,
            message: 'Transaction déjà traitée avec succès (idempotent)',
            transactionId: existing.id,
            externalTxId: existing.externalTxId,
            idempotent: true,
          };
        }
      }
      throw err;
    }

    return {
      success: true,
      message: 'Paiement Mobile Money validé et séquestre sécurisé',
      transactionId: result.paymentTx.id,
      orderId: result.updatedOrder.id,
      orderNumber: result.updatedOrder.orderNumber,
      status: result.updatedOrder.status,
    };
  }

  /**
   * 3. Consultation des transactions d'une commande (protection BOLA)
   */
  async getOrderTransactions(userId: string, userRole: Role, orderId: string) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: {
        shop: true,
        paymentTransactions: {
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!order) {
      throw new NotFoundException('Commande introuvable');
    }

    const isClient = order.clientId === userId;
    const isVendor = order.shop.ownerId === userId;
    const isAdmin = userRole === Role.SUPER_ADMIN;

    if (!isClient && !isVendor && !isAdmin) {
      throw new ForbiddenException(
        'Accès interdit : vous ne pouvez consulter que vos propres transactions',
      );
    }

    return order.paymentTransactions;
  }
}
