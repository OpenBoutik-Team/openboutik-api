import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class SetVacationDto {
  @ApiProperty({
    example: true,
    description: 'Activer (true) ou désactiver (false) le mode vacances de la boutique',
  })
  @IsNotEmpty({ message: 'Le statut du mode vacances (isOnVacation) est requis' })
  @IsBoolean({ message: 'isOnVacation doit être un booléen' })
  isOnVacation: boolean;

  @ApiPropertyOptional({
    example: "Boutique fermée pour la Tabaski, reprise des livraisons lundi inch'Allah !",
    description: 'Message d’information affiché aux acheteurs sur la Marketplace',
  })
  @IsOptional()
  @IsString({ message: 'Le message de vacances doit être une chaîne de caractères' })
  vacationMessage?: string;
}
