import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Equals, IsBoolean, IsEmail, IsNotEmpty, IsOptional, IsString, Matches, MinLength } from 'class-validator';

export class RegisterVendorDto {
  @ApiProperty({
    example: '+221771234567',
    description: 'Numéro de téléphone personnel du marchand (+221XXXXXXXXX)',
  })
  @IsNotEmpty({ message: 'Le numéro de téléphone est requis' })
  @IsString()
  @Matches(/^\+221[0-9]{9}$/, {
    message: 'Le numéro de téléphone doit être au format sénégalais +221XXXXXXXXX',
  })
  phone: string;

  @ApiProperty({
    example: 'Moussa Diop',
    description: 'Nom complet du marchand',
  })
  @IsNotEmpty({ message: 'Le nom du marchand est requis' })
  @IsString()
  fullName: string;

  @ApiPropertyOptional({
    example: 'moussa.diop@terangamode.sn',
    description: 'Adresse email du marchand',
  })
  @IsOptional()
  @IsEmail({}, { message: 'Adresse email invalide' })
  email?: string;

  @ApiProperty({
    example: 'Passer123!',
    description: 'Mot de passe sécurisé (au moins 6 caractères)',
  })
  @IsNotEmpty({ message: 'Le mot de passe est requis' })
  @IsString()
  @MinLength(6, { message: 'Le mot de passe doit comporter au moins 6 caractères' })
  password: string;

  @ApiProperty({
    example: true,
    description: 'Acceptation obligatoire des conditions générales d’utilisation et des commissions de séquestre (2 % à 4 %)',
  })
  @IsNotEmpty({ message: 'Vous devez accepter les conditions générales d’utilisation' })
  @IsBoolean({ message: 'L’acceptation des conditions doit être un booléen' })
  @Equals(true, { message: 'Vous devez accepter les conditions générales et le fonctionnement du séquestre (commission de 2 % à 4 %)' })
  acceptTerms: boolean;

  // --- Données initiales optionnelles de la boutique (Étape 1 pré-remplie si fournie) ---

  @ApiPropertyOptional({
    example: 'Teranga Mode',
    description: 'Nom commercial de la boutique',
  })
  @IsOptional()
  @IsString()
  shopName?: string;

  @ApiPropertyOptional({
    example: 'teranga-mode',
    description: 'Identifiant URL unique de la boutique (ex: openboutik.sn/boutique/teranga-mode)',
  })
  @IsOptional()
  @IsString()
  @Matches(/^[a-z0-9-]+$/, {
    message: 'Le slug ne doit contenir que des lettres minuscules, chiffres et tirets (sans espaces)',
  })
  shopSlug?: string;

  @ApiPropertyOptional({
    example: 'Mode & Prêt-à-porter',
    description: 'Catégorie principale de la boutique (ex: Mode, Électronique, Alimentation, Cosmétique...)',
  })
  @IsOptional()
  @IsString()
  mainCategory?: string;

  @ApiPropertyOptional({
    example: '+221771234567',
    description: 'Numéro WhatsApp de contact client (+221XXXXXXXXX)',
  })
  @IsOptional()
  @IsString()
  @Matches(/^\+221[0-9]{9}$/, {
    message: 'Le numéro WhatsApp doit être au format sénégalais +221XXXXXXXXX',
  })
  whatsappNumber?: string;

  @ApiPropertyOptional({
    example: 'Rue 11 angle Blaise Diagne, Médina',
    description: 'Adresse physique ou quartier de la boutique',
  })
  @IsOptional()
  @IsString()
  address?: string;

  @ApiPropertyOptional({
    example: 'Dakar',
    description: 'Ville de la boutique',
    default: 'Dakar',
  })
  @IsOptional()
  @IsString()
  city?: string;
}

