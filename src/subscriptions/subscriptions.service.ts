import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  Logger,
  Inject,
  Optional,
} from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import type { Cache } from 'cache-manager';
import { PrismaService } from '../prisma/prisma.service';
import {
  SubscriptionPlan,
  SubscriptionStatus,
  BillingAttemptStatus,
  Prisma,
} from '../generated/prisma/client';
import { SubscriptionNotificationService } from './subscription-notification.service';
import { UpgradeSubscriptionDto } from './dto/upgrade-subscription.dto';

export interface PlanDetails {
  plan: SubscriptionPlan;
  name: string;
  priceFcfa: number;
  commissionRate: number;
  subdomainEnabled: boolean;
  features: string[];
}

@Injectable()
export class SubscriptionsService {
  private readonly logger = new Logger(SubscriptionsService.name);
  private readonly notificationService: SubscriptionNotificationService;

  constructor(
    private readonly prisma: PrismaService,
    notificationService?: SubscriptionNotificationService,
    @Optional() @Inject(CACHE_MANAGER) private readonly cacheManager?: Cache,
  ) {
    this.notificationService =
      notificationService ?? new SubscriptionNotificationService();
  }

  private async invalidateStorefrontCache(...identifiers: (string | null | undefined)[]) {
    if (!this.cacheManager) return;
    try {
      const cleanKeys = identifiers
        .filter((id): id is string => typeof id === 'string' && id.trim().length > 0)
        .map((id) => `storefront:${id.toLowerCase().trim()}`);

      if (cleanKeys.length > 0) {
        await Promise.allSettled(cleanKeys.map((key) => this.cacheManager!.del(key)));
      }
    } catch {
      // Non-blocking
    }
  }

  /**
   * Grille tarifaire officielle des abonnements SaaS OpenBoutik (Phase 5)
   */
  getAvailablePlans(): PlanDetails[] {
    return [
      {
        plan: SubscriptionPlan.FREE,
        name: 'Forfait Gratuit (Marketplace)',
        priceFcfa: 0,
        commissionRate: 3.0,
        subdomainEnabled: false,
        features: [
          'Commission de 3 % sur les ventes livrées',
          'Vente sur la marketplace centrale www.openboutik.sn',
          'Bouton de contact direct WhatsApp',
          'Paiement sécurisé par séquestre Wave, Orange Money et Free Money',
          'Livraison urbaine rapide par Tiak-Tiak',
        ],
      },
      {
        plan: SubscriptionPlan.PRO,
        name: 'Forfait Professionnel (Site Dédié & 0 % Commission)',
        priceFcfa: 5000,
        commissionRate: 0.0,
        subdomainEnabled: true,
        features: [
          '0 % de commission sur toutes les ventes de votre site',
          'Sous-domaine dédié personnalisé (https://nom-boutique.openboutik.sn)',
          'Store Builder complet (Couleurs, typographies, grille produits)',
          'Jusqu’à 5 Sponsors et partenaires affichés en vitrine',
          'Négociation de prix Wakhale et Codes Promo exclusifs',
          'Live Shopping et vidéos courtes en temps réel',
          'Tableau de bord 360° avec analyse financière avancée',
        ],
      },
      {
        plan: SubscriptionPlan.PREMIUM,
        name: 'Forfait Premium Élite (Boost Ventes, BNPL & Visibilité VIP)',
        priceFcfa: 15000,
        commissionRate: 0.0,
        subdomainEnabled: true,
        features: [
          '0 % de commission sur toutes vos ventes (vous gardez 100 % de vos bénéfices)',
          'Site dédié instantané en 1 clic (https://nom-boutique.openboutik.sn)',
          'Achat fractionné BNPL (Paiement 3x / 4x par Wave & Orange Money pour vos acheteurs)',
          'Badge officiel Vendeur Vérifié Or (Confiance maximale des acheteurs anti-arnaque)',
          'Mise en avant sponsorisée Top Vendeur sur la page d’accueil OpenBoutik',
          'Vitrine illimitée : partenaires, sponsors et grille produits personnalisée',
          'Support VIP WhatsApp 24/7 & Conciergerie (assistance pour brancher votre propre domaine si vous en avez un)',
        ],
      },
    ];
  }

  /**
   * Activation du mois d'essai gratuit de 30 jours (Phase 5)
   * Protégé contre la fraude via le registre UsedTrialRegistry.
   */
  async startFreeTrial(ownerId: string, plan: SubscriptionPlan) {
    if (plan === SubscriptionPlan.FREE) {
      throw new BadRequestException('Le forfait gratuit est accessible sans période d’essai');
    }

    const shop = await this.prisma.shop.findUnique({
      where: { ownerId },
      include: { wallet: true },
    });

    if (!shop) {
      throw new NotFoundException('Boutique introuvable pour ce commerçant');
    }

    // 1. Détection anti-fraude via UsedTrialRegistry et l'indicateur boutique
    if (shop.hasUsedFreeTrial) {
      throw new ForbiddenException(
        'Vous avez déjà bénéficié de votre mois d’essai gratuit sur OpenBoutik.',
      );
    }

    const orConditions: Prisma.UsedTrialRegistryWhereInput[] = [
      { userId: ownerId },
      { shopId: shop.id },
    ];
    if (shop.whatsappNumber) orConditions.push({ phone: shop.whatsappNumber });
    if (shop.waveNumber) orConditions.push({ waveNumber: shop.waveNumber });
    if (shop.omNumber) orConditions.push({ omNumber: shop.omNumber });
    if (shop.idCardNumber) orConditions.push({ idCardNumber: shop.idCardNumber });

    const existingTrial = await this.prisma.usedTrialRegistry.findFirst({
      where: { OR: orConditions },
    });

    if (existingTrial) {
      throw new ForbiddenException(
        'Vous avez déjà bénéficié de votre mois d’essai gratuit sur OpenBoutik (numéro ou compte déjà enregistré).',
      );
    }

    const now = new Date();
    const trialEndsAt = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000); // 30 jours
    const planPriceFcfa = plan === SubscriptionPlan.PREMIUM ? 15000 : 5000;

    const result = await this.prisma.$transaction(
      async (tx) => {
        // Enregistrement de l'empreinte anti-fraude
        await tx.usedTrialRegistry.create({
          data: {
            userId: ownerId,
            shopId: shop.id,
            phone: shop.whatsappNumber,
            waveNumber: shop.waveNumber,
            omNumber: shop.omNumber,
            idCardNumber: shop.idCardNumber,
          },
        });

        // Mise à jour de la boutique
        const updatedShop = await tx.shop.update({
          where: { id: shop.id },
          data: {
            subscriptionPlan: plan,
            subscriptionStatus: SubscriptionStatus.TRIALING,
            hasUsedFreeTrial: true,
            trialStartedAt: now,
            trialEndsAt,
            currentPeriodStart: now,
            currentPeriodEnd: trialEndsAt,
            commissionRate: 0.0,
            subdomainEnabled: true,
            billingRetryCount: 0,
            gracePeriodEndsAt: null,
            nextBillingRetryAt: null,
          },
        });

        // Enregistrement de l'abonnement
        await tx.subscription.create({
          data: {
            shopId: shop.id,
            plan,
            status: SubscriptionStatus.TRIALING,
            priceFcfa: planPriceFcfa,
            startDate: now,
            endDate: trialEndsAt,
          },
        });

        // Journal d'audit
        await tx.auditLog.create({
          data: {
            userId: ownerId,
            action: 'FREE_TRIAL_ACTIVATED',
            entityType: 'SHOP',
            entityId: shop.id,
            metadata: {
              plan,
              trialEndsAt: trialEndsAt.toISOString(),
            },
          },
        });

        return updatedShop;
      },
      { maxWait: 20000, timeout: 30000 },
    );

    await this.invalidateStorefrontCache(
      result.id,
      result.slug,
      (result as any).customDomain,
    );

    return {
      message: `Félicitations ! Votre mois d’essai gratuit sur le forfait ${plan} est activé avec succès jusqu’au ${trialEndsAt.toLocaleDateString('fr-FR')}.`,
      shop: result,
      subscriptionPlan: result.subscriptionPlan,
      subscriptionStatus: result.subscriptionStatus,
      subdomainEnabled: result.subdomainEnabled,
      trialEndsAt: result.trialEndsAt,
    };
  }

  /**
   * Tentative de prélèvement atomique de l'abonnement sur le Wallet marchand (Dunning Engine)
   */
  async attemptSubscriptionCharge(
    shopId: string,
    existingTx?: Prisma.TransactionClient,
  ) {
    const execute = async (tx: Prisma.TransactionClient) => {
      const shop = await tx.shop.findUnique({
        where: { id: shopId },
        include: { wallet: true, owner: true },
      });

      if (!shop || !shop.wallet) {
        throw new NotFoundException('Boutique ou portefeuille introuvable');
      }

      if (shop.subscriptionPlan === SubscriptionPlan.FREE) {
        return { success: true, message: 'Plan gratuit, aucun prélèvement requis.' };
      }

      const planPriceFcfa =
        shop.subscriptionPlan === SubscriptionPlan.PREMIUM ? 15000 : 5000;
      const now = new Date();
      const availableBalance = shop.wallet.availableBalanceFcfa;

      // =========================================================================
      // CAS 1 : SUCCÈS — Le vendeur a les fonds suffisants sur son Wallet
      // =========================================================================
      if (availableBalance >= planPriceFcfa) {
        const balanceAfter = availableBalance - planPriceFcfa;

        // Débit du portefeuille
        await tx.vendorWallet.update({
          where: { id: shop.wallet.id },
          data: {
            availableBalanceFcfa: { decrement: planPriceFcfa },
          },
        });

        // Journal de facturation réussi
        await tx.subscriptionBillingLog.create({
          data: {
            shopId: shop.id,
            plan: shop.subscriptionPlan,
            amountFcfa: planPriceFcfa,
            attemptNumber: Math.max(1, shop.billingRetryCount),
            status: BillingAttemptStatus.SUCCESS,
            walletBalanceBeforeFcfa: availableBalance,
            walletBalanceAfterFcfa: balanceAfter,
          },
        });

        // Renouvellement de la boutique pour 30 jours
        const nextPeriodEnd = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
        const updatedShop = await tx.shop.update({
          where: { id: shop.id },
          data: {
            subscriptionStatus: SubscriptionStatus.ACTIVE,
            currentPeriodStart: now,
            currentPeriodEnd: nextPeriodEnd,
            billingRetryCount: 0,
            gracePeriodEndsAt: null,
            nextBillingRetryAt: null,
            commissionRate: 0.0,
            subdomainEnabled: true,
          },
        });

        // Enregistrement de l'historique d'abonnement
        await tx.subscription.create({
          data: {
            shopId: shop.id,
            plan: shop.subscriptionPlan,
            status: SubscriptionStatus.ACTIVE,
            priceFcfa: planPriceFcfa,
            startDate: now,
            endDate: nextPeriodEnd,
          },
        });

        this.logger.log(
          `Prélèvement de ${planPriceFcfa} FCFA réussi pour la boutique "${shop.name}". Nouveau solde : ${balanceAfter} FCFA.`,
        );

        const recipientPhone =
          shop.whatsappNumber || (shop as any).owner?.phone || '';
        let notification = null;
        if (recipientPhone) {
          notification = await this.notificationService.notifyRenewalSuccess({
            shopId: shop.id,
            shopName: shop.name,
            recipientPhone,
            plan: shop.subscriptionPlan,
            amountFcfa: planPriceFcfa,
            availableBalanceFcfa: balanceAfter,
            nextPeriodEnd,
          });
        }

        return {
          success: true,
          message: 'Abonnement renouvelé avec succès.',
          shop: updatedShop,
          notification,
        };
      }

      // =========================================================================
      // CAS 2 : ÉCHEC PAR FONDS INSUFFISANTS (Dunning Engine 6 tentatives / 3 jours)
      // =========================================================================
      const newRetryCount = shop.billingRetryCount + 1;

      // Enregistrement de l'échec dans le journal
      await tx.subscriptionBillingLog.create({
        data: {
          shopId: shop.id,
          plan: shop.subscriptionPlan,
          amountFcfa: planPriceFcfa,
          attemptNumber: newRetryCount,
          status: BillingAttemptStatus.FAILED_INSUFFICIENT_FUNDS,
          failureReason: `Solde disponible insuffisant (${availableBalance} FCFA < ${planPriceFcfa} FCFA requis)`,
          walletBalanceBeforeFcfa: availableBalance,
          walletBalanceAfterFcfa: availableBalance,
        },
      });

      // TENTATIVES 1 À 5 (Pendant les 72h de grâce)
      if (newRetryCount < 6) {
        const gracePeriodEndsAt =
          shop.gracePeriodEndsAt ||
          new Date(now.getTime() + 72 * 60 * 60 * 1000); // 3 jours (72h)
        const nextRetryAt = new Date(now.getTime() + 12 * 60 * 60 * 1000); // 2x / jour (+12h)

        const updatedShop = await tx.shop.update({
          where: { id: shop.id },
          data: {
            subscriptionStatus: SubscriptionStatus.PAST_DUE,
            billingRetryCount: newRetryCount,
            lastBillingAttemptAt: now,
            nextBillingRetryAt: nextRetryAt,
            gracePeriodEndsAt,
            // Les privilèges (0% commission et sous-domaine) restent actifs pendant ces 72h
            commissionRate: 0.0,
            subdomainEnabled: true,
          },
        });

        this.logger.warn(
          `Tentative ${newRetryCount}/6 échouée pour la boutique "${shop.name}". Période de grâce jusqu’au ${gracePeriodEndsAt.toISOString()}.`,
        );

        const recipientPhone =
          shop.whatsappNumber || (shop as any).owner?.phone || '';
        let notification = null;
        if (recipientPhone) {
          if (newRetryCount >= 4) {
            notification =
              await this.notificationService.notifyGraceExpiringUrgent({
                shopId: shop.id,
                shopName: shop.name,
                recipientPhone,
                plan: shop.subscriptionPlan,
                amountFcfa: planPriceFcfa,
                availableBalanceFcfa: availableBalance,
                attemptNumber: newRetryCount,
                gracePeriodEndsAt,
              });
          } else {
            notification =
              await this.notificationService.notifyInsufficientFundsGracePeriod({
                shopId: shop.id,
                shopName: shop.name,
                recipientPhone,
                plan: shop.subscriptionPlan,
                amountFcfa: planPriceFcfa,
                availableBalanceFcfa: availableBalance,
                attemptNumber: newRetryCount,
                gracePeriodEndsAt,
              });
          }
        }

        return {
          success: false,
          status: SubscriptionStatus.PAST_DUE,
          retryCount: newRetryCount,
          maxRetries: 6,
          remainingRetries: 6 - newRetryCount,
          gracePeriodEndsAt,
          shop: updatedShop,
          notification,
        };
      }

      // TENTATIVE 6 (Au terme des 3 jours — RÉTROGRADATION & COUPURE DES PRIVILÈGES)
      const downgradedShop = await tx.shop.update({
        where: { id: shop.id },
        data: {
          subscriptionStatus: SubscriptionStatus.CANCELED_DOWNGRADED,
          subscriptionPlan: SubscriptionPlan.FREE,
          commissionRate: 3.0, // Repasse à 3.0 %
          subdomainEnabled: false, // Coupure du sous-domaine
          customDomainVerified: false,
          billingRetryCount: 6,
          nextBillingRetryAt: null,
          lastBillingAttemptAt: now,
        },
      });

      // Masquage automatique des sponsors
      await tx.shopSponsor.updateMany({
        where: { shopId: shop.id },
        data: { isActive: false },
      });

      this.logger.error(
        `6ème échec de facturation atteint pour la boutique "${shop.name}". Rétrogradation en FREE et coupure des privilèges effectuée.`,
      );

      const recipientPhone =
        shop.whatsappNumber || (shop as any).owner?.phone || '';
      let notification = null;
      if (recipientPhone) {
        notification =
          await this.notificationService.notifyDowngradeSuspension({
            shopId: shop.id,
            shopName: shop.name,
            recipientPhone,
            plan: shop.subscriptionPlan,
            amountFcfa: planPriceFcfa,
            availableBalanceFcfa: availableBalance,
            attemptNumber: 6,
          });
      }

      return {
        success: false,
        status: SubscriptionStatus.CANCELED_DOWNGRADED,
        retryCount: 6,
        downgraded: true,
        message:
          'Délai de grâce expiré après 6 tentatives infructueuses. La boutique a été rétrogradée sur le plan gratuit.',
        shop: downgradedShop,
        notification,
      };
    };

    if (existingTx) {
      const res = await execute(existingTx);
      if (res?.shop) {
        await this.invalidateStorefrontCache(res.shop.id, res.shop.slug, (res.shop as any).customDomain);
      } else {
        await this.invalidateStorefrontCache(shopId);
      }
      return res;
    }

    const res = await this.prisma.$transaction(execute, {
      maxWait: 20000,
      timeout: 30000,
    });
    if (res?.shop) {
      await this.invalidateStorefrontCache(res.shop.id, res.shop.slug, (res.shop as any).customDomain);
    } else {
      await this.invalidateStorefrontCache(shopId);
    }
    return res;
  }

  /**
   * Traitement en lot de tous les abonnements arrivés à échéance (Cron & appel manuel)
   */
  async processDueSubscriptions() {
    const now = new Date();

    // 1. Boutiques en cours (ACTIVE ou TRIALING) arrivées à terme de leur période
    const expiredActiveShops = await this.prisma.shop.findMany({
      where: {
        subscriptionPlan: { in: [SubscriptionPlan.PRO, SubscriptionPlan.PREMIUM] },
        subscriptionStatus: { in: [SubscriptionStatus.ACTIVE, SubscriptionStatus.TRIALING] },
        OR: [
          { currentPeriodEnd: { lte: now } },
          { trialEndsAt: { lte: now } },
        ],
      },
      select: { id: true, name: true },
    });

    // 2. Boutiques en PAST_DUE prêtes pour une nouvelle relance (prochaine tentative ou délai dépassé)
    const pastDueShops = await this.prisma.shop.findMany({
      where: {
        subscriptionStatus: SubscriptionStatus.PAST_DUE,
        billingRetryCount: { lt: 6 },
        OR: [
          { nextBillingRetryAt: { lte: now } },
          { nextBillingRetryAt: null },
          { gracePeriodEndsAt: { lte: now } },
        ],
      },
      select: { id: true, name: true },
    });

    const targetShopIds = Array.from(
      new Set([...expiredActiveShops.map((s) => s.id), ...pastDueShops.map((s) => s.id)]),
    );

    this.logger.log(`Lancement du cycle de facturation pour ${targetShopIds.length} boutique(s)...`);

    const results = [];
    for (const shopId of targetShopIds) {
      try {
        const res = await this.attemptSubscriptionCharge(shopId);
        results.push({ shopId, ...res });
      } catch (err: any) {
        this.logger.error(`Erreur lors du traitement de la boutique ${shopId}: ${err.message}`);
        results.push({ shopId, success: false, error: err.message });
      }
    }

    return {
      processedTotal: targetShopIds.length,
      successCount: results.filter((r) => r.success).length,
      failedCount: results.filter((r) => !r.success).length,
      results,
    };
  }

  /**
   * Scan et expédition des rappels préventifs WhatsApp & SMS (J-3 / J-1 avant date d'échéance)
   * Prévient les commerçants avant la fin de leur essai de 30j ou le renouvellement de leur forfait.
   * Protégé contre le spam via un journal AuditLog (au maximum 1 rappel toutes les 48h).
   */
  async sendUpcomingRenewalReminders(daysAhead: number = 3) {
    const now = new Date();
    const futureLimit = new Date(
      now.getTime() + daysAhead * 24 * 60 * 60 * 1000,
    );

    // 1. Détection des boutiques concernées (PRO et PREMIUM, en ACTIVE ou TRIALING)
    const upcomingShops = await this.prisma.shop.findMany({
      where: {
        subscriptionPlan: { in: [SubscriptionPlan.PRO, SubscriptionPlan.PREMIUM] },
        subscriptionStatus: {
          in: [SubscriptionStatus.ACTIVE, SubscriptionStatus.TRIALING],
        },
        OR: [
          {
            subscriptionStatus: SubscriptionStatus.ACTIVE,
            currentPeriodEnd: { gte: now, lte: futureLimit },
          },
          {
            subscriptionStatus: SubscriptionStatus.TRIALING,
            trialEndsAt: { gte: now, lte: futureLimit },
          },
        ],
      },
      include: {
        wallet: true,
        owner: true,
      },
    });

    this.logger.log(
      `Scan des rappels pré-échéance : ${upcomingShops.length} boutique(s) éligible(s) dans la fenêtre des ${daysAhead} prochains jours.`,
    );

    const results = [];
    const minIntervalMs = 48 * 60 * 60 * 1000; // Au moins 48h entre 2 rappels

    for (const shop of upcomingShops) {
      try {
        const isTrial = shop.subscriptionStatus === SubscriptionStatus.TRIALING;
        const dueDate = isTrial ? shop.trialEndsAt : shop.currentPeriodEnd;

        if (!dueDate) continue;

        // Vérification anti-spam (AuditLog récent)
        let recentAudit = null;
        if (
          this.prisma.auditLog &&
          typeof this.prisma.auditLog.findFirst === 'function'
        ) {
          recentAudit = await this.prisma.auditLog.findFirst({
            where: {
              action: 'UPCOMING_RENEWAL_REMINDER_SENT',
              entityType: 'SHOP',
              entityId: shop.id,
              createdAt: { gte: new Date(now.getTime() - minIntervalMs) },
            },
          });
        }

        if (recentAudit) {
          this.logger.debug(
            `Rappel déjà envoyé récemment pour la boutique "${shop.name}" (ID: ${shop.id}), ignoré.`,
          );
          continue;
        }

        const daysRemaining = Math.max(
          1,
          Math.ceil((dueDate.getTime() - now.getTime()) / (24 * 60 * 60 * 1000)),
        );
        const planPriceFcfa =
          shop.subscriptionPlan === SubscriptionPlan.PREMIUM ? 15000 : 5000;
        const recipientPhone =
          shop.whatsappNumber || (shop as any).owner?.phone || '';

        if (!recipientPhone) {
          this.logger.warn(
            `Aucun numéro disponible pour notifier la boutique "${shop.name}".`,
          );
          continue;
        }

        const notification =
          await this.notificationService.notifyUpcomingRenewalReminder({
            shopId: shop.id,
            shopName: shop.name,
            recipientPhone,
            plan: shop.subscriptionPlan,
            amountFcfa: planPriceFcfa,
            availableBalanceFcfa: shop.wallet?.availableBalanceFcfa || 0,
            dueDate,
            isTrial,
            daysRemaining,
          });

        // Enregistrement de l'envoi dans l'audit log
        if (
          this.prisma.auditLog &&
          typeof this.prisma.auditLog.create === 'function'
        ) {
          await this.prisma.auditLog.create({
            data: {
              userId: shop.ownerId,
              action: 'UPCOMING_RENEWAL_REMINDER_SENT',
              entityType: 'SHOP',
              entityId: shop.id,
              metadata: {
                plan: shop.subscriptionPlan,
                isTrial,
                dueDate: dueDate.toISOString(),
                amountFcfa: planPriceFcfa,
                balanceFcfa: shop.wallet?.availableBalanceFcfa || 0,
                recipientPhone,
                daysRemaining,
              },
            },
          });
        }

        results.push({
          shopId: shop.id,
          shopName: shop.name,
          recipientPhone,
          dueDate,
          isTrial,
          notification,
        });
      } catch (err: any) {
        this.logger.error(
          `Erreur lors de l'envoi du rappel préventif pour la boutique ${shop.id}: ${err.message}`,
        );
      }
    }

    return {
      scannedTotal: upcomingShops.length,
      remindersSent: results.length,
      results,
    };
  }

  /**
   * Auto-Sweep : règlement automatique de l'abonnement en souffrance dès qu'un versement crédite le Wallet
   */
  async autoSweepIfDue(shopId: string, tx: Prisma.TransactionClient) {
    const shop = await tx.shop.findUnique({
      where: { id: shopId },
      include: { wallet: true },
    });

    if (!shop || !shop.wallet) return null;

    const isPastDue = shop.subscriptionStatus === SubscriptionStatus.PAST_DUE;
    const isExpiredTrial =
      shop.subscriptionStatus === SubscriptionStatus.TRIALING &&
      shop.trialEndsAt &&
      new Date(shop.trialEndsAt).getTime() <= Date.now();

    if (!isPastDue && !isExpiredTrial) return null;

    const planPriceFcfa =
      shop.subscriptionPlan === SubscriptionPlan.PREMIUM ? 15000 : 5000;

    if (shop.wallet.availableBalanceFcfa >= planPriceFcfa) {
      this.logger.log(
        `Auto-Sweep déclenché pour la boutique "${shop.name}" : solde suffisant détecté après livraison (${shop.wallet.availableBalanceFcfa} FCFA).`,
      );
      return this.attemptSubscriptionCharge(shopId, tx);
    }

    return null;
  }

  /**
   * Réabonnement ou changement de forfait immédiat depuis le Wallet
   */
  async reactivateSubscription(ownerId: string, plan: SubscriptionPlan) {
    if (plan === SubscriptionPlan.FREE) {
      throw new BadRequestException('Pour passer sur le plan gratuit, attendez l’échéance de votre abonnement');
    }

    const shop = await this.prisma.shop.findUnique({
      where: { ownerId },
      include: { wallet: true },
    });

    if (!shop || !shop.wallet) {
      throw new NotFoundException('Boutique introuvable');
    }

    const planPriceFcfa = plan === SubscriptionPlan.PREMIUM ? 15000 : 5000;
    const availableBalance = shop.wallet.availableBalanceFcfa;

    if (availableBalance < planPriceFcfa) {
      throw new BadRequestException(
        `Solde insuffisant sur votre Wallet (${availableBalance} FCFA). Veuillez recharger au moins ${planPriceFcfa - availableBalance} FCFA via Wave ou Orange Money.`,
      );
    }

    const now = new Date();
    const periodEnd = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

    const result = await this.prisma.$transaction(
      async (tx) => {
        // Débit Wallet
        await tx.vendorWallet.update({
          where: { id: shop.wallet!.id },
          data: {
            availableBalanceFcfa: { decrement: planPriceFcfa },
          },
        });

        // Journal de facturation
        await tx.subscriptionBillingLog.create({
          data: {
            shopId: shop.id,
            plan,
            amountFcfa: planPriceFcfa,
            attemptNumber: 1,
            status: BillingAttemptStatus.MANUAL_REACTIVATION,
            walletBalanceBeforeFcfa: availableBalance,
            walletBalanceAfterFcfa: availableBalance - planPriceFcfa,
          },
        });

        // Restauration immédiate des privilèges
        const updatedShop = await tx.shop.update({
          where: { id: shop.id },
          data: {
            subscriptionPlan: plan,
            subscriptionStatus: SubscriptionStatus.ACTIVE,
            commissionRate: 0.0,
            subdomainEnabled: true,
            billingRetryCount: 0,
            gracePeriodEndsAt: null,
            nextBillingRetryAt: null,
            currentPeriodStart: now,
            currentPeriodEnd: periodEnd,
          },
        });

        // Réactivation des sponsors
        await tx.shopSponsor.updateMany({
          where: { shopId: shop.id },
          data: { isActive: true },
        });

        // Historique abonnement
        await tx.subscription.create({
          data: {
            shopId: shop.id,
            plan,
            status: SubscriptionStatus.ACTIVE,
            priceFcfa: planPriceFcfa,
            startDate: now,
            endDate: periodEnd,
          },
        });

        return updatedShop;
      },
      { maxWait: 20000, timeout: 30000 },
    );

    await this.invalidateStorefrontCache(
      result.id,
      result.slug,
      (result as any).customDomain,
    );

    return {
      message: `Votre abonnement au forfait ${plan} a été activé avec succès. Vos privilèges et votre sous-domaine sont immédiatement opérationnels !`,
      shop: result,
      subscriptionPlan: result.subscriptionPlan,
      subscriptionStatus: result.subscriptionStatus,
      subdomainEnabled: result.subdomainEnabled,
    };
  }

  /**
   * Méthode de rétrocompatibilité Phase 1/2 pour upgrade direct
   */
  async upgradeSubscription(ownerId: string, dto: UpgradeSubscriptionDto) {
    return this.reactivateSubscription(ownerId, dto.plan);
  }
}
