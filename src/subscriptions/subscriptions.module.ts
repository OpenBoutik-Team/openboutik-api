import { Module } from '@nestjs/common';
import { SubscriptionsService } from './subscriptions.service';
import { SubscriptionsController } from './subscriptions.controller';
import { SubscriptionBillingCronService } from './subscription-billing-cron.service';

@Module({
  controllers: [SubscriptionsController],
  providers: [SubscriptionsService, SubscriptionBillingCronService],
  exports: [SubscriptionsService],
})
export class SubscriptionsModule {}
