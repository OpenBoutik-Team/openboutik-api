import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsNotEmpty, IsString } from 'class-validator';
import { SubscriptionPlan, PaymentProvider } from '../../generated/prisma/client';

export class UpgradeSubscriptionDto {
  @ApiProperty({
    enum: SubscriptionPlan,
    example: SubscriptionPlan.PRO,
    description: 'Nouveau forfait souhaité (PRO ou PREMIUM)',
  })
  @IsNotEmpty()
  @IsEnum(SubscriptionPlan, { message: 'Le forfait doit être PRO ou PREMIUM' })
  plan: SubscriptionPlan;

  @ApiProperty({
    enum: PaymentProvider,
    example: PaymentProvider.WAVE,
    description: 'Passerelle de paiement mobile utilisée',
  })
  @IsNotEmpty()
  @IsEnum(PaymentProvider)
  paymentProvider: PaymentProvider;

  @ApiProperty({
    example: 'WAVE_SUB_TXN_20261014_8888',
    description: 'Référence unique de la transaction mobile pour idempotence',
  })
  @IsNotEmpty()
  @IsString()
  providerReference: string;
}
