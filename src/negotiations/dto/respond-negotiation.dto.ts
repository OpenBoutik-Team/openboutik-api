import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsInt, IsOptional, Min } from 'class-validator';
import { Type } from 'class-transformer';

export enum NegotiationResponseAction {
  ACCEPT = 'ACCEPT',
  REJECT = 'REJECT',
  COUNTER_OFFER = 'COUNTER_OFFER',
}

export class RespondNegotiationDto {
  @ApiProperty({
    description: 'Action du vendeur face à la proposition',
    enum: NegotiationResponseAction,
    example: NegotiationResponseAction.COUNTER_OFFER,
  })
  @IsEnum(NegotiationResponseAction, {
    message: 'L’action doit être ACCEPT, REJECT ou COUNTER_OFFER.',
  })
  action!: NegotiationResponseAction;

  @ApiPropertyOptional({
    description:
      'Contre-offre du vendeur en FCFA (obligatoire si action est COUNTER_OFFER)',
    example: 47000,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'La contre-offre doit être un nombre entier en FCFA.' })
  @Min(100, { message: 'La contre-offre doit être d’au moins 100 FCFA.' })
  counterPriceFcfa?: number;
}
