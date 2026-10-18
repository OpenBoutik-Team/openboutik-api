import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';

export enum ProductSortBy {
  NEWEST = 'newest',
  PRICE_ASC = 'price_asc',
  PRICE_DESC = 'price_desc',
  RATING_DESC = 'rating_desc',
}

export class QueryProductsDto {
  @ApiPropertyOptional({
    example: 'boubou',
    description: 'Recherche textuelle dans le titre et la description',
  })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({
    example: 'teranga-mode',
    description: 'Filtrer par boutique (slug)',
  })
  @IsOptional()
  @IsString()
  shopSlug?: string;

  @ApiPropertyOptional({
    example: 'mode-homme',
    description: 'Filtrer par catégorie (slug)',
  })
  @IsOptional()
  @IsString()
  categorySlug?: string;

  @ApiPropertyOptional({
    example: 'c1d2e3f4-5678-90ab-cdef-1234567890ab',
    description: 'Filtrer par identifiant direct de catégorie (UUID)',
  })
  @IsOptional()
  @IsString()
  categoryId?: string;

  @ApiPropertyOptional({
    example: 10000,
    description: 'Prix minimum en FCFA',
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  minPrice?: number;

  @ApiPropertyOptional({
    example: 50000,
    description: 'Prix maximum en FCFA',
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  maxPrice?: number;

  @ApiPropertyOptional({
    example: true,
    description: 'Afficher uniquement les articles avec stock > 0',
  })
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  inStockOnly?: boolean;

  @ApiPropertyOptional({
    example: true,
    description: 'Afficher uniquement les articles en promotion (ayant un prix barré compareAtPriceFcfa)',
  })
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  onSaleOnly?: boolean;

  @ApiPropertyOptional({
    enum: ProductSortBy,
    default: ProductSortBy.NEWEST,
    description: 'Critère de tri des produits',
  })
  @IsOptional()
  @IsEnum(ProductSortBy)
  sortBy?: ProductSortBy;


  @ApiPropertyOptional({
    example: 1,
    default: 1,
    description: 'Numéro de page pour la pagination',
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({
    example: 12,
    default: 12,
    description: 'Nombre d’articles par page',
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  limit?: number = 12;
}
