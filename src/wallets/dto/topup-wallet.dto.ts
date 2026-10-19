import { IsInt, Min, IsEnum, IsNotEmpty, Matches } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { PaymentProvider } from '../../generated/prisma/client';

export class TopupWalletDto {
  @ApiProperty({ description: 'Montant à créditer en FCFA', example: 10000 })
  @IsInt({ message: 'Le montant doit être un entier strict en FCFA' })
  @Min(500, { message: 'Le montant minimum de recharge est de 500 FCFA' })
  amountFcfa: number;

  @ApiProperty({
    description: 'Opérateur Mobile Money utilisé pour recharger',
    enum: PaymentProvider,
    example: PaymentProvider.WAVE,
  })
  @IsEnum(PaymentProvider)
  @IsNotEmpty()
  provider: PaymentProvider;

  @ApiProperty({
    description: 'Numéro de téléphone sénégalais du payeur (+221...)',
    example: '+221771234567',
  })
  @Matches(/^\+221[0-9]{9}$/, {
    message: 'Le téléphone doit être au format sénégalais valide (+221XXXXXXXXX)',
  })
  phone: string;
}
