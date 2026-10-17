import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Min,
  IsDateString,
} from 'class-validator';
import { CouponType } from '../../generated/prisma/client';

export class CreateCouponDto {
  @ApiProperty({
    example: 'TABASKI20',
    description: 'Code promotionnel unique pour la boutique (ex: TABASKI20, KORITE15)',
  })
  @IsNotEmpty({ message: 'Le code promo est requis' })
  @IsString({ message: 'Le code promo doit être une chaîne de caractères' })
  code: string;

  @ApiProperty({
    enum: CouponType,
    example: CouponType.PERCENTAGE,
    description: 'Type de réduction : PERCENTAGE (%) ou FIXED_FCFA (montant fixe)',
  })
  @IsNotEmpty({ message: 'Le type de réduction est requis' })
  @IsEnum(CouponType, { message: 'Le type doit être PERCENTAGE ou FIXED_FCFA' })
  type: CouponType;

  @ApiProperty({
    example: 20,
    description: 'Valeur de la réduction : pourcentage (1 à 90) ou montant direct en FCFA (>= 100)',
  })
  @IsNotEmpty({ message: 'La valeur du code promo est requise' })
  @IsInt({ message: 'La valeur doit être un nombre entier' })
  @Min(1, { message: 'La valeur minimale est 1' })
  value: number;

  @ApiProperty({
    example: '2026-12-31T23:59:59.000Z',
    description: 'Date d’expiration du code promo (format ISO 8601)',
  })
  @IsNotEmpty({ message: 'La date d’expiration est requise' })
  @IsDateString({}, { message: 'La date d’expiration doit être une date ISO valide' })
  expiryDate: string;

  @ApiPropertyOptional({
    example: 50,
    description: 'Nombre maximal d’utilisations autorisées (null = illimité)',
  })
  @IsOptional()
  @IsInt({ message: 'Le nombre d’utilisations doit être un entier' })
  @Min(1, { message: 'Le nombre maximal d’utilisations doit être au moins 1' })
  maxUses?: number;
}
