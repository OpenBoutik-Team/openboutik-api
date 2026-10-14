import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  Min,
  ValidateNested,
} from 'class-validator';
import { PaymentProvider, DeliveryMethod } from '../../generated/prisma/client';

export class CheckoutItemDto {
  @ApiProperty({
    example: 'uuid-du-produit',
    description: 'Identifiant du produit commandé',
  })
  @IsNotEmpty({ message: 'L’identifiant du produit est requis' })
  @IsString()
  productId: string;

  @ApiProperty({
    example: 1,
    description: 'Quantité d’exemplaires commandés (au moins 1)',
    default: 1,
  })
  @IsNotEmpty()
  @IsInt()
  @Min(1, { message: 'La quantité minimale par article est de 1' })
  quantity: number;
}

export class CheckoutDto {
  @ApiProperty({
    type: [CheckoutItemDto],
    description: 'Liste des articles du panier (pouvant provenir de différentes boutiques)',
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CheckoutItemDto)
  items: CheckoutItemDto[];

  @ApiProperty({
    example: 'Villa 142, Mermoz Pyrotechnie',
    description: 'Adresse exacte de livraison à Dakar ou en région',
  })
  @IsNotEmpty({ message: 'L’adresse de livraison est requise' })
  @IsString()
  deliveryAddress: string;

  @ApiPropertyOptional({
    example: 'Dakar',
    description: 'Ville de destination',
    default: 'Dakar',
  })
  @IsOptional()
  @IsString()
  deliveryCity?: string = 'Dakar';

  @ApiProperty({
    example: '+221765432109',
    description: 'Numéro de téléphone du destinataire pour le livreur Tiak-Tiak (+221...)',
  })
  @IsNotEmpty({ message: 'Le numéro de téléphone pour la livraison est requis' })
  @IsString()
  @Matches(/^\+221[0-9]{9}$/, {
    message: 'Le téléphone de livraison doit être au format sénégalais (+221XXXXXXXXX)',
  })
  deliveryPhone: string;

  @ApiPropertyOptional({
    example: 'Appeler à l’arrivée devant le portail vert.',
    description: 'Instructions particulières pour le livreur',
  })
  @IsOptional()
  @IsString()
  deliveryNotes?: string;

  @ApiPropertyOptional({
    enum: DeliveryMethod,
    default: DeliveryMethod.TIAK_TIAK,
    description: 'Mode de livraison',
  })
  @IsOptional()
  @IsEnum(DeliveryMethod)
  deliveryMethod?: DeliveryMethod = DeliveryMethod.TIAK_TIAK;

  @ApiProperty({
    enum: PaymentProvider,
    example: PaymentProvider.WAVE,
    description: 'Moyen de paiement mobile sélectionné (Wave ou Orange Money)',
  })
  @IsNotEmpty({ message: 'Le fournisseur de paiement mobile est requis' })
  @IsEnum(PaymentProvider)
  paymentProvider: PaymentProvider;
}
