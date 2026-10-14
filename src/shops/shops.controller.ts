import {
  Controller,
  Get,
  Patch,
  Body,
  Param,
  Query,
  UseGuards,
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
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Role } from '../generated/prisma/client';

@ApiTags('Boutiques (SaaS)')
@Controller('shops')
export class ShopsController {
  constructor(private readonly shopsService: ShopsService) {}

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
