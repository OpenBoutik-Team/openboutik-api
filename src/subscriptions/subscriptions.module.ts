import { Module } from '@nestjs/common';
import { SubscriptionsService } from './subscriptions.service';
import { SubscriptionsController } from './subscriptions.controller';
import { SubscriptionBillingCronService } from './subscription-billing-cron.service';
import { SubscriptionNotificationService } from './subscription-notification.service';

@Module({
  controllers: [SubscriptionsController],
  providers: [
    SubscriptionsService,
    SubscriptionBillingCronService,
    SubscriptionNotificationService,
  ],
  exports: [SubscriptionsService, SubscriptionNotificationService],
})
export class SubscriptionsModule {}
