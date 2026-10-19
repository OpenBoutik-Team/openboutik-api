import {
  IsString,
  IsOptional,
  IsBoolean,
  IsObject,
  MaxLength,
  Matches,
} from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateShopCustomizationDto {
  @ApiPropertyOptional({ description: 'Nom commercial de la boutique' })
  @IsOptional()
  @IsString()
  @MaxLength(80)
  name?: string;

  @ApiPropertyOptional({ description: 'Slogan accrocheur de la boutique' })
  @IsOptional()
  @IsString()
  @MaxLength(160)
  slogan?: string;

  @ApiPropertyOptional({ description: 'Description détaillée de la boutique' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ description: 'URL du logo de la boutique' })
  @IsOptional()
  @IsString()
  logoUrl?: string;

  @ApiPropertyOptional({ description: 'URL de la bannière de la vitrine' })
  @IsOptional()
  @IsString()
  bannerUrl?: string;

  @ApiPropertyOptional({ description: 'URL du favicon personnalisé' })
  @IsOptional()
  @IsString()
  faviconUrl?: string;

  @ApiPropertyOptional({ description: 'Activer la barre d’annonces en haut du site' })
  @IsOptional()
  @IsBoolean()
  announcementBarEnabled?: boolean;

  @ApiPropertyOptional({ description: 'Texte défilant ou fixe de la barre d’annonces' })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  announcementBarText?: string;

  @ApiPropertyOptional({
    description: 'Configuration visuelle complète du Store Builder (thème, couleurs, grille, sections)',
  })
  @IsOptional()
  @IsObject()
  themeConfig?: Record<string, any>;

  @ApiPropertyOptional({ description: 'Couleur primaire HEX', example: '#10B981' })
  @IsOptional()
  @Matches(/^#[0-9A-Fa-f]{6}$/, { message: 'La couleur primaire doit être au format #RRGGBB' })
  primaryColor?: string;

  @ApiPropertyOptional({ description: 'Couleur secondaire HEX', example: '#1E293B' })
  @IsOptional()
  @Matches(/^#[0-9A-Fa-f]{6}$/, { message: 'La couleur secondaire doit être au format #RRGGBB' })
  secondaryColor?: string;

  @ApiPropertyOptional({ description: 'Sous-domaine dédié personnalisé', example: 'maboutique' })
  @IsOptional()
  @IsString()
  @Matches(/^[a-z0-9-]+$/, {
    message: 'Le sous-domaine ne doit contenir que des lettres minuscules, chiffres et tirets',
  })
  subdomain?: string;

  @ApiPropertyOptional({ description: 'Activer le sous-domaine dédié (Réservé PRO/PREMIUM)' })
  @IsOptional()
  @IsBoolean()
  subdomainEnabled?: boolean;
}
