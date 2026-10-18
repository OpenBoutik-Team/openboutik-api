import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsArray,
  IsBoolean,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';

export class CreateProductDto {
  @ApiProperty({
    example: 'Boubou Bazin Riche Getzner',
    description: 'Nom du produit',
  })
  @IsNotEmpty({ message: 'Le nom du produit est requis' })
  @IsString()
  name: string;

  @ApiPropertyOptional({
    example: 'boubou-bazin-riche-getzner',
    description: 'Slug URL (généré automatiquement à partir du nom si non fourni)',
  })
  @IsOptional()
  @IsString()
  slug?: string;

  @ApiPropertyOptional({
    example: 'Bazin 1er choix brodé main, teinte artisanale dakaroise.',
    description: 'Description détaillée du produit',
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({
    example: 35000,
    description: 'Prix de vente en FCFA (entier strict, ex: 35000 pour 35 000 FCFA)',
  })
  @IsNotEmpty({ message: 'Le prix en FCFA est requis' })
  @IsInt({ message: 'Le prix en FCFA doit être un nombre entier' })
  @Min(100, { message: 'Le prix minimum est de 100 FCFA' })
  priceFcfa: number;

  @ApiPropertyOptional({
    example: 40000,
    description: 'Prix barré comparatif en FCFA (optionnel pour promotions)',
  })
  @IsOptional()
  @IsInt({ message: 'Le prix barré doit être un entier' })
  @Min(100)
  compareAtPriceFcfa?: number;

  @ApiProperty({
    example: 10,
    description: 'Quantité physique disponible en stock',
    default: 1,
  })
  @IsNotEmpty({ message: 'Le stock est requis' })
  @IsInt({ message: 'Le stock doit être un entier' })
  @Min(0, { message: 'Le stock ne peut pas être négatif' })
  stock: number;

  @ApiPropertyOptional({
    example: 3,
    description: 'Seuil d’alerte de stock faible pour le commerçant (par défaut 0)',
    default: 0,
  })
  @IsOptional()
  @IsInt({ message: 'Le seuil de stock faible doit être un entier' })
  @Min(0)
  lowStockThreshold?: number;

  @ApiProperty({
    example: [
      'https://images.unsplash.com/photo-1523381210434-271e8be1f52b?w=600',
    ],
    description: 'Tableau des URLs des photographies du produit',
  })
  @IsArray({ message: 'Les images doivent être fournies sous forme de tableau d’URLs' })
  @IsString({ each: true, message: 'Chaque URL d’image doit être une chaîne valide' })
  images: string[];

  @ApiPropertyOptional({
    example: 'uuid-de-la-categorie',
    description: 'Identifiant de la catégorie associée',
  })
  @IsOptional()
  @IsString()
  categoryId?: string;

  @ApiPropertyOptional({
    example: true,
    description: 'Indique si le produit est immédiatement publié sur la vitrine',
    default: true,
  })
  @IsOptional()
  @IsBoolean()
  isPublished?: boolean;
}
