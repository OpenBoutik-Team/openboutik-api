import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsDateString,
  IsInt,
  IsOptional,
  Min,
} from 'class-validator';

export class UpdateCouponDto {
  @ApiPropertyOptional({
    example: 25,
    description: 'Nouvelle valeur de la réduction : pourcentage ou montant en FCFA',
  })
  @IsOptional()
  @IsInt({ message: 'La valeur doit être un nombre entier' })
  @Min(1, { message: 'La valeur minimale est 1' })
  value?: number;

  @ApiPropertyOptional({
    example: '2026-12-31T23:59:59.000Z',
    description: 'Nouvelle date d’expiration du code promo (format ISO 8601)',
  })
  @IsOptional()
  @IsDateString({}, { message: 'La date d’expiration doit être une date ISO valide' })
  expiryDate?: string;

  @ApiPropertyOptional({
    example: 100,
    description: 'Nombre maximal d’utilisations autorisées (null ou entier >= 1)',
  })
  @IsOptional()
  @IsInt({ message: 'Le nombre d’utilisations doit être un entier' })
  @Min(1, { message: 'Le nombre maximal d’utilisations doit être au moins 1' })
  maxUses?: number;

  @ApiPropertyOptional({
    example: true,
    description: 'Activer ou désactiver immédiatement le code promo',
  })
  @IsOptional()
  @IsBoolean({ message: 'isActive doit être un booléen' })
  isActive?: boolean;
}
