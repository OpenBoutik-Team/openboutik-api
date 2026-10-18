import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

export class SendMessageDto {
  @ApiProperty({
    example: 'b2c3d4e5-f6a7-8901-bcde-f12345678901',
    description: 'Identifiant UUID du destinataire (Vendeur ou Acheteur)',
  })
  @IsNotEmpty({ message: 'receiverId est obligatoire' })
  @IsString()
  receiverId!: string;

  @ApiProperty({
    example: 'Bonjour, est-ce que le boubou est disponible en taille XL ?',
    description: 'Contenu texte du message',
  })
  @IsNotEmpty({ message: 'Le contenu du message ne peut pas être vide' })
  @IsString()
  @MaxLength(3000, { message: 'Le message ne peut pas dépasser 3000 caractères' })
  content!: string;

  @ApiPropertyOptional({
    example: 'c3d4e5f6-a7b8-9012-cdef-123456789012',
    description: 'Identifiant UUID de la boutique concernée (optionnel)',
  })
  @IsOptional()
  @IsString()
  shopId?: string;

  @ApiPropertyOptional({
    example: 'd4e5f6a7-b8c9-0123-def1-234567890123',
    description: 'Identifiant UUID du produit sur lequel porte la question (optionnel)',
  })
  @IsOptional()
  @IsString()
  productId?: string;

  @ApiPropertyOptional({
    example: 'e5f6a7b8-c9d0-1234-ef12-345678901234',
    description: 'Identifiant UUID de la commande concernée (optionnel)',
  })
  @IsOptional()
  @IsString()
  orderId?: string;
}
