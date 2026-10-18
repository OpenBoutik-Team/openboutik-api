import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class ReplyReviewDto {
  @ApiProperty({
    example: 'Merci beaucoup pour votre confiance et votre fidélité, à très bientôt sur notre boutique !',
    description: 'Réponse publique officielle du commerçant à l’avis client',
  })
  @IsNotEmpty({ message: 'La réponse du commerçant est requise' })
  @IsString({ message: 'La réponse doit être une chaîne de caractères' })
  @MaxLength(1000, {
    message: 'La réponse ne peut pas dépasser 1000 caractères',
  })
  reply: string;
}
