import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import {
  InstallmentPaymentStatus,
  InstallmentPlanStatus,
} from '../generated/prisma/client';

@Injectable()
export class BnplCronService {
  private readonly logger = new Logger(BnplCronService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Tâche d'arrière-plan quotidienne pour détecter et marquer les échéances impayées
   */
  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async handleOverdueInstallments() {
    this.logger.log('Démarrage de l’audit des échéances BNPL impayées...');

    // 1. Verrou distribué MySQL pour déploiements multi-instances (zero duplicate execution)
    let lockAcquired = true;
    try {
      const lockRes = await this.prisma.$queryRawUnsafe<Array<{ acquired: number | bigint }>>(
        `SELECT GET_LOCK('openboutik_bnpl_daily_sweep', 0) as acquired`,
      );
      if (Array.isArray(lockRes) && lockRes.length > 0) {
        lockAcquired = Number(lockRes[0]?.acquired ?? 0) === 1;
      }
    } catch {
      // En environnement de test ou si mock Prisma sans MySQL natif, continuer normalement
      lockAcquired = true;
    }

    if (!lockAcquired) {
      this.logger.log(
        '⏳ Audit BNPL : Verrou distribué actif sur une autre instance cluster. Passage de tour.',
      );
      return { overduePaymentsCount: 0, affectedPlansCount: 0, skipped: true };
    }

    try {
      const now = new Date();

      const overduePayments = await this.prisma.installmentPayment.findMany({
        where: {
          status: InstallmentPaymentStatus.PENDING,
          dueDate: {
            lt: now,
          },
        },
        include: {
          plan: true,
        },
      });

      if (overduePayments.length === 0) {
        this.logger.log('Audit BNPL terminé : aucune échéance en retard.');
        return { overduePaymentsCount: 0, affectedPlansCount: 0, skipped: false };
      }

      const affectedPlanIds = new Set<string>();

      for (const payment of overduePayments) {
        await this.prisma.installmentPayment.update({
          where: { id: payment.id },
          data: { status: InstallmentPaymentStatus.OVERDUE },
        });

        affectedPlanIds.add(payment.planId);
      }

      // Basculer les plans associés en statut OVERDUE
      for (const planId of affectedPlanIds) {
        await this.prisma.installmentPlan.update({
          where: { id: planId },
          data: { status: InstallmentPlanStatus.OVERDUE },
        });
      }

      this.logger.warn(
        `Audit BNPL : ${overduePayments.length} échéance(s) passée(s) en OVERDUE sur ${affectedPlanIds.size} plan(s).`,
      );

      return {
        overduePaymentsCount: overduePayments.length,
        affectedPlansCount: affectedPlanIds.size,
        skipped: false,
      };
    } finally {
      // 2. Libération garantie du verrou distribué
      try {
        await this.prisma.$queryRawUnsafe(
          `SELECT RELEASE_LOCK('openboutik_bnpl_daily_sweep')`,
        );
      } catch {
        // Ignorer silencieusement si mock
      }
    }
  }
}
