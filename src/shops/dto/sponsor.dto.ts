import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsBoolean,
  IsInt,
  Min,
  MaxLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateShopSponsorDto {
  @ApiProperty({ description: 'Nom officiel du sponsor ou partenaire' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  name: string;

  @ApiProperty({ description: 'URL du logo du sponsor' })
  @IsString()
  @IsNotEmpty()
  logoUrl: string;

  @ApiPropertyOptional({ description: 'Site web ou lien du partenaire' })
  @IsOptional()
  @IsString()
  websiteUrl?: string;

  @ApiPropertyOptional({ description: 'Courte description du partenariat' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ description: 'Badge distinctif (ex: "Sponsor Officiel", "Partenaire Logistique")' })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  badgeText?: string;

  @ApiPropertyOptional({ description: 'Ordre d’affichage (entier positif, 0 par défaut)' })
  @IsOptional()
  @IsInt()
  @Min(0)
  displayOrder?: number;
}

export class UpdateShopSponsorDto {
  @ApiPropertyOptional({ description: 'Nom du sponsor' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  name?: string;

  @ApiPropertyOptional({ description: 'URL du logo' })
  @IsOptional()
  @IsString()
  logoUrl?: string;

  @ApiPropertyOptional({ description: 'Site web du partenaire' })
  @IsOptional()
  @IsString()
  websiteUrl?: string;

  @ApiPropertyOptional({ description: 'Description du partenariat' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ description: 'Badge distinctif' })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  badgeText?: string;

  @ApiPropertyOptional({ description: 'Ordre d’affichage' })
  @IsOptional()
  @IsInt()
  @Min(0)
  displayOrder?: number;

  @ApiPropertyOptional({ description: 'Statut actif/inactif du sponsor en vitrine' })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
