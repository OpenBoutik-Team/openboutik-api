import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
} from 'class-validator';
import { KycStatus, SubscriptionPlan } from '../../generated/prisma/client';

export class SaveOnboardingStepDto {
  // --- Étape 1 : Identité de la boutique ---
  @ApiPropertyOptional({
    example: 'Teranga Mode',
    description: 'Nom commercial de la boutique (Étape 1)',
  })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({
    example: 'teranga-mode',
    description: 'Slug URL unique de la boutique (Étape 1)',
  })
  @IsOptional()
  @IsString()
  @Matches(/^[a-z0-9-]+$/, {
    message: 'Le slug ne doit contenir que des lettres minuscules, chiffres et tirets (sans espaces)',
  })
  slug?: string;

  @ApiPropertyOptional({
    example: 'Boutique de confection artisanale et prêt-à-porter traditionnel sénégalais',
    description: 'Description courte de l’activité (Étape 1)',
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({
    example: 'Mode & Prêt-à-porter',
    description: 'Secteur ou catégorie principale de la boutique (Étape 1)',
  })
  @IsOptional()
  @IsString()
  mainCategory?: string;

  @ApiPropertyOptional({
    example: 'Dakar',
    description: 'Ville ou région d’implantation (Étape 1)',
    default: 'Dakar',
  })
  @IsOptional()
  @IsString()
  city?: string;

  // --- Étape 2 : Apparence (Optionnelle / Skippable) ---
  @ApiPropertyOptional({
    example: 'https://images.unsplash.com/photo-1544441893-675973e31985?w=400',
    description: 'URL du logo de la boutique (Étape 2)',
  })
  @IsOptional()
  @IsString()
  logoUrl?: string;

  @ApiPropertyOptional({
    example: 'https://images.unsplash.com/photo-1489987707025-afc232f7ea0f?w=1200',
    description: 'URL de la bannière de vitrine (Étape 2)',
  })
  @IsOptional()
  @IsString()
  bannerUrl?: string;

  @ApiPropertyOptional({
    example: '#10B981',
    description: 'Couleur primaire de la vitrine en hexadécimal (Étape 2)',
    default: '#10B981',
  })
  @IsOptional()
  @Matches(/^#[0-9A-Fa-f]{6}$/, {
    message: 'La couleur primaire doit être un code hexadécimal valide (ex: #10B981)',
  })
  primaryColor?: string;

  // --- Étape 3 : Contact Social Commerce ---
  @ApiPropertyOptional({
    example: '+221771234567',
    description: 'Numéro WhatsApp au format sénégalais +221XXXXXXXXX pour les commandes (Étape 3)',
  })
  @IsOptional()
  @Matches(/^\+221[0-9]{9}$/, {
    message: 'Le numéro WhatsApp doit être au format sénégalais +221XXXXXXXXX',
  })
  whatsappNumber?: string;

  // --- Étape 4 : Réception des paiements du Séquestre ---
  @ApiPropertyOptional({
    example: '+221771234567',
    description: 'Numéro Wave pour recevoir les fonds débloqués du séquestre (Étape 4)',
  })
  @IsOptional()
  @Matches(/^\+221[0-9]{9}$/, {
    message: 'Le numéro Wave doit être au format sénégalais +221XXXXXXXXX',
  })
  waveNumber?: string;

  @ApiPropertyOptional({
    example: '+221761234567',
    description: 'Numéro Orange Money pour recevoir les fonds débloqués du séquestre (Étape 4)',
  })
  @IsOptional()
  @Matches(/^\+221[0-9]{9}$/, {
    message: 'Le numéro Orange Money doit être au format sénégalais +221XXXXXXXXX',
  })
  omNumber?: string;

  @ApiPropertyOptional({
    example: 'Moussa Diop',
    description: 'Nom et prénom complet du titulaire du compte Wave / Orange Money (Étape 4)',
  })
  @IsOptional()
  @IsString()
  payoutHolderName?: string;

  // --- Étape 5 : Choix du plan SaaS ---
  @ApiPropertyOptional({
    enum: SubscriptionPlan,
    example: SubscriptionPlan.FREE,
    description: 'Plan d’abonnement choisi : FREE (4 % commission) ou PREMIUM (2 % commission) (Étape 5)',
  })
  @IsOptional()
  @IsEnum(SubscriptionPlan)
  plan?: SubscriptionPlan;

  // --- Indicateur pour sauter une étape optionnelle (Étape 2 ou 5) ---
  @ApiPropertyOptional({
    example: true,
    description: 'Indique si le vendeur choisit de passer l’étape optionnelle (applicable aux étapes 2 et 5)',
  })
  @IsOptional()
  @IsBoolean()
  skip?: boolean;
}

export class SubmitKycDto {
  @ApiProperty({
    example: '1 758 1990 01234',
    description: 'Numéro de la Carte Nationale d’Identité sénégalaise (CNI)',
  })
  @IsNotEmpty({ message: 'Le numéro de pièce d’identité est requis' })
  @IsString()
  idCardNumber: string;

  @ApiProperty({
    example: 'https://storage.openboutik.sn/kyc/cni-moussa-diop.jpg',
    description: 'URL du scan ou de la photo de la pièce d’identité (recto/verso)',
  })
  @IsNotEmpty({ message: 'L’URL du document d’identité est requise' })
  @IsString()
  idCardUrl: string;
}

export class ReviewKycDto {
  @ApiProperty({
    enum: [KycStatus.VERIFIED, KycStatus.REJECTED],
    example: KycStatus.VERIFIED,
    description: 'Décision du Super-Admin concernant la CNI : VERIFIED ou REJECTED',
  })
  @IsNotEmpty({ message: 'Le statut de révision est requis' })
  @IsEnum(KycStatus, { message: 'Le statut doit être VERIFIED ou REJECTED' })
  status: KycStatus;

  @ApiPropertyOptional({
    example: 'Document d’identité vérifié et conforme au titulaire du compte bancaire/mobile money',
    description: 'Commentaire ou motif de rejet explicatif pour le marchand',
  })
  @IsOptional()
  @IsString()
  rejectionReason?: string;

  @ApiPropertyOptional({
    example: true,
    description: 'Attribuer simultanément le badge certifié Marchand Vérifié à la boutique',
    default: true,
  })
  @IsOptional()
  @IsBoolean()
  verifyShopBadge?: boolean;
}
