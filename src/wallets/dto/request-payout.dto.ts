import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsInt, IsNotEmpty, IsString, Matches, Min } from 'class-validator';
import { PaymentProvider } from '../../generated/prisma/client';

export class RequestPayoutDto {
  @ApiProperty({
    example: 50000,
    description: 'Montant du retrait en FCFA (doit être inférieur ou égal au solde disponible, minimum 1 000 FCFA)',
  })
  @IsNotEmpty({ message: 'Le montant du retrait est requis' })
  @IsInt({ message: 'Le montant doit être un nombre entier en FCFA' })
  @Min(1000, { message: 'Le montant minimum de retrait est de 1 000 FCFA' })
  amountFcfa: number;

  @ApiProperty({
    enum: PaymentProvider,
    example: PaymentProvider.WAVE,
    description: 'Passerelle Mobile Money vers laquelle envoyer les fonds (Wave ou Orange Money)',
  })
  @IsNotEmpty({ message: 'Le choix de la passerelle de retrait est requis' })
  @IsEnum(PaymentProvider)
  provider: PaymentProvider;

  @ApiProperty({
    example: '+221771234567',
    description: 'Numéro de téléphone sénégalais destinataire du transfert (+221XXXXXXXXX)',
  })
  @IsNotEmpty({ message: 'Le numéro de réception est requis' })
  @IsString()
  @Matches(/^\+221[0-9]{9}$/, {
    message: 'Le numéro destinataire doit être un numéro sénégalais valide (+221XXXXXXXXX)',
  })
  recipientPhone: string;
}
