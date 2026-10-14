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
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger';
import { CatalogService } from './catalog.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { UpdateStockDto } from './dto/update-stock.dto';
import { QueryProductsDto } from './dto/query-products.dto';
import { CreateCategoryDto } from './dto/create-category.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Role } from '../generated/prisma/client';

@ApiTags('Catalogue & Produits')
@Controller()
export class CatalogController {
  constructor(private readonly catalogService: CatalogService) {}

  // ----------------------------------------------------------------------------
  // ROUTES PUBLIQUES (Dev 1 - Marketplace)
  // ----------------------------------------------------------------------------

  @Get('products')
  @ApiOperation({
    summary: 'Recherche et filtres de produits sur la marketplace',
    description: 'Recherche textuelle, filtres par boutique, catégorie, fourchette de prix FCFA et pagination.',
  })
  @ApiResponse({
    status: 200,
    description: 'Liste paginée de produits retournée avec succès',
  })
  async getAllProducts(@Query() query: QueryProductsDto) {
    return this.catalogService.findAllProducts(query);
  }

  @Get('products/:shopSlug/:productSlug')
  @ApiOperation({
    summary: 'Fiche détaillée d’un produit',
    description: 'Renvoie les caractéristiques du produit et les coordonnées de la boutique pour le bouton Social Commerce WhatsApp.',
  })
  @ApiResponse({
    status: 200,
    description: 'Fiche produit retournée avec succès',
  })
  @ApiResponse({
    status: 404,
    description: 'Produit introuvable dans cette boutique',
  })
  async getProductBySlug(
    @Param('shopSlug') shopSlug: string,
    @Param('productSlug') productSlug: string,
  ) {
    return this.catalogService.findProductBySlug(shopSlug, productSlug);
  }

  @Get('categories')
  @ApiOperation({
    summary: 'Liste des catégories disponibles',
    description: 'Récupère toutes les catégories ou filtre par boutique.',
  })
  @ApiQuery({ name: 'shopSlug', required: false, description: 'Slug de boutique optionnel' })
  async getCategories(@Query('shopSlug') shopSlug?: string) {
    return this.catalogService.getCategories(shopSlug);
  }

  // ----------------------------------------------------------------------------
  // ROUTES VENDEUR (Dev 2 - SaaS Commerçant)
  // ----------------------------------------------------------------------------

  @Post('products')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.VENDOR)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Ajouter un nouveau produit (Vendeur)',
    description: 'Crée un produit dans la boutique du marchand avec prix strict en FCFA et stock physique.',
  })
  @ApiResponse({
    status: 201,
    description: 'Produit créé avec succès',
  })
  @ApiResponse({
    status: 409,
    description: 'Un produit avec ce nom existe déjà dans votre boutique',
  })
  async createProduct(
    @CurrentUser('id') vendorId: string,
    @Body() dto: CreateProductDto,
  ) {
    return this.catalogService.createProduct(vendorId, dto);
  }

  @Patch('products/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.VENDOR)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Modifier un produit existant (Vendeur)',
    description: 'Permet au commerçant de mettre à jour les informations de son produit avec vérification d’ownership.',
  })
  @ApiResponse({
    status: 200,
    description: 'Produit mis à jour avec succès',
  })
  @ApiResponse({
    status: 403,
    description: 'Ce produit appartient à un autre marchand',
  })
  async updateProduct(
    @CurrentUser('id') vendorId: string,
    @Param('id') productId: string,
    @Body() dto: UpdateProductDto,
  ) {
    return this.catalogService.updateProduct(vendorId, productId, dto);
  }

  @Patch('products/:id/stock')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.VENDOR)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Ajuster rapidement le stock physique (Vendeur)',
    description: 'Mise à jour rapide de la quantité en stock depuis le tableau de bord.',
  })
  @ApiResponse({
    status: 200,
    description: 'Stock mis à jour avec succès',
  })
  async updateStock(
    @CurrentUser('id') vendorId: string,
    @Param('id') productId: string,
    @Body() dto: UpdateStockDto,
  ) {
    return this.catalogService.updateStock(vendorId, productId, dto.stock);
  }

  @Delete('products/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.VENDOR)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Supprimer un produit (Vendeur)',
    description: 'Supprime un produit de sa propre boutique.',
  })
  @ApiResponse({
    status: 200,
    description: 'Produit supprimé avec succès',
  })
  async deleteProduct(
    @CurrentUser('id') vendorId: string,
    @Param('id') productId: string,
  ) {
    return this.catalogService.deleteProduct(vendorId, productId);
  }

  @Post('categories')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.VENDOR)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Créer une catégorie personnalisée pour sa boutique (Vendeur)',
    description: 'Permet au marchand d’organiser son catalogue selon ses spécialités.',
  })
  @ApiResponse({
    status: 201,
    description: 'Catégorie créée avec succès',
  })
  async createCategory(
    @CurrentUser('id') vendorId: string,
    @Body() dto: CreateCategoryDto,
  ) {
    return this.catalogService.createCategory(vendorId, dto);
  }
}
