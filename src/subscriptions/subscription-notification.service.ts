import { Injectable, Logger } from '@nestjs/common';
import { SubscriptionPlan } from '../generated/prisma/client';

export interface DunningNotificationPayload {
  shopId: string;
  shopName: string;
  recipientPhone: string;
  plan: SubscriptionPlan;
  amountFcfa: number;
  availableBalanceFcfa: number;
  missingAmountFcfa?: number;
  attemptNumber?: number;
  gracePeriodEndsAt?: Date | null;
  nextPeriodEnd?: Date | null;
}

export interface DunningNotificationResult {
  channel: 'WHATSAPP' | 'SMS' | 'MULTI_CHANNEL';
  recipientPhone: string;
  whatsappMessage: string;
  smsMessage: string;
  whatsappDirectUrl: string;
  dispatchedAt: Date;
  status: 'DELIVERED_SIMULATED' | 'SENT';
}

@Injectable()
export class SubscriptionNotificationService {
  private readonly logger = new Logger(SubscriptionNotificationService.name);

  /**
   * 1. Notification de renouvellement réussi (Succès prélèvement mensuel)
   */
  async notifyRenewalSuccess(
    payload: DunningNotificationPayload,
  ): Promise<DunningNotificationResult> {
    const formattedDate = payload.nextPeriodEnd
      ? payload.nextPeriodEnd.toLocaleDateString('fr-FR', {
          day: '2-digit',
          month: 'long',
          year: 'numeric',
        })
      : 'dans 30 jours';

    const whatsappMessage =
      `✅ *[OpenBoutik] Renouvellement Réussi !*\n\n` +
      `Bonjour *${payload.shopName}*,\n` +
      `Votre abonnement au forfait *${payload.plan}* (5 000 / 15 000 FCFA) a été renouvelé avec succès.\n\n` +
      `💳 Montant débité sur votre Wallet : *${payload.amountFcfa.toLocaleString()} FCFA*\n` +
      `💼 Nouveau solde disponible : *${payload.availableBalanceFcfa.toLocaleString()} FCFA*\n` +
      `📅 Prochaine échéance : *${formattedDate}*\n\n` +
      `Votre site dédié et votre commission 0 % restent pleinement actifs. Merci pour votre fidélité !\n` +
      `_L'équipe OpenBoutik Sénégal_`;

    const smsMessage = `[OpenBoutik] Abonnement ${payload.plan} de "${payload.shopName}" renouvele. ${payload.amountFcfa} FCFA debites sur Wallet. Prochaine echeance: ${formattedDate}.`;

    return this.dispatch(payload.recipientPhone, whatsappMessage, smsMessage, 'SUCCESS_RENEWAL');
  }

  /**
   * 2. Notification d'échec de prélèvement avec période de grâce de 72h
   */
  async notifyInsufficientFundsGracePeriod(
    payload: DunningNotificationPayload,
  ): Promise<DunningNotificationResult> {
    const missing = payload.missingAmountFcfa || Math.max(0, payload.amountFcfa - payload.availableBalanceFcfa);
    const graceDate = payload.gracePeriodEndsAt
      ? payload.gracePeriodEndsAt.toLocaleDateString('fr-FR', {
          day: '2-digit',
          month: 'long',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
        })
      : '72 heures';

    const whatsappMessage =
      `⚠️ *[OpenBoutik] Alerte Renouvellement — Solde Insuffisant*\n\n` +
      `Bonjour *${payload.shopName}*,\n` +
      `Le prélèvement automatique de votre forfait *${payload.plan}* n'a pas pu aboutir car le solde de votre Wallet est insuffisant.\n\n` +
      `💰 Solde actuel : *${payload.availableBalanceFcfa.toLocaleString()} FCFA*\n` +
      `📌 Montant requis : *${payload.amountFcfa.toLocaleString()} FCFA*\n` +
      `⚡ Manque à recharger : *${missing.toLocaleString()} FCFA*\n\n` +
      `🛡️ *Période de grâce accordée :*\n` +
      `Votre site dédié et votre commission 0 % restent maintenus jusqu'au *${graceDate}*.\n\n` +
      `👉 *Action requise :* Veuillez recharger au moins ${missing.toLocaleString()} FCFA sur votre Wallet via Wave ou Orange Money depuis votre tableau de bord.\n` +
      `_L'équipe OpenBoutik Sénégal_`;

    const smsMessage = `[OpenBoutik] Alerte "${payload.shopName}": Solde Wallet insuffisant (${payload.availableBalanceFcfa} FCFA). Rechargez ${missing} FCFA via Wave/OM avant le ${graceDate} pour eviter la suspension.`;

    return this.dispatch(payload.recipientPhone, whatsappMessage, smsMessage, `DUNNING_RETRY_${payload.attemptNumber || 1}`);
  }

  /**
   * 3. Dernier rappel d'urgence (moins de 24h avant coupure du site)
   */
  async notifyGraceExpiringUrgent(
    payload: DunningNotificationPayload,
  ): Promise<DunningNotificationResult> {
    const missing = payload.missingAmountFcfa || Math.max(0, payload.amountFcfa - payload.availableBalanceFcfa);

    const whatsappMessage =
      `🚨 *[OpenBoutik] DERNIER RAPPEL — Coupure dans 24h*\n\n` +
      `Boutique : *${payload.shopName}*\n` +
      `Il vous reste moins de 24 heures avant la suspension de votre site dédié et la perte de vos avantages 0 %.\n\n` +
      `Rechargez votre Wallet de *${missing.toLocaleString()} FCFA* via Wave ou Orange Money dès maintenant pour sécuriser votre vitrine.\n` +
      `_L'équipe OpenBoutik Sénégal_`;

    const smsMessage = `[OpenBoutik URGENT] Dernier rappel pour "${payload.shopName}": Plus que 24h avant suspension. Rechargez ${missing} FCFA sur votre Wallet pour garder votre site actif.`;

    return this.dispatch(payload.recipientPhone, whatsappMessage, smsMessage, 'DUNNING_URGENT_24H');
  }

  /**
   * 4. Notification de rétrogradation / suspension (6 tentatives infructueuses)
   */
  async notifyDowngradeSuspension(
    payload: DunningNotificationPayload,
  ): Promise<DunningNotificationResult> {
    const whatsappMessage =
      `🛑 *[OpenBoutik] Suspension du Site Dédié & Rétrogradation*\n\n` +
      `Bonjour *${payload.shopName}*,\n` +
      `La période de grâce de 72h étant expirée sans approvisionnement de votre Wallet, votre boutique a été rétrogradée sur le *Forfait Gratuit*.\n\n` +
      `• Votre sous-domaine dédié a été mis en veille.\n` +
      `• La commission standard de 3 % s'applique désormais sur vos ventes.\n\n` +
      `💡 *Comment réactiver immédiatement ?*\n` +
      `Rechargez simplement votre Wallet (${payload.amountFcfa.toLocaleString()} FCFA) et cliquez sur "Réactiver mon forfait" dans votre tableau de bord.\n` +
      `_L'équipe OpenBoutik Sénégal_`;

    const smsMessage = `[OpenBoutik] Delai de grace expire pour "${payload.shopName}". Votre boutique est passee en mode Gratuit. Rechargez votre Wallet pour reactiver votre site dedie en 1 clic.`;

    return this.dispatch(payload.recipientPhone, whatsappMessage, smsMessage, 'DOWNGRADE_SUSPENDED');
  }

  /**
   * Distribution multi-canal sécurisée (Log + Génération DeepLink WhatsApp)
   */
  private async dispatch(
    phone: string,
    whatsappMessage: string,
    smsMessage: string,
    eventType: string,
  ): Promise<DunningNotificationResult> {
    const cleanPhone = phone.replace(/[^0-9]/g, '');
    const whatsappDirectUrl = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(whatsappMessage)}`;

    this.logger.log(
      `📲 [NOTIFICATION DUNNING - ${eventType}] Destinataire: ${phone} | SMS: "${smsMessage.slice(0, 60)}..."`,
    );

    return {
      channel: 'MULTI_CHANNEL',
      recipientPhone: phone,
      whatsappMessage,
      smsMessage,
      whatsappDirectUrl,
      dispatchedAt: new Date(),
      status: 'DELIVERED_SIMULATED',
    };
  }
}
