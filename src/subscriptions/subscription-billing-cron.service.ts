import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { SubscriptionsService } from './subscriptions.service';

@Injectable()
export class SubscriptionBillingCronService {
  private readonly logger = new Logger(SubscriptionBillingCronService.name);

  constructor(private readonly subscriptionsService: SubscriptionsService) {}

  /**
   * Dunning Engine & Rappels Préventifs : Exécution automatisée 2 fois par jour (09h00 et 21h00 GMT)
   * 1. Scanne et envoie les rappels préventifs WhatsApp & SMS (J-3 avant échéance)
   * 2. Scanne les abonnements échus et les relances de période de grâce.
   */
  @Cron('0 9,21 * * *')
  async handleSubscriptionBillingCron() {
    this.logger.log('⏰ Exécution planifiée du Dunning Engine (09h00 / 21h00 GMT)...');
    try {
      // 1. Envoi préventif des alertes WhatsApp / SMS (J-3)
      const remindersSummary =
        await this.subscriptionsService.sendUpcomingRenewalReminders(3);
      if (remindersSummary.remindersSent > 0) {
        this.logger.log(
          `📲 ${remindersSummary.remindersSent} rappel(s) pré-échéance envoyé(s) via WhatsApp/SMS.`,
        );
      }

      // 2. Traitement des prélèvements et relances Dunning
      const summary = await this.subscriptionsService.processDueSubscriptions();
      this.logger.log(
        `✅ Fin du cycle Dunning : ${summary.processedTotal} traités (${summary.successCount} succès, ${summary.failedCount} échecs/relances).`,
      );
    } catch (err: any) {
      this.logger.error(`❌ Erreur critique lors du cycle Dunning Cron: ${err.message}`, err.stack);
    }
  }
}
