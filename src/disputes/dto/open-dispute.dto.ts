import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsArray, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class OpenDisputeDto {
  @ApiProperty({
    example: 'Le colis livré ne contient pas le bon modèle de boubou (erreur de couleur et de taille).',
    description: 'Motif détaillé de la réclamation ou du litige',
  })
  @IsNotEmpty({ message: 'Le motif du litige est requis' })
  @IsString()
  reason: string;

  @ApiPropertyOptional({
    example: [
      'https://images.unsplash.com/photo-1544441893-675973e31985?w=600',
    ],
    description: 'Photos ou justificatifs prouvant le problème de livraison ou de conformité',
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  evidenceUrls?: string[];
}
