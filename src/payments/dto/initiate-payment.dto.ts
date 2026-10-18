import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsNotEmpty, IsString, Matches } from 'class-validator';
import { PaymentProvider } from '../../generated/prisma/client';

export class InitiatePaymentDto {
  @ApiProperty({
    example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
    description: 'Identifiant UUID de la commande à payer',
  })
  @IsNotEmpty({ message: 'orderId est obligatoire' })
  @IsString()
  orderId!: string;

  @ApiProperty({
    enum: PaymentProvider,
    example: PaymentProvider.FREE_MONEY,
    description: 'Opérateur Mobile Money (WAVE, ORANGE_MONEY, FREE_MONEY)',
  })
  @IsNotEmpty({ message: 'provider est obligatoire' })
  @IsEnum(PaymentProvider, {
    message: 'Le fournisseur doit être WAVE, ORANGE_MONEY ou FREE_MONEY',
  })
  provider!: PaymentProvider;

  @ApiProperty({
    example: '+221761234567',
    description: 'Numéro de téléphone du payeur au format sénégalais (+221...)',
  })
  @IsNotEmpty({ message: 'phone est obligatoire' })
  @Matches(/^\+221(70|75|76|77|78)[0-9]{7}$/, {
    message: 'Le numéro de téléphone doit être un numéro sénégalais valide (+221...)',
  })
  phone!: string;
}
