import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsArray,
  IsBoolean,
  IsInt,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';

export class UpdateProductDto {
  @ApiPropertyOptional({
    example: 'Boubou Bazin Riche Getzner - Édition Tabaski',
    description: 'Nom du produit mis à jour',
  })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({
    example: 'Bazin de haute couture teinté à la main.',
    description: 'Description du produit',
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({
    example: 32000,
    description: 'Prix en FCFA',
  })
  @IsOptional()
  @IsInt()
  @Min(100)
  priceFcfa?: number;

  @ApiPropertyOptional({
    example: 38000,
    description: 'Prix barré comparatif en FCFA',
  })
  @IsOptional()
  @IsInt()
  @Min(100)
  compareAtPriceFcfa?: number;

  @ApiPropertyOptional({
    example: 8,
    description: 'Stock physique restant',
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  stock?: number;

  @ApiPropertyOptional({
    example: 3,
    description: 'Seuil d’alerte de stock critique',
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  lowStockThreshold?: number;

  @ApiPropertyOptional({
    example: [
      'https://images.unsplash.com/photo-1523381210434-271e8be1f52b?w=600',
    ],
    description: 'Tableau des URLs des images',
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  images?: string[];

  @ApiPropertyOptional({
    example: 'uuid-de-la-categorie',
    description: 'Identifiant de la catégorie',
  })
  @IsOptional()
  @IsString()
  categoryId?: string;

  @ApiPropertyOptional({
    example: true,
    description: 'Visibilité du produit sur la marketplace',
  })
  @IsOptional()
  @IsBoolean()
  isPublished?: boolean;
}
