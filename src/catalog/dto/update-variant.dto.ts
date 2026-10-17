import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsInt,
  IsObject,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';

export class UpdateProductVariantDto {
  @ApiPropertyOptional({
    example: 'DKR-JORD-42-RED',
    description: 'Code SKU optionnel de la déclinaison',
  })
  @IsOptional()
  @IsString()
  sku?: string;

  @ApiPropertyOptional({
    example: 26000,
    description: 'Prix de la variante en FCFA (entier strict)',
  })
  @IsOptional()
  @IsInt({ message: 'Le prix de la variante doit être un entier' })
  @Min(100, { message: 'Le prix minimum de la variante est de 100 FCFA' })
  priceFcfa?: number;

  @ApiPropertyOptional({
    example: 32000,
    description: 'Prix barré optionnel de la variante en FCFA (doit être > priceFcfa)',
  })
  @IsOptional()
  @IsInt({ message: 'Le prix barré de la variante doit être un entier' })
  @Min(100)
  compareAtPriceFcfa?: number;

  @ApiPropertyOptional({
    example: 12,
    description: 'Stock physique disponible pour cette variante',
  })
  @IsOptional()
  @IsInt({ message: 'Le stock doit être un entier' })
  @Min(0, { message: 'Le stock ne peut pas être négatif' })
  stock?: number;

  @ApiPropertyOptional({
    example: { taille: 'XL', couleur: 'Blanc Bazin' },
    description: 'Attributs décrivant la variante (taille, pointure, couleur, matière...)',
  })
  @IsOptional()
  @IsObject({ message: 'Les attributs doivent être un objet JSON valide' })
  attributes?: Record<string, string>;

  @ApiPropertyOptional({
    example: true,
    description: 'Statut actif de la variante',
  })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
