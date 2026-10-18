import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class VerifyShopDto {
  @ApiProperty({
    example: true,
    description: 'Statut de certification de la boutique par l’équipe OpenBoutik',
  })
  @IsNotEmpty()
  @IsBoolean()
  isVerified: boolean;

  @ApiPropertyOptional({
    example: 'Pièces d’identité et NINEA vérifiés par le Super-Admin',
    description: 'Commentaire ou motif de la décision pour l’audit log',
  })
  @IsOptional()
  @IsString()
  notes?: string;
}
