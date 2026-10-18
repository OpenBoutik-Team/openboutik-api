import { ApiProperty } from '@nestjs/swagger';
import { IsEnum } from 'class-validator';
import { StreamStatus } from '../../generated/prisma/client';

export class UpdateStreamStatusDto {
  @ApiProperty({
    description: 'Nouveau statut du flux (SCHEDULED, LIVE, ENDED, PUBLISHED)',
    enum: StreamStatus,
    example: StreamStatus.LIVE,
  })
  @IsEnum(StreamStatus, {
    message: 'Le statut doit être SCHEDULED, LIVE, ENDED ou PUBLISHED.',
  })
  status!: StreamStatus;
}
