import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsNotEmpty, IsString } from 'class-validator';

export enum DisputeDecision {
  REFUND_CLIENT = 'REFUND_CLIENT',
  RELEASE_VENDOR = 'RELEASE_VENDOR',
}

export class ArbitrateDisputeDto {
  @ApiProperty({
    enum: DisputeDecision,
    example: DisputeDecision.RELEASE_VENDOR,
    description: 'Décision d’arbitrage prise par l’équipe Super-Admin',
  })
  @IsNotEmpty({ message: 'La décision d’arbitrage est requise' })
  @IsEnum(DisputeDecision)
  decision: DisputeDecision;

  @ApiProperty({
    example: 'Après échange téléphonique avec le client et le livreur Tiak-Tiak, le colis a bien été remis intact.',
    description: 'Motif et justification officielle de la décision pour le dossier',
  })
  @IsNotEmpty({ message: 'Les notes de décision sont obligatoires' })
  @IsString()
  decisionNotes: string;
}
