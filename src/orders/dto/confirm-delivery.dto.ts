import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, Length } from 'class-validator';

export class ConfirmDeliveryDto {
  @ApiPropertyOptional({
    example: '482910',
    description: 'Code OTP à 6 chiffres remis au livreur Tiak-Tiak (obligatoire si validation par le vendeur/livreur)',
  })
  @IsOptional()
  @IsString()
  @Length(6, 6, { message: 'Le code de confirmation doit comporter exactement 6 chiffres' })
  confirmationCode?: string;
}
