import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsInt,
  IsNotEmpty,
  IsObject,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';

export class CreateProductVariantDto {
  @ApiPropertyOptional({
    example: 'DKR-JORD-42-RED',
    description: 'Code SKU optionnel de la déclinaison',
  })
  @IsOptional()
  @IsString()
  sku?: string;

  @ApiProperty({
    example: 25000,
    description: 'Prix de la variante en FCFA (entier strict)',
  })
  @IsNotEmpty({ message: 'Le prix de la variante en FCFA est requis' })
  @IsInt({ message: 'Le prix de la variante doit être un entier' })
  @Min(100, { message: 'Le prix minimum de la variante est de 100 FCFA' })
  priceFcfa: number;

  @ApiPropertyOptional({
    example: 30000,
    description: 'Prix barré optionnel de la variante en FCFA (doit être > priceFcfa)',
  })
  @IsOptional()
  @IsInt({ message: 'Le prix barré de la variante doit être un entier' })
  @Min(100)
  compareAtPriceFcfa?: number;

  @ApiProperty({
    example: 8,
    description: 'Stock physique disponible pour cette variante',
    default: 0,
  })
  @IsNotEmpty({ message: 'Le stock de la variante est requis' })
  @IsInt({ message: 'Le stock doit être un entier' })
  @Min(0, { message: 'Le stock ne peut pas être négatif' })
  stock: number;

  @ApiProperty({
    example: { taille: 'XL', couleur: 'Blanc Bazin' },
    description: 'Attributs décrivant la variante (taille, pointure, couleur, matière...)',
  })
  @IsNotEmpty({ message: 'Les attributs de la variante sont requis' })
  @IsObject({ message: 'Les attributs doivent être un objet JSON valide' })
  attributes: Record<string, string>;

  @ApiPropertyOptional({
    example: true,
    description: 'Statut actif de la variante',
    default: true,
  })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
