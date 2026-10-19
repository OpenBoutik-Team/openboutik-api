import { IsEnum, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { SubscriptionPlan } from '../../generated/prisma/client';

export class StartTrialDto {
  @ApiProperty({
    description: 'Plan SaaS choisi pour le mois d’essai gratuit (PRO ou PREMIUM)',
    enum: [SubscriptionPlan.PRO, SubscriptionPlan.PREMIUM],
    example: SubscriptionPlan.PRO,
  })
  @IsEnum(SubscriptionPlan, {
    message: 'Le forfait d’essai doit être PRO ou PREMIUM',
  })
  @IsNotEmpty()
  plan: SubscriptionPlan;
}

export class ReactivateSubscriptionDto {
  @ApiProperty({
    description: 'Plan SaaS auquel souscrire (PRO ou PREMIUM)',
    enum: [SubscriptionPlan.PRO, SubscriptionPlan.PREMIUM],
    example: SubscriptionPlan.PRO,
  })
  @IsEnum(SubscriptionPlan, {
    message: 'Le forfait doit être PRO ou PREMIUM',
  })
  @IsNotEmpty()
  plan: SubscriptionPlan;
}
