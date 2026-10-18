import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString } from 'class-validator';
import { KycStatus } from '../../generated/prisma/client';

export class ReviewKycDto {
  @ApiProperty({
    description: 'Décision de l’administrateur (VERIFIED ou REJECTED)',
    enum: [KycStatus.VERIFIED, KycStatus.REJECTED],
    example: KycStatus.VERIFIED,
  })
  @IsEnum(KycStatus, {
    message: 'Le statut doit être VERIFIED ou REJECTED.',
  })
  status!: KycStatus;

  @ApiPropertyOptional({
    description: 'Motif explicatif en cas de rejet de la pièce',
    example: 'Photo floue ou document expiré.',
  })
  @IsOptional()
  @IsString()
  rejectionReason?: string;
}
