import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsEnum,
  IsOptional,
  IsArray,
  IsUUID,
  MinLength,
  MaxLength,
} from 'class-validator';
import { StreamType } from '../../generated/prisma/client';

export class CreateStreamDto {
  @ApiProperty({
    description: 'Titre de la vidéo courte ou du Live Shopping',
    example: 'Présentation de la nouvelle collection Tabaski 2026',
  })
  @IsString()
  @MinLength(3, { message: 'Le titre doit comporter au moins 3 caractères.' })
  @MaxLength(120, { message: 'Le titre ne peut pas dépasser 120 caractères.' })
  title!: string;

  @ApiPropertyOptional({
    description: 'Description détaillée du contenu de la vidéo ou du direct',
    example: 'Démonstration en direct de nos boubous bazin riche avec essayage et prix flash.',
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({
    description: 'Format du média (vidéo courte ou session de direct)',
    enum: StreamType,
    example: StreamType.LIVE_STREAM,
  })
  @IsEnum(StreamType, {
    message: 'Le type doit être SHORT_VIDEO ou LIVE_STREAM.',
  })
  type!: StreamType;

  @ApiProperty({
    description:
      'URL du flux vidéo (MP4, flux HLS direct ou WebRTC sans coût externe)',
    example: 'https://cdn.openboutik.sn/streams/live-teranga-01.m3u8',
  })
  @IsString()
  mediaUrl!: string;

  @ApiPropertyOptional({
    description: 'Image miniature (thumbnail) de présentation',
    example: 'https://cdn.openboutik.sn/thumbnails/live-teranga-01.jpg',
  })
  @IsOptional()
  @IsString()
  thumbnailUrl?: string;

  @ApiPropertyOptional({
    description:
      'Liste des identifiants UUID des articles de la boutique rattachés à ce live',
    example: ['prod-uuid-1', 'prod-uuid-2'],
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @IsUUID('all', {
    each: true,
    message: 'Chaque identifiant de produit doit être un UUID valide.',
  })
  productIds?: string[];
}
