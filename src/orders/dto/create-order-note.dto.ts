import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class CreateOrderNoteDto {
  @ApiProperty({
    example: 'Colis confié au livreur Tiak-Tiak Moussa (+221770001122) à 14h30.',
    description: 'Note interne confidentielle vendeur sur la commande (non visible par le client)',
  })
  @IsNotEmpty({ message: 'Le contenu du mémo interne est requis' })
  @IsString({ message: 'Le mémo doit être une chaîne de caractères' })
  @MaxLength(1000, {
    message: 'Le mémo ne peut pas dépasser 1000 caractères',
  })
  text: string;
}
