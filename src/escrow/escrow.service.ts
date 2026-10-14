import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { EscrowStatus, OrderStatus } from '../generated/prisma/client';

@Injectable()
export class EscrowService {
  private readonly logger = new Logger(EscrowService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Vue d'ensemble de la trésorerie en séquestre pour le Super-Admin
   */
  async getEscrowOverview() {
    const [
      heldTransactions,
      releasedTransactions,
      frozenTransactions,
      allTransactionsCount,
    ] = await Promise.all([
      this.prisma.escrowTransaction.aggregate({
        where: { status: EscrowStatus.HELD_IN_ESCROW },
        _sum: {
          totalAmountFcfa: true,
          commissionAmountFcfa: true,
          netVendorAmountFcfa: true,
        },
        _count: true,
      }),
      this.prisma.escrowTransaction.aggregate({
        where: { status: EscrowStatus.RELEASED_TO_VENDOR },
        _sum: {
          totalAmountFcfa: true,
          commissionAmountFcfa: true,
          netVendorAmountFcfa: true,
        },
        _count: true,
      }),
      this.prisma.escrowTransaction.aggregate({
        where: { status: EscrowStatus.FROZEN_BY_DISPUTE },
        _sum: {
          totalAmountFcfa: true,
          commissionAmountFcfa: true,
          netVendorAmountFcfa: true,
        },
        _count: true,
      }),
      this.prisma.escrowTransaction.count(),
    ]);

    return {
      activeEscrow: {
        totalHeldFcfa: heldTransactions._sum.totalAmountFcfa || 0,
        netVendorHeldFcfa: heldTransactions._sum.netVendorAmountFcfa || 0,
        pendingCommissionFcfa: heldTransactions._sum.commissionAmountFcfa || 0,
        count: heldTransactions._count,
      },
      frozenInDispute: {
        totalFrozenFcfa: frozenTransactions._sum.totalAmountFcfa || 0,
        count: frozenTransactions._count,
      },
      releasedToVendors: {
        totalPaidOutFcfa: releasedTransactions._sum.netVendorAmountFcfa || 0,
        totalCommissionsEarnedFcfa: releasedTransactions._sum.commissionAmountFcfa || 0,
        count: releasedTransactions._count,
      },
      totalTransactions: allTransactionsCount,
    };
  }

  /**
   * Filet de sécurité : Auto-déblocage des commandes expédiées depuis plus de 48h sans litige
   */
  async autoReleaseExpiredOrders() {
    const now = new Date();

    const expiredOrders = await this.prisma.order.findMany({
      where: {
        status: OrderStatus.SHIPPED_TIAK_TIAK,
        autoReleaseAt: { lte: now },
        dispute: null, // Aucun litige ouvert
      },
      include: {
        escrow: true,
      },
    });

    this.logger.log(`Vérification auto-déblocage : ${expiredOrders.length} commandes éligibles trouvées`);

    const releasedOrders: string[] = [];

    for (const order of expiredOrders) {
      if (!order.escrow || order.escrow.status !== EscrowStatus.HELD_IN_ESCROW) {
        continue;
      }

      await this.prisma.$transaction(async (tx) => {
        await tx.order.update({
          where: { id: order.id },
          data: {
            status: OrderStatus.DELIVERED_CONFIRMED,
            deliveredAt: now,
          },
        });

        await tx.escrowTransaction.update({
          where: { orderId: order.id },
          data: {
            status: EscrowStatus.RELEASED_TO_VENDOR,
            releasedAt: now,
          },
        });

        await tx.vendorWallet.update({
          where: { shopId: order.shopId },
          data: {
            escrowBalanceFcfa: { decrement: order.netVendorAmountFcfa },
            availableBalanceFcfa: { increment: order.netVendorAmountFcfa },
            totalEarnedFcfa: { increment: order.netVendorAmountFcfa },
          },
        });

        await tx.auditLog.create({
          data: {
            action: 'ESCROW_AUTO_RELEASED_48H',
            entityType: 'ORDER',
            entityId: order.id,
            metadata: {
              orderNumber: order.orderNumber,
              netVendorAmountFcfa: order.netVendorAmountFcfa,
              reason: '48h_safety_timer_elapsed_without_dispute',
            },
          },
        });
      });

      releasedOrders.push(order.orderNumber);
    }

    return {
      success: true,
      releasedCount: releasedOrders.length,
      releasedOrders,
    };
  }

  /**
   * Webhook Wave Sénégal (Mock & Structure de production idempotente)
   */
  async handleWaveWebhook(payload: any) {
    this.logger.log(`Traitement Webhook Wave reçu : ${JSON.stringify(payload)}`);
    // Idempotence : si la transaction de séquestre existe déjà, on valide la réception
    return { received: true, provider: 'WAVE' };
  }

  /**
   * Webhook Orange Money Sénégal (Mock & Structure de production idempotente)
   */
  async handleOrangeMoneyWebhook(payload: any) {
    this.logger.log(`Traitement Webhook Orange Money reçu : ${JSON.stringify(payload)}`);
    return { received: true, provider: 'ORANGE_MONEY' };
  }
}
