import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CheckoutDto } from './dto/checkout.dto';
import { ConfirmDeliveryDto } from './dto/confirm-delivery.dto';
import {
  Order,
  OrderStatus,
  EscrowStatus,
  DeliveryMethod,
  SubscriptionPlan,
  Role,
} from '../generated/prisma/client';

export interface PreparedOrderItemData {
  productId: string;
  productName: string;
  unitPriceFcfa: number;
  quantity: number;
  totalPriceFcfa: number;
}

export interface PreparedOrderData {
  shopId: string;
  orderNumber: string;
  subtotalFcfa: number;
  deliveryFeeFcfa: number;
  totalAmountFcfa: number;
  commissionRate: number;
  commissionAmountFcfa: number;
  netVendorAmountFcfa: number;
  deliveryMethod: DeliveryMethod;
  deliveryAddress: string;
  deliveryCity: string;
  deliveryPhone: string;
  deliveryNotes?: string;
  deliveryConfirmationCode: string;
  items: PreparedOrderItemData[];
}

@Injectable()
export class OrdersService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Création d'une commande / Checkout multi-boutiques en Transaction ACID
   */
  async checkout(clientId: string, dto: CheckoutDto) {
    if (!dto.items || dto.items.length === 0) {
      throw new BadRequestException('Le panier de commande est vide');
    }

    // 1. Récupération des produits et vérification des stocks
    const productIds = dto.items.map((i) => i.productId);
    const products = await this.prisma.product.findMany({
      where: { id: { in: productIds }, isPublished: true },
      include: {
        shop: {
          include: {
            wallet: true,
          },
        },
      },
    });

    if (products.length !== productIds.length) {
      throw new BadRequestException('Certains produits du panier sont introuvables ou indisponibles');
    }

    // Vérification des stocks et des quantités pour chaque produit
    for (const item of dto.items) {
      if (!item.quantity || item.quantity <= 0) {
        throw new BadRequestException('La quantité commandée doit être un entier strictement supérieur à 0');
      }

      const prod = products.find((p) => p.id === item.productId);
      if (!prod || prod.stock < item.quantity) {
        throw new BadRequestException(
          `Stock insuffisant pour l’article "${prod?.name || 'Inconnu'}". Stock restant : ${prod?.stock || 0}`,
        );
      }
    }

    // 2. Regroupement des articles par boutique
    const shopGroups = new Map<string, typeof products>();
    for (const item of dto.items) {
      const prod = products.find((p) => p.id === item.productId)!;
      const existing = shopGroups.get(prod.shopId) || [];
      existing.push(prod);
      shopGroups.set(prod.shopId, existing);
    }

    // 3. Exécution de la transaction ACID globale
    const createdOrders = await this.prisma.$transaction(async (tx) => {
      // Décrémenter les stocks physiques avec vérification atomique anti-concurrence
      for (const item of dto.items) {
        const prod = products.find((p) => p.id === item.productId)!;
        const updatedProduct = await tx.product.update({
          where: { id: item.productId },
          data: { stock: { decrement: item.quantity } },
        });

        if (updatedProduct.stock < 0) {
          throw new BadRequestException(
            `Rupture de stock concurrente pour l’article "${prod.name}". Stock restant insuffisant.`,
          );
        }
      }

      // Création de la CheckoutSession globale
      let grandTotalFcfa = 0;
      const ordersToCreate: PreparedOrderData[] = [];

      for (const [shopId, shopProducts] of shopGroups.entries()) {
        const shop = shopProducts[0].shop;

        // Calcul sous-total de cette boutique
        let shopSubtotal = 0;
        const orderItemsData: PreparedOrderItemData[] = [];

        for (const prod of shopProducts) {
          const itemDto = dto.items.find((i) => i.productId === prod.id)!;
          const lineTotal = prod.priceFcfa * itemDto.quantity;
          shopSubtotal += lineTotal;

          orderItemsData.push({
            productId: prod.id,
            productName: prod.name,
            unitPriceFcfa: prod.priceFcfa,
            quantity: itemDto.quantity,
            totalPriceFcfa: lineTotal,
          });
        }

        // Frais de livraison forfaitaires Tiak-Tiak (2 000 FCFA par défaut, 0 si PICKUP)
        const deliveryFeeFcfa =
          dto.deliveryMethod === DeliveryMethod.PICKUP ? 0 : 2000;
        const totalAmountFcfa = shopSubtotal + deliveryFeeFcfa;
        grandTotalFcfa += totalAmountFcfa;

        // Détermination du taux de commission selon le plan SaaS de la boutique
        const commissionRate = this.getCommissionRate(shop.subscriptionPlan);
        const commissionAmountFcfa = Math.round(
          shopSubtotal * (commissionRate / 100),
        );
        const netVendorAmountFcfa = shopSubtotal - commissionAmountFcfa;

        // Génération du code OTP Tiak-Tiak à 6 chiffres
        const deliveryConfirmationCode = Math.floor(
          100000 + Math.random() * 900000,
        ).toString();

        // Numéro de commande lisible (ex: OB-2026-8492)
        const randomSuffix = Math.floor(1000 + Math.random() * 9000);
        const orderNumber = `OB-${new Date().getFullYear()}-${randomSuffix}`;

        ordersToCreate.push({
          shopId,
          orderNumber,
          subtotalFcfa: shopSubtotal,
          deliveryFeeFcfa,
          totalAmountFcfa,
          commissionRate,
          commissionAmountFcfa,
          netVendorAmountFcfa,
          deliveryMethod: dto.deliveryMethod || DeliveryMethod.TIAK_TIAK,
          deliveryAddress: dto.deliveryAddress,
          deliveryCity: dto.deliveryCity || 'Dakar',
          deliveryPhone: dto.deliveryPhone,
          deliveryNotes: dto.deliveryNotes,
          deliveryConfirmationCode,
          items: orderItemsData,
        });
      }

      // Création de la CheckoutSession
      const checkoutSession = await tx.checkoutSession.create({
        data: {
          clientId,
          totalAmountFcfa: grandTotalFcfa,
          paymentProvider: dto.paymentProvider,
          providerReference: `${dto.paymentProvider}_TXN_${Date.now()}`,
          isPaid: true,
          paidAt: new Date(),
        },
      });

      // Création des sous-commandes et de leurs transactions de séquestre
      const results: Order[] = [];
      for (const orderData of ordersToCreate) {
        const order = await tx.order.create({
          data: {
            checkoutSessionId: checkoutSession.id,
            clientId,
            shopId: orderData.shopId,
            orderNumber: orderData.orderNumber,
            subtotalFcfa: orderData.subtotalFcfa,
            deliveryFeeFcfa: orderData.deliveryFeeFcfa,
            totalAmountFcfa: orderData.totalAmountFcfa,
            commissionRate: orderData.commissionRate,
            commissionAmountFcfa: orderData.commissionAmountFcfa,
            netVendorAmountFcfa: orderData.netVendorAmountFcfa,
            deliveryMethod: orderData.deliveryMethod,
            deliveryAddress: orderData.deliveryAddress,
            deliveryCity: orderData.deliveryCity,
            deliveryPhone: orderData.deliveryPhone,
            deliveryNotes: orderData.deliveryNotes,
            deliveryConfirmationCode: orderData.deliveryConfirmationCode,
            status: OrderStatus.PAID_ESCROW, // Paiement validé par le séquestre
            items: {
              create: orderData.items,
            },
            escrow: {
              create: {
                totalAmountFcfa: orderData.totalAmountFcfa,
                commissionAmountFcfa: orderData.commissionAmountFcfa,
                netVendorAmountFcfa: orderData.netVendorAmountFcfa,
                paymentProvider: dto.paymentProvider,
                providerReference: `${dto.paymentProvider}_ORD_${orderData.orderNumber}`,
                status: EscrowStatus.HELD_IN_ESCROW,
                heldAt: new Date(),
              },
            },
          },
          include: {
            items: true,
            escrow: true,
            shop: {
              select: { id: true, name: true, slug: true, whatsappNumber: true },
            },
          },
        });

        // Incrémentation du solde bloqué en séquestre du vendeur
        await tx.vendorWallet.update({
          where: { shopId: orderData.shopId },
          data: {
            escrowBalanceFcfa: { increment: orderData.netVendorAmountFcfa },
          },
        });

        // Audit log
        await tx.auditLog.create({
          data: {
            userId: clientId,
            action: 'ORDER_CREATED_ESCROW_HELD',
            entityType: 'ORDER',
            entityId: order.id,
            metadata: {
              orderNumber: order.orderNumber,
              totalAmountFcfa: order.totalAmountFcfa,
              commissionRate: order.commissionRate,
              netVendorAmountFcfa: order.netVendorAmountFcfa,
            },
          },
        });

        results.push(order);
      }

      return {
        checkoutSession,
        orders: results,
      };
    });

    return createdOrders;
  }

  /**
   * Commandes du client connecté (Dev 1 - Espace Client Marketplace)
   */
  async getClientOrders(clientId: string) {
    return this.prisma.order.findMany({
      where: { clientId },
      include: {
        items: true,
        escrow: true,
        dispute: true,
        shop: {
          select: {
            id: true,
            name: true,
            slug: true,
            logoUrl: true,
            whatsappNumber: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Commandes de la boutique du marchand connecté (Dev 2 - Espace Vendeur)
   */
  async getVendorOrders(ownerId: string, status?: OrderStatus) {
    const shop = await this.prisma.shop.findUnique({
      where: { ownerId },
    });

    if (!shop) {
      throw new NotFoundException('Boutique introuvable');
    }

    const where: any = { shopId: shop.id };
    if (status) {
      where.status = status;
    }

    return this.prisma.order.findMany({
      where,
      include: {
        items: true,
        escrow: true,
        dispute: true,
        client: {
          select: { id: true, fullName: true, phone: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Détail d'une commande avec vérification d'accès
   */
  async getOrderById(orderId: string, userId: string, role: Role) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: {
        items: true,
        escrow: true,
        dispute: true,
        shop: true,
        client: {
          select: { id: true, fullName: true, phone: true, email: true },
        },
      },
    });

    if (!order) {
      throw new NotFoundException('Commande introuvable');
    }

    // Vérification d'autorisation (Client propriétaire, Vendeur de la boutique ou Super-Admin)
    if (role === Role.CLIENT && order.clientId !== userId) {
      throw new ForbiddenException('Accès refusé à cette commande');
    }
    if (role === Role.VENDOR && order.shop.ownerId !== userId) {
      throw new ForbiddenException('Accès refusé : cette commande appartient à une autre boutique');
    }

    return order;
  }

  /**
   * Passage en préparation par le vendeur (PREPARING)
   */
  async prepareOrder(orderId: string, ownerId: string) {
    const order = await this.findAndVerifyVendorOrder(orderId, ownerId);

    if (order.status !== OrderStatus.PAID_ESCROW) {
      throw new BadRequestException('Seule une commande payée et séquestrée peut passer en préparation');
    }

    return this.prisma.order.update({
      where: { id: order.id },
      data: { status: OrderStatus.PREPARING },
    });
  }

  /**
   * Prise en charge par le livreur Tiak-Tiak (SHIPPED_TIAK_TIAK)
   */
  async shipOrder(orderId: string, ownerId: string) {
    const order = await this.findAndVerifyVendorOrder(orderId, ownerId);

    if (
      order.status !== OrderStatus.PREPARING &&
      order.status !== OrderStatus.PAID_ESCROW
    ) {
      throw new BadRequestException('La commande doit être payée ou en préparation avant expédition');
    }

    const shippedAt = new Date();
    const autoReleaseHours = Number(process.env.ESCROW_AUTO_RELEASE_HOURS) || 48;
    const autoReleaseAt = new Date(
      shippedAt.getTime() + autoReleaseHours * 60 * 60 * 1000,
    );

    return this.prisma.order.update({
      where: { id: order.id },
      data: {
        status: OrderStatus.SHIPPED_TIAK_TIAK,
        shippedAt,
        autoReleaseAt,
      },
    });
  }

  /**
   * Confirmation de réception et déblocage du séquestre en transaction ACID
   */
  async confirmDelivery(
    orderId: string,
    userId: string,
    userRole: Role,
    dto: ConfirmDeliveryDto,
  ) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: {
        escrow: true,
        shop: true,
      },
    });

    if (!order) {
      throw new NotFoundException('Commande introuvable');
    }

    if (order.status === OrderStatus.DELIVERED_CONFIRMED) {
      throw new BadRequestException('Cette commande a déjà été confirmée et livrée');
    }

    if (order.status === OrderStatus.DISPUTED) {
      throw new BadRequestException('Cette commande fait l’objet d’un litige gelé en cours d’arbitrage');
    }

    // Contrôle d'accès et vérification du code OTP
    const isClient = userRole === Role.CLIENT && order.clientId === userId;
    const isVendor = userRole === Role.VENDOR && order.shop.ownerId === userId;
    const isSuperAdmin = userRole === Role.SUPER_ADMIN;

    if (!isClient && !isVendor && !isSuperAdmin) {
      throw new ForbiddenException('Vous n’êtes pas autorisé à valider la livraison de cette commande');
    }

    // Si c'est le vendeur ou un livreur qui valide, le code OTP 6 chiffres est obligatoire
    if (isVendor) {
      if (!dto.confirmationCode) {
        throw new BadRequestException('Le code de confirmation OTP à 6 chiffres est obligatoire pour le vendeur/livreur');
      }
      if (dto.confirmationCode !== order.deliveryConfirmationCode) {
        throw new BadRequestException('Code de confirmation OTP invalide');
      }
    }

    // Transaction ACID : Libération du séquestre et versement vers le VendorWallet
    const updatedOrder = await this.prisma.$transaction(async (tx) => {
      // 1. Mettre à jour la commande avec garde atomique au niveau SQL
      const orderUpdate = await tx.order.updateMany({
        where: {
          id: order.id,
          status: {
            notIn: [
              OrderStatus.DELIVERED_CONFIRMED,
              OrderStatus.DISPUTED,
              OrderStatus.REFUNDED,
              OrderStatus.CANCELLED,
            ],
          },
        },
        data: {
          status: OrderStatus.DELIVERED_CONFIRMED,
          deliveredAt: new Date(),
        },
      });

      if (orderUpdate.count === 0) {
        throw new BadRequestException('Cette commande a déjà été confirmée ou fait l’objet d’un litige');
      }

      // 2. Mettre à jour la transaction de séquestre avec garde atomique
      const escrowUpdate = await tx.escrowTransaction.updateMany({
        where: {
          orderId: order.id,
          status: EscrowStatus.HELD_IN_ESCROW,
        },
        data: {
          status: EscrowStatus.RELEASED_TO_VENDOR,
          releasedAt: new Date(),
        },
      });

      if (escrowUpdate.count === 0) {
        throw new BadRequestException('Le séquestre de cette commande n’est plus en attente de libération');
      }

      // 3. Débloquer l'argent dans le portefeuille du vendeur
      await tx.vendorWallet.update({
        where: { shopId: order.shopId },
        data: {
          escrowBalanceFcfa: { decrement: order.netVendorAmountFcfa },
          availableBalanceFcfa: { increment: order.netVendorAmountFcfa },
          totalEarnedFcfa: { increment: order.netVendorAmountFcfa },
        },
      });

      // 4. Audit Log immuable
      await tx.auditLog.create({
        data: {
          userId,
          action: 'ESCROW_RELEASED_TO_VENDOR',
          entityType: 'ORDER',
          entityId: order.id,
          metadata: {
            orderNumber: order.orderNumber,
            netVendorAmountFcfa: order.netVendorAmountFcfa,
            commissionAmountFcfa: order.commissionAmountFcfa,
            validatedByRole: userRole,
          },
        },
      });

      const confirmedOrder = await tx.order.findUnique({
        where: { id: order.id },
        include: { escrow: true },
      });

      return confirmedOrder;
    });

    return updatedOrder;
  }

  private async findAndVerifyVendorOrder(orderId: string, ownerId: string) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: { shop: true },
    });

    if (!order) {
      throw new NotFoundException('Commande introuvable');
    }

    if (order.shop.ownerId !== ownerId) {
      throw new ForbiddenException('Cette commande n’appartient pas à votre boutique');
    }

    return order;
  }

  private getCommissionRate(plan: SubscriptionPlan): number {
    switch (plan) {
      case SubscriptionPlan.PREMIUM:
        return Number(process.env.COMMISSION_RATE_PREMIUM) || 2;
      case SubscriptionPlan.PRO:
        return Number(process.env.COMMISSION_RATE_PRO) || 3;
      case SubscriptionPlan.FREE:
      default:
        return Number(process.env.COMMISSION_RATE_FREE) || 4;
    }
  }
}
