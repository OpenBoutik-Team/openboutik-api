import {
  IsArray,
  ValidateNested,
  IsString,
  IsNotEmpty,
  IsInt,
  Min,
  IsOptional,
  IsBoolean,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ProductLayoutItemDto {
  @ApiProperty({ description: 'ID unique du produit à ordonner' })
  @IsString()
  @IsNotEmpty()
  productId: string;

  @ApiProperty({ description: 'Position d’affichage ordonnée (0, 1, 2...)' })
  @IsInt()
  @Min(0)
  displayOrder: number;

  @ApiPropertyOptional({ description: 'Mettre en avant ce produit sur la vitrine d’accueil' })
  @IsOptional()
  @IsBoolean()
  isFeatured?: boolean;
}

export class UpdateProductLayoutDto {
  @ApiProperty({
    description: 'Liste ordonnée des produits de la boutique avec leur position et statut de mise en avant',
    type: [ProductLayoutItemDto],
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ProductLayoutItemDto)
  items: ProductLayoutItemDto[];
}
