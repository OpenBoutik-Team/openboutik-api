import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UpgradeSubscriptionDto } from './dto/upgrade-subscription.dto';
import { SubscriptionPlan, SubscriptionStatus } from '../generated/prisma/client';

export interface PlanDetails {
  plan: SubscriptionPlan;
  name: string;
  priceFcfa: number;
  commissionRate: number;
  features: string[];
}

@Injectable()
export class SubscriptionsService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Grille tarifaire officielle des abonnements SaaS OpenBoutik
   */
  getAvailablePlans(): PlanDetails[] {
    const freeCommission = Number(process.env.COMMISSION_RATE_FREE) || 4;
    const proCommission = Number(process.env.COMMISSION_RATE_PRO) || 3;
    const premiumCommission = Number(process.env.COMMISSION_RATE_PREMIUM) || 2;

    return [
      {
        plan: SubscriptionPlan.FREE,
        name: 'Forfait Gratuit (Démarrage)',
        priceFcfa: 0,
        commissionRate: freeCommission,
        features: [
          `Commission modérée de ${freeCommission}% sur les ventes livrées`,
          'Vitrine basique sur la marketplace',
          'Bouton de contact direct WhatsApp',
          'Paiement sécurisé par séquestre Wave & Orange Money',
          'Livraison rapide par Tiak-Tiak',
        ],
      },
      {
        plan: SubscriptionPlan.PRO,
        name: 'Forfait Professionnel',
        priceFcfa: 15000,
        commissionRate: proCommission,
        features: [
          `Commission réduite à ${proCommission}% sur les ventes`,
          'Catalogue et produits illimités',
          'Personnalisation complète de la vitrine (bannière, logo, couleurs)',
          'Tableau de bord de statistiques financières avancées',
          'Support prioritaire par WhatsApp',
        ],
      },
      {
        plan: SubscriptionPlan.PREMIUM,
        name: 'Forfait Premium Élite',
        priceFcfa: 35000,
        commissionRate: premiumCommission,
        features: [
          `Commission préférentielle minimale de ${premiumCommission}%`,
          'Mise en avant sur la page d’accueil de la marketplace',
          'Badge Marchand Vérifié prioritaire',
          'Accompagnement marketing et logistique dédié',
          'Retraits instantanés prioritaires',
        ],
      },
    ];
  }

  /**
   * Souscription / Passage à un plan SaaS supérieur
   */
  async upgradeSubscription(ownerId: string, dto: UpgradeSubscriptionDto) {
    const shop = await this.prisma.shop.findUnique({
      where: { ownerId },
    });

    if (!shop) {
      throw new NotFoundException('Boutique introuvable pour ce vendeur');
    }

    if (dto.plan === SubscriptionPlan.FREE) {
      throw new BadRequestException('Vous êtes déjà sur le forfait gratuit de base');
    }

    const planPrice = dto.plan === SubscriptionPlan.PRO ? 15000 : 35000;
    const durationDays = 30;
    const startDate = new Date();
    const endDate = new Date(startDate.getTime() + durationDays * 24 * 60 * 60 * 1000);

    const result = await this.prisma.$transaction(async (tx) => {
      // Clôture des abonnements actifs précédents
      await tx.subscription.updateMany({
        where: { shopId: shop.id, status: SubscriptionStatus.ACTIVE },
        data: { status: SubscriptionStatus.EXPIRED },
      });

      // Création du nouvel abonnement
      const subscription = await tx.subscription.create({
        data: {
          shopId: shop.id,
          plan: dto.plan,
          status: SubscriptionStatus.ACTIVE,
          priceFcfa: planPrice,
          startDate,
          endDate,
          paymentProvider: dto.paymentProvider,
          providerReference: dto.providerReference,
        },
      });

      // Mise à jour du plan sur la boutique
      const updatedShop = await tx.shop.update({
        where: { id: shop.id },
        data: { subscriptionPlan: dto.plan },
      });

      // Log d'audit immuable
      await tx.auditLog.create({
        data: {
          userId: ownerId,
          action: 'SUBSCRIPTION_UPGRADED',
          entityType: 'SHOP',
          entityId: shop.id,
          metadata: {
            plan: dto.plan,
            priceFcfa: planPrice,
            providerReference: dto.providerReference,
          },
        },
      });

      return { subscription, shop: updatedShop };
    });

    return result;
  }
}
