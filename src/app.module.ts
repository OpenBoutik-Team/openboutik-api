import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { PrismaModule } from './prisma/prisma.module';
import { UsersModule } from './users/users.module';
import { AuthModule } from './auth/auth.module';
import { ShopsModule } from './shops/shops.module';
import { SubscriptionsModule } from './subscriptions/subscriptions.module';
import { CatalogModule } from './catalog/catalog.module';
import { OrdersModule } from './orders/orders.module';
import { EscrowModule } from './escrow/escrow.module';
import { DisputesModule } from './disputes/disputes.module';
import { WalletsModule } from './wallets/wallets.module';
import { CouponsModule } from './coupons/coupons.module';
import { ReviewsModule } from './reviews/reviews.module';
import { AnalyticsModule } from './analytics/analytics.module';
import { ScheduleModule } from '@nestjs/schedule';
import { PaymentsModule } from './payments/payments.module';
import { WishlistModule } from './wishlist/wishlist.module';
import { MessagesModule } from './messages/messages.module';
import { NegotiationsModule } from './negotiations/negotiations.module';
import { StreamsModule } from './streams/streams.module';
import { BnplModule } from './bnpl/bnpl.module';
import { AppController } from './app.controller';
import { AppService } from './app.service';

@Module({
  imports: [
    ScheduleModule.forRoot(),
    ThrottlerModule.forRoot([
      {
        name: 'default',
        ttl: 60000,
        limit: 100, // 100 requêtes / minute pour les APIs interactives
      },
    ]),
    PrismaModule,
    UsersModule,
    AuthModule,
    ShopsModule,
    SubscriptionsModule,
    CatalogModule,
    OrdersModule,
    EscrowModule,
    DisputesModule,
    WalletsModule,
    CouponsModule,
    ReviewsModule,
    AnalyticsModule,
    PaymentsModule,
    WishlistModule,
    MessagesModule,
    NegotiationsModule,
    StreamsModule,
    BnplModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}

