import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsNotEmpty, IsNumber, IsOptional, IsString, Min } from 'class-validator';

export enum WebhookPaymentStatus {
  SUCCESS = 'SUCCESS',
  FAILED = 'FAILED',
}

export class WebhookPayloadDto {
  @ApiProperty({
    example: 'tx_free_money_987654321',
    description: 'Référence externe unique attribuée par l’opérateur (Wave, OM, Free)',
  })
  @IsNotEmpty({ message: 'externalTxId est obligatoire' })
  @IsString()
  externalTxId!: string;

  @ApiProperty({
    example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
    description: 'Identifiant UUID de la commande concernée',
  })
  @IsNotEmpty({ message: 'orderId est obligatoire' })
  @IsString()
  orderId!: string;

  @ApiProperty({
    example: 25000,
    description: 'Montant en FCFA réglé par le client',
  })
  @IsNotEmpty({ message: 'amountFcfa est obligatoire' })
  @IsNumber()
  @Min(100, { message: 'Le montant minimum est de 100 FCFA' })
  amountFcfa!: number;

  @ApiProperty({
    enum: WebhookPaymentStatus,
    example: WebhookPaymentStatus.SUCCESS,
    description: 'Statut retourné par l’opérateur (SUCCESS ou FAILED)',
  })
  @IsNotEmpty({ message: 'status est obligatoire' })
  @IsEnum(WebhookPaymentStatus)
  status!: WebhookPaymentStatus;

  @ApiPropertyOptional({
    description: 'Métadonnées brutes optionnelles envoyées par l’opérateur',
  })
  @IsOptional()
  metadata?: Record<string, unknown>;
}
