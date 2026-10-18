import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

export class CreateReviewDto {
  @ApiProperty({
    example: 5,
    description: 'Note d’évaluation du produit (de 1 à 5 étoiles)',
  })
  @IsNotEmpty({ message: 'La note est requise' })
  @IsInt({ message: 'La note doit être un entier' })
  @Min(1, { message: 'La note minimale est de 1 étoile' })
  @Max(5, { message: 'La note maximale est de 5 étoiles' })
  rating: number;

  @ApiPropertyOptional({
    example: 'Excellente qualité de tissu Bazin riche, livraison rapide à Mermoz par Tiak-Tiak !',
    description: 'Commentaire détaillé sur le produit',
  })
  @IsOptional()
  @IsString({ message: 'Le commentaire doit être une chaîne de caractères' })
  @MaxLength(1000, {
    message: 'Le commentaire ne peut pas dépasser 1000 caractères',
  })
  comment?: string;
}
