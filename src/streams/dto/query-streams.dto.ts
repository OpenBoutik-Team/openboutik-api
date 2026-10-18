import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString, IsInt, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { StreamType, StreamStatus } from '../../generated/prisma/client';

export class QueryStreamsDto {
  @ApiPropertyOptional({
    description: 'Filtrer par type de flux (SHORT_VIDEO ou LIVE_STREAM)',
    enum: StreamType,
  })
  @IsOptional()
  @IsEnum(StreamType)
  type?: StreamType;

  @ApiPropertyOptional({
    description: 'Filtrer par statut (SCHEDULED, LIVE, ENDED, PUBLISHED)',
    enum: StreamStatus,
  })
  @IsOptional()
  @IsEnum(StreamStatus)
  status?: StreamStatus;

  @ApiPropertyOptional({
    description: 'Filtrer par identifiant UUID de boutique',
  })
  @IsOptional()
  @IsString()
  shopId?: string;

  @ApiPropertyOptional({
    description: 'Numéro de page pour la pagination',
    default: 1,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({
    description: 'Nombre de résultats par page',
    default: 20,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  limit?: number = 20;
}
