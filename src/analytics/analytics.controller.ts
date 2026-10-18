import {
  Controller,
  Get,
  Post,
  Param,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { AnalyticsService } from './analytics.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Role } from '../generated/prisma/client';

@ApiTags('Analytique & Performance Vendeur')
@Controller()
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  @Post('products/:id/view')
  @ApiOperation({
    summary: 'Enregistrer une visite sur une fiche produit (Public / Marketplace)',
    description: 'Incrémente de manière atomique le compteur journalier de visites du produit à la date du jour (YYYY-MM-DD).',
  })
  @ApiResponse({ status: 200, description: 'Visite enregistrée avec succès' })
  @ApiResponse({ status: 404, description: 'Produit introuvable' })
  recordProductView(@Param('id') productId: string) {
    return this.analyticsService.recordProductView(productId);
  }

  @Get('analytics/top-products')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.VENDOR, Role.SUPER_ADMIN)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Top 5 des produits les plus performants du mois (Espace Vendeur)',
    description: 'Retourne les 5 produits ayant généré le plus de chiffre d’affaires en FCFA sur le mois en cours, avec volume vendu, nombre de visites et taux de conversion.',
  })
  @ApiResponse({ status: 200, description: 'Top 5 des ventes mensuelles récupéré' })
  @ApiResponse({ status: 403, description: 'Accès refusé' })
  getTopProducts(@CurrentUser('id') vendorId: string) {
    return this.analyticsService.getTopProducts(vendorId);
  }
}
