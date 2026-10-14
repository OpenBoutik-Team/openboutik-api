import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreateCategoryDto {
  @ApiProperty({
    example: 'Accessoires Cuir Ngaye',
    description: 'Nom de la catégorie',
  })
  @IsNotEmpty({ message: 'Le nom de la catégorie est requis' })
  @IsString()
  name: string;

  @ApiPropertyOptional({
    example: 'accessoires-cuir-ngaye',
    description: 'Slug de la catégorie (généré automatiquement si omis)',
  })
  @IsOptional()
  @IsString()
  slug?: string;

  @ApiPropertyOptional({
    example: 'https://images.unsplash.com/photo-1544816155-12df9643f363?w=400',
    description: 'URL de l’image d’illustration',
  })
  @IsOptional()
  @IsString()
  imageUrl?: string;
}
