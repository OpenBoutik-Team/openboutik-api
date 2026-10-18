import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { InitBnplDto } from './dto/init-bnpl.dto';
import { SubmitKycDto } from './dto/submit-kyc.dto';
import { ReviewKycDto } from './dto/review-kyc.dto';
import {
  KycStatus,
  OrderStatus,
  EscrowStatus,
  InstallmentPlanStatus,
  InstallmentPaymentStatus,
  Role,
} from '../generated/prisma/client';

@Injectable()
export class BnplService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * 1. Soumission des pièces d'identité KYC par l'acheteur
   */
  async submitBuyerKyc(userId: string, dto: SubmitKycDto) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('Utilisateur introuvable.');
    }

    const updated = await this.prisma.user.update({
      where: { id: userId },
      data: {
        idCardNumber: dto.idCardNumber.trim(),
        idCardUrl: dto.idCardUrl.trim(),
        kycStatus: KycStatus.PENDING,
        kycSubmittedAt: new Date(),
        kycRejectionReason: null,
      },
      select: {
        id: true,
        fullName: true,
        phone: true,
        kycStatus: true,
        idCardNumber: true,
        kycSubmittedAt: true,
      },
    });

    return updated;
  }

  /**
   * 2. Examen et validation du KYC Acheteur par le Super-Admin
   */
  async reviewBuyerKyc(targetUserId: string, dto: ReviewKycDto) {
    const user = await this.prisma.user.findUnique({
      where: { id: targetUserId },
    });

    if (!user) {
      throw new NotFoundException('Utilisateur introuvable.');
    }

    const updated = await this.prisma.user.update({
      where: { id: targetUserId },
      data: {
        kycStatus: dto.status,
        kycVerifiedAt: dto.status === KycStatus.VERIFIED ? new Date() : null,
        kycRejectionReason:
          dto.status === KycStatus.REJECTED ? dto.rejectionReason : null,
      },
      select: {
        id: true,
        fullName: true,
        phone: true,
        kycStatus: true,
        kycVerifiedAt: true,
        kycRejectionReason: true,
      },
    });

    return updated;
  }

  /**
   * 3. Initialiser un échéancier de paiement fractionné (BNPL 3x ou 4x)
   */
  async initInstallmentPlan(userId: string, dto: InitBnplDto) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('Utilisateur introuvable.');
    }

    // Condition 1 : KYC Acheteur vérifié obligatoire
    if (user.kycStatus !== KycStatus.VERIFIED) {
      throw new ForbiddenException(
        'Vérification d’identité CNI requise pour le paiement en plusieurs fois (BNPL).',
      );
    }

    // Condition 2 : Aucun plan BNPL impayé en retard
    const overduePlan = await this.prisma.installmentPlan.findFirst({
      where: {
        userId,
        status: {
          in: [InstallmentPlanStatus.OVERDUE, InstallmentPlanStatus.DEFAULTED],
        },
      },
    });

    if (overduePlan) {
      throw new ForbiddenException(
        'Impossible de souscrire un nouveau plan : vous avez des échéances en retard de paiement.',
      );
    }

    // Condition 3 : Commande valide et éligible
    const order = await this.prisma.order.findUnique({
      where: { id: dto.orderId },
      include: {
        shop: { include: { wallet: true } },
      },
    });

    if (!order) {
      throw new NotFoundException('Commande introuvable.');
    }

    if (order.clientId !== userId) {
      throw new ForbiddenException(
        'Vous ne pouvez fractionner que vos propres commandes.',
      );
    }

    if (order.status !== OrderStatus.PENDING_PAYMENT) {
      throw new BadRequestException(
        `Cette commande ne peut plus faire l’objet d’un paiement fractionné (statut actuel : ${order.status}).`,
      );
    }

    // Condition 4 : Montant minimum panier (>= 20 000 FCFA)
    if (order.totalAmountFcfa < 20000) {
      throw new BadRequestException(
        `Le paiement en plusieurs fois n’est disponible qu’à partir de 20 000 FCFA d’achat (montant actuel : ${order.totalAmountFcfa} FCFA).`,
      );
    }

    // Vérifier si un plan existe déjà pour cette commande
    const existingPlan = await this.prisma.installmentPlan.findUnique({
      where: { orderId: order.id },
    });

    if (existingPlan) {
      throw new ConflictException(
        'Un plan de paiement fractionné existe déjà pour cette commande.',
      );
    }

    // Calcul arithmétique FCFA exact sans perte de centime
    const count = dto.installmentsCount;
    const baseAmount = Math.floor(order.totalAmountFcfa / count);
    const remainder = order.totalAmountFcfa % count;

    // Construction des échéances
    const installmentsData: {
      installmentNumber: number;
      amountFcfa: number;
      dueDate: Date;
    }[] = [];

    const now = Date.now();
    for (let i = 1; i <= count; i++) {
      // Le reste de la division entière est ajouté sur la 1ère échéance
      const amountFcfa = i === 1 ? baseAmount + remainder : baseAmount;
      const dueDate = new Date(now + (i - 1) * 30 * 24 * 60 * 60 * 1000);

      installmentsData.push({
        installmentNumber: i,
        amountFcfa,
        dueDate,
      });
    }

    // Création atomique du plan et de ses échéances
    const plan = await this.prisma.$transaction(async (tx) => {
      const createdPlan = await tx.installmentPlan.create({
        data: {
          orderId: order.id,
          userId,
          shopId: order.shopId,
          totalAmountFcfa: order.totalAmountFcfa,
          installmentsCount: count,
          paidAmountFcfa: 0,
          remainingAmountFcfa: order.totalAmountFcfa,
          status: InstallmentPlanStatus.ACTIVE,
          payments: {
            create: installmentsData.map((inst) => ({
              installmentNumber: inst.installmentNumber,
              amountFcfa: inst.amountFcfa,
              dueDate: inst.dueDate,
              status: InstallmentPaymentStatus.PENDING,
            })),
          },
        },
        include: {
          payments: {
            orderBy: { installmentNumber: 'asc' },
          },
          order: {
            select: {
              id: true,
              orderNumber: true,
              totalAmountFcfa: true,
            },
          },
        },
      });

      return createdPlan;
    });

    return plan;
  }

  /**
   * 4. Payer une échéance mensuelle
   */
  async payInstallment(userId: string, installmentId: string) {
    const installment = await this.prisma.installmentPayment.findUnique({
      where: { id: installmentId },
      include: {
        plan: {
          include: {
            order: {
              include: {
                shop: { include: { wallet: true } },
                escrow: true,
              },
            },
            payments: true,
          },
        },
      },
    });

    if (!installment) {
      throw new NotFoundException('Échéance de paiement introuvable.');
    }

    if (installment.plan.userId !== userId) {
      throw new ForbiddenException(
        'Vous ne pouvez régler que vos propres mensualités.',
      );
    }

    if (installment.status === InstallmentPaymentStatus.PAID) {
      throw new BadRequestException('Cette échéance a déjà été réglée.');
    }

    const { plan } = installment;
    const { order } = plan;

    const result = await this.prisma.$transaction(async (tx) => {
      // 1. Mettre à jour l'échéance en PAID
      const updatedInstallment = await tx.installmentPayment.update({
        where: { id: installment.id },
        data: {
          status: InstallmentPaymentStatus.PAID,
          paidAt: new Date(),
          paymentTransactionId: `BNPL_TX_${Date.now()}`,
        },
      });

      // 2. Mettre à jour les montants du plan
      const newPaidAmount = plan.paidAmountFcfa + installment.amountFcfa;
      const newRemainingAmount =
        plan.remainingAmountFcfa - installment.amountFcfa;

      // Vérifier si toutes les échéances du plan sont réglées
      const isCompleted = newRemainingAmount <= 0;

      const updatedPlan = await tx.installmentPlan.update({
        where: { id: plan.id },
        data: {
          paidAmountFcfa: newPaidAmount,
          remainingAmountFcfa: newRemainingAmount,
          status: isCompleted
            ? InstallmentPlanStatus.COMPLETED
            : plan.status === InstallmentPlanStatus.OVERDUE
            ? InstallmentPlanStatus.ACTIVE
            : plan.status,
        },
        include: {
          payments: { orderBy: { installmentNumber: 'asc' } },
        },
      });

      // 3. Si c'est la 1ère échéance, valider la commande et bloquer les fonds en séquestre
      if (installment.installmentNumber === 1) {
        await tx.order.update({
          where: { id: order.id },
          data: { status: OrderStatus.PAID_ESCROW },
        });

        if (order.escrow) {
          await tx.escrowTransaction.update({
            where: { id: order.escrow.id },
            data: { status: EscrowStatus.HELD_IN_ESCROW },
          });
        } else {
          await tx.escrowTransaction.create({
            data: {
              orderId: order.id,
              totalAmountFcfa: order.totalAmountFcfa,
              commissionAmountFcfa: order.commissionAmountFcfa,
              netVendorAmountFcfa: order.netVendorAmountFcfa,
              paymentProvider: 'WAVE',
              status: EscrowStatus.HELD_IN_ESCROW,
            },
          });
        }

        if (order.shop.wallet) {
          await tx.vendorWallet.update({
            where: { id: order.shop.wallet.id },
            data: {
              escrowBalanceFcfa: { increment: order.netVendorAmountFcfa },
            },
          });
        }

        if (tx.orderTracking) {
          await tx.orderTracking.create({
            data: {
              orderId: order.id,
              statusStep: OrderStatus.PAID_ESCROW,
              title: 'Premier versement BNPL validé',
              comment: `Premier paiement de ${installment.amountFcfa} FCFA effectué. Commande passée en préparation et fonds séquestrés.`,
            },
          });
        }
      }

      return {
        installment: updatedInstallment,
        plan: updatedPlan,
      };
    });

    return result;
  }

  /**
   * 5. Consulter mes plans BNPL (Acheteur)
   */
  async getMyPlans(userId: string) {
    return this.prisma.installmentPlan.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      include: {
        payments: { orderBy: { installmentNumber: 'asc' } },
        order: {
          select: {
            id: true,
            orderNumber: true,
            status: true,
            totalAmountFcfa: true,
          },
        },
        shop: {
          select: {
            id: true,
            name: true,
            slug: true,
            logoUrl: true,
          },
        },
      },
    });
  }

  /**
   * 6. Consulter le détail d'un plan BNPL (Acheteur, Commerçant ou Admin)
   */
  async getPlanById(userId: string, userRole: Role, planId: string) {
    const plan = await this.prisma.installmentPlan.findUnique({
      where: { id: planId },
      include: {
        payments: { orderBy: { installmentNumber: 'asc' } },
        order: true,
        shop: true,
        user: {
          select: {
            id: true,
            fullName: true,
            phone: true,
            kycStatus: true,
          },
        },
      },
    });

    if (!plan) {
      throw new NotFoundException('Plan de paiement fractionné introuvable.');
    }

    const isClient = plan.userId === userId;
    const isVendor = plan.shop.ownerId === userId;
    const isAdmin = userRole === Role.SUPER_ADMIN;

    if (!isClient && !isVendor && !isAdmin) {
      throw new ForbiddenException(
        'Accès refusé aux informations de ce plan BNPL.',
      );
    }

    return plan;
  }
}
