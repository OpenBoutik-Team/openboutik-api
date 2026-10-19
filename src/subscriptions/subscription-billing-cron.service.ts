import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { SubscriptionsService } from './subscriptions.service';

@Injectable()
export class SubscriptionBillingCronService {
  private readonly logger = new Logger(SubscriptionBillingCronService.name);

  constructor(private readonly subscriptionsService: SubscriptionsService) {}

  /**
   * Dunning Engine : Exécution automatisée 2 fois par jour (09h00 et 21h00 GMT)
   * Scanne les abonnements échus et les relances de période de grâce.
   */
  @Cron('0 9,21 * * *')
  async handleSubscriptionBillingCron() {
    this.logger.log('⏰ Exécution planifiée du Dunning Engine (09h00 / 21h00 GMT)...');
    try {
      const summary = await this.subscriptionsService.processDueSubscriptions();
      this.logger.log(
        `✅ Fin du cycle Dunning : ${summary.processedTotal} traités (${summary.successCount} succès, ${summary.failedCount} échecs/relances).`,
      );
    } catch (err: any) {
      this.logger.error(`❌ Erreur critique lors du cycle Dunning Cron: ${err.message}`, err.stack);
    }
  }
}
