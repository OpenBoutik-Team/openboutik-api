import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, Matches } from 'class-validator';

export class UpdateShopDto {
  @ApiPropertyOptional({
    example: 'Teranga Mode Dakar',
    description: 'Nouveau nom commercial de la boutique',
  })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({
    example: 'Atelier de confection et prêt-à-porter traditionnel à la Médina.',
    description: 'Description détaillée de l’activité et de la boutique',
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({
    example: 'https://images.unsplash.com/photo-1544441893-675973e31985?w=400',
    description: 'URL du logo de la boutique',
  })
  @IsOptional()
  @IsString()
  logoUrl?: string;

  @ApiPropertyOptional({
    example: 'https://images.unsplash.com/photo-1489987707025-afc232f7ea0f?w=1200',
    description: 'URL de la bannière d’en-tête de la vitrine',
  })
  @IsOptional()
  @IsString()
  bannerUrl?: string;

  @ApiPropertyOptional({
    example: '#059669',
    description: 'Couleur primaire de la vitrine en code HEX',
  })
  @IsOptional()
  @Matches(/^#[0-9A-Fa-f]{6}$/, {
    message: 'La couleur primaire doit être un code hexadécimal valide (ex: #10B981)',
  })
  primaryColor?: string;

  @ApiPropertyOptional({
    example: '+221771234567',
    description: 'Numéro WhatsApp pour le bouton Social Commerce',
  })
  @IsOptional()
  @Matches(/^\+221[0-9]{9}$/, {
    message: 'Le numéro WhatsApp doit être au format sénégalais +221XXXXXXXXX',
  })
  whatsappNumber?: string;

  @ApiPropertyOptional({
    example: '+221771234567',
    description: 'Numéro Wave pour les retraits des fonds débloqués',
  })
  @IsOptional()
  @Matches(/^\+221[0-9]{9}$/, {
    message: 'Le numéro Wave doit être au format sénégalais +221XXXXXXXXX',
  })
  waveNumber?: string;

  @ApiPropertyOptional({
    example: '+221771234567',
    description: 'Numéro Orange Money pour les retraits des fonds débloqués',
  })
  @IsOptional()
  @Matches(/^\+221[0-9]{9}$/, {
    message: 'Le numéro Orange Money doit être au format sénégalais +221XXXXXXXXX',
  })
  omNumber?: string;

  @ApiPropertyOptional({
    example: 'Rue 11 angle Blaise Diagne, Médina',
    description: 'Adresse physique ou quartier à Dakar',
  })
  @IsOptional()
  @IsString()
  address?: string;

  @ApiPropertyOptional({
    example: 'Dakar',
    description: 'Ville d’implantation',
  })
  @IsOptional()
  @IsString()
  city?: string;
}
