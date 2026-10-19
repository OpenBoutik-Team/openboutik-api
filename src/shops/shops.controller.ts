import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  ParseIntPipe,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger';
import { ShopsService } from './shops.service';
import { UpdateShopDto } from './dto/update-shop.dto';
import { VerifyShopDto } from './dto/verify-shop.dto';
import { SaveOnboardingStepDto, SubmitKycDto, ReviewKycDto } from './dto/onboarding.dto';
import { SetVacationDto } from './dto/set-vacation.dto';
import { UpdateShopCustomizationDto } from './dto/customization.dto';
import { CreateShopSponsorDto, UpdateShopSponsorDto } from './dto/sponsor.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Role } from '../generated/prisma/client';

@ApiTags('Boutiques (SaaS)')
@Controller('shops')
export class ShopsController {
  constructor(private readonly shopsService: ShopsService) {}

  @Get('check-slug/:slug')
  @ApiOperation({
    summary: 'Vérifier la disponibilité d’un nom d’URL / slug en temps réel',
    description: 'Vérifie si openboutik.sn/boutique/[slug] est disponible. Renvoie une suggestion alternative dakaroise si le nom est déjà pris.',
  })
  @ApiResponse({
    status: 200,
    description: 'Disponibilité vérifiée avec succès',
  })
  async checkSlug(@Param('slug') slug: string) {
    return this.shopsService.checkSlugAvailability(slug);
  }

  @Get()
  @ApiOperation({
    summary: 'Liste des boutiques actives sur la marketplace',
    description: 'Renvoie l’annuaire des boutiques marchandes avec filtres de recherche et badges de vérification.',
  })
  @ApiQuery({ name: 'search', required: false, description: 'Recherche par nom, description ou ville' })
  @ApiQuery({ name: 'city', required: false, description: 'Filtrer par ville (ex: Dakar)' })
  @ApiQuery({ name: 'isVerified', required: false, type: Boolean, description: 'Filtrer les boutiques certifiées' })
  async getAllShops(
    @Query('search') search?: string,
    @Query('city') city?: string,
    @Query('isVerified') isVerified?: boolean,
  ) {
    return this.shopsService.getAllShops({ search, city, isVerified });
  }

  @Get('me/onboarding')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.VENDOR)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Récupérer l’état d’onboarding marchand et la checklist de démarrage',
    description: 'Permet au Pôle Vendeur (openboutik-seller) d’afficher l’étape en cours (1..5) et la checklist (onboarding terminé, 1er produit ajouté, KYC vérifié).',
  })
  @ApiResponse({
    status: 200,
    description: 'État de l’onboarding récupéré avec succès',
  })
  async getOnboardingStatus(@CurrentUser('id') vendorId: string) {
    return this.shopsService.getOnboardingStatus(vendorId);
  }

  @Patch('me/onboarding/step/:step')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.VENDOR)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Sauvegarder une étape d’onboarding (Étapes 1 à 5)',
    description: 'Enregistre les données de l’étape en cours. Les étapes 2 (Apparence) et 5 (Plan SaaS) peuvent être sautées avec { skip: true }.',
  })
  @ApiResponse({
    status: 200,
    description: 'Étape enregistrée avec succès, renvoie le statut d’onboarding mis à jour',
  })
  async saveOnboardingStep(
    @CurrentUser('id') vendorId: string,
    @Param('step', ParseIntPipe) step: number,
    @Body() dto: SaveOnboardingStepDto,
  ) {
    return this.shopsService.saveOnboardingStep(vendorId, step, dto);
  }

  @Post('me/kyc')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.VENDOR)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Soumettre la pièce d’identité (CNI) pour débloquer les retraits',
    description: 'Enregistre le numéro de CNI sénégalaise et l’URL du document pour passage en statut KYC PENDING.',
  })
  @ApiResponse({
    status: 200,
    description: 'Dossier KYC transmis avec succès pour examen',
  })
  async submitKyc(
    @CurrentUser('id') vendorId: string,
    @Body() dto: SubmitKycDto,
  ) {
    return this.shopsService.submitKyc(vendorId, dto);
  }

  @Get('vendor/me')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.VENDOR)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Tableau de bord de la boutique du vendeur connecté',
    description: 'Données complètes pour l’espace commerçant (Dev 2) : statut SaaS, portefeuille avec solde séquestre et métriques de commandes.',
  })
  @ApiResponse({
    status: 200,
    description: 'Tableau de bord récupéré avec succès',
  })
  async getVendorDashboard(@CurrentUser('id') vendorId: string) {
    return this.shopsService.getVendorDashboard(vendorId);
  }

  @Patch('vendor/me')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.VENDOR)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Personnalisation de la boutique marchande',
    description: 'Met à jour les coordonnées WhatsApp, les numéros de retrait Wave/OM, le logo, la bannière et la couleur dominante.',
  })
  @ApiResponse({
    status: 200,
    description: 'Boutique mise à jour avec succès',
  })
  async updateVendorShop(
    @CurrentUser('id') vendorId: string,
    @Body() dto: UpdateShopDto,
  ) {
    return this.shopsService.updateVendorShop(vendorId, dto);
  }

  @Patch('me/vacation')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.VENDOR)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Activer ou désactiver le Mode Vacances de la boutique (Vendeur)',
    description: 'Permet au commerçant de suspendre temporairement la prise de commandes tout en conservant sa vitrine et ses produits visibles sur la Marketplace.',
  })
  @ApiResponse({
    status: 200,
    description: 'Statut du mode vacances mis à jour avec succès',
  })
  async setVacationMode(
    @CurrentUser('id') vendorId: string,
    @Body() dto: SetVacationDto,
  ) {
    return this.shopsService.setVacationMode(vendorId, dto);
  }

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.VENDOR)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Créer une boutique (Règle MVP : 1 Vendeur = 1 Boutique)',
    description: 'Rejette la création d’une seconde boutique pour le même compte avec 409 Conflict.',
  })
  async createShop(
    @CurrentUser('id') vendorId: string,
    @Body() dto: SaveOnboardingStepDto,
  ) {
    return this.shopsService.createShop(vendorId, dto);
  }

  @Get('storefront/:identifier')
  @ApiOperation({
    summary: 'Vitrine personnalisée SaaS (Sous-domaine ou Domaine personnalisé)',
    description: 'Renvoie le catalogue complet avec grille organisée, thème et sponsors pour le sous-domaine/domaine. Si le plan est FREE/désactivé, renvoie une indication de redirection vers la marketplace.',
  })
  @ApiResponse({
    status: 200,
    description: 'Données de vitrine récupérées avec succès',
  })
  async getStorefront(@Param('identifier') identifier: string) {
    return this.shopsService.getStorefront(identifier);
  }

  @Get('me/customization')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.VENDOR)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Récupérer la configuration visuelle et le sous-domaine du vendeur connecté',
  })
  async getShopCustomization(@CurrentUser('id') vendorId: string) {
    return this.shopsService.getShopCustomization(vendorId);
  }

  @Patch('me/customization')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.VENDOR)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Mettre à jour la personnalisation visuelle (Store Builder) et le sous-domaine',
    description: 'Permet de configurer les couleurs primaires/secondaires, le favicon, la barre d’annonce et le sous-domaine. Sous réserve des droits du forfait (ex: PRO/PREMIUM pour activer le sous-domaine).',
  })
  async updateShopCustomization(
    @CurrentUser('id') vendorId: string,
    @Body() dto: UpdateShopCustomizationDto,
  ) {
    return this.shopsService.updateShopCustomization(vendorId, dto);
  }

  @Post('me/sponsors')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.VENDOR)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Ajouter un sponsor / partenaire à la vitrine marchande',
    description: 'Plan FREE: interdit (403). Plan PRO: max 5 sponsors. Plan PREMIUM: illimité.',
  })
  async createShopSponsor(
    @CurrentUser('id') vendorId: string,
    @Body() dto: CreateShopSponsorDto,
  ) {
    return this.shopsService.createShopSponsor(vendorId, dto);
  }

  @Get('me/sponsors')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.VENDOR)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Lister les sponsors / partenaires de la boutique du vendeur connecté',
  })
  async getShopSponsors(@CurrentUser('id') vendorId: string) {
    return this.shopsService.getShopSponsors(vendorId);
  }

  @Patch('me/sponsors/:sponsorId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.VENDOR)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Mettre à jour un sponsor / partenaire (nom, logo, lien, ordre, statut)',
  })
  async updateShopSponsor(
    @CurrentUser('id') vendorId: string,
    @Param('sponsorId') sponsorId: string,
    @Body() dto: UpdateShopSponsorDto,
  ) {
    return this.shopsService.updateShopSponsor(vendorId, sponsorId, dto);
  }

  @Delete('me/sponsors/:sponsorId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.VENDOR)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Supprimer un sponsor / partenaire de la boutique',
  })
  async deleteShopSponsor(
    @CurrentUser('id') vendorId: string,
    @Param('sponsorId') sponsorId: string,
  ) {
    return this.shopsService.deleteShopSponsor(vendorId, sponsorId);
  }

  @Get('me/dashboard-360')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.VENDOR)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Tableau de bord Vendeur 360° complet',
    description: 'Statut SaaS, décompte Dunning, économies de commission cumulées, répartition des ventes par canal, santé des stocks et top produits.',
  })
  async getVendorDashboard360(@CurrentUser('id') vendorId: string) {
    return this.shopsService.getVendorDashboard360(vendorId);
  }

  @Patch('admin/:id/kyc')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.SUPER_ADMIN)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Validation ou Rejet KYC d’un marchand (Super-Admin)',
    description: 'Approuve la CNI du marchand pour débloquer ses retraits Mobile Money et lui attribuer son badge certifié.',
  })
  @ApiResponse({
    status: 200,
    description: 'Décision KYC enregistrée avec succès avec trace dans AuditLog',
  })
  async reviewKyc(
    @Param('id') shopId: string,
    @CurrentUser('id') superAdminId: string,
    @Body() dto: ReviewKycDto,
  ) {
    return this.shopsService.reviewKyc(shopId, dto, superAdminId);
  }

  @Patch(':id/verify')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.SUPER_ADMIN)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Certification / Vérification d’une boutique (Super-Admin)',
    description: 'Attribue ou retire le badge certifié d’une boutique et enregistre l’action dans le journal d’audit.',
  })
  @ApiResponse({
    status: 200,
    description: 'Statut de vérification mis à jour avec succès',
  })
  async verifyShop(
    @Param('id') shopId: string,
    @CurrentUser('id') superAdminId: string,
    @Body() dto: VerifyShopDto,
  ) {
    return this.shopsService.verifyShop(shopId, dto.isVerified, superAdminId, dto.notes);
  }

  @Get(':slug')
  @ApiOperation({
    summary: 'Vitrine publique d’une boutique par son slug',
    description: 'Données pour afficher la page boutique personnalisée sur la marketplace (ex: /boutique/teranga-mode) avec son catalogue.',
  })
  @ApiResponse({
    status: 200,
    description: 'Vitrine récupérée avec succès',
  })
  @ApiResponse({
    status: 404,
    description: 'Boutique introuvable ou désactivée',
  })
  async getShopBySlug(@Param('slug') slug: string) {
    return this.shopsService.findBySlug(slug);
  }
}

