import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Query,
  Res,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger';
import type { Response } from 'express';
import { OrdersService } from './orders.service';
import { CheckoutDto } from './dto/checkout.dto';
import { ConfirmDeliveryDto } from './dto/confirm-delivery.dto';
import { CreateOrderNoteDto } from './dto/create-order-note.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Role, OrderStatus } from '../generated/prisma/client';

@ApiTags('Commandes & Séquestre')
@Controller('orders')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth('JWT-auth')
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Post('checkout')
  @Roles(Role.CLIENT)
  @ApiOperation({
    summary: 'Passer commande (Checkout multi-boutiques avec séquestre Wave/OM)',
    description: 'Valide le panier, réserve les stocks, découpe automatiquement les commandes par boutique et bloque les fonds sur le compte séquestre OpenBoutik.',
  })
  @ApiResponse({
    status: 201,
    description: 'Commande créée et fonds séquestrés avec succès',
  })
  @ApiResponse({
    status: 400,
    description: 'Panier vide ou rupture de stock sur un produit',
  })
  async checkout(
    @CurrentUser('id') clientId: string,
    @Body() dto: CheckoutDto,
  ) {
    return this.ordersService.checkout(clientId, dto);
  }

  @Get('client/me')
  @Roles(Role.CLIENT)
  @ApiOperation({
    summary: 'Historique des commandes de l’acheteur connecté (Dev 1 - Marketplace)',
    description: 'Renvoie toutes les commandes passées par le client avec leurs statuts, suivis Tiak-Tiak et codes de confirmation.',
  })
  @ApiResponse({
    status: 200,
    description: 'Historique des commandes récupéré avec succès',
  })
  async getClientOrders(@CurrentUser('id') clientId: string) {
    return this.ordersService.getClientOrders(clientId);
  }

  @Get('vendor/me')
  @Roles(Role.VENDOR)
  @ApiOperation({
    summary: 'Commandes reçues par la boutique du marchand connecté (Dev 2 - Espace Vendeur)',
    description: 'Liste des commandes à préparer, expédiées ou livrées pour la boutique du vendeur.',
  })
  @ApiQuery({
    name: 'status',
    required: false,
    enum: OrderStatus,
    description: 'Filtrer par statut (ex: PAID_ESCROW, SHIPPED_TIAK_TIAK)',
  })
  @ApiResponse({
    status: 200,
    description: 'Commandes vendeur récupérées avec succès',
  })
  async getVendorOrders(
    @CurrentUser('id') vendorId: string,
    @Query('status') status?: OrderStatus,
  ) {
    return this.ordersService.getVendorOrders(vendorId, status);
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Détails d’une commande par son identifiant',
    description: 'Accessible par l’acheteur, le commerçant concerné ou le Super-Admin.',
  })
  @ApiResponse({
    status: 200,
    description: 'Détails complets de la commande',
  })
  @ApiResponse({
    status: 403,
    description: 'Accès non autorisé à cette commande',
  })
  async getOrderById(
    @Param('id') orderId: string,
    @CurrentUser('id') userId: string,
    @CurrentUser('role') role: Role,
  ) {
    return this.ordersService.getOrderById(orderId, userId, role);
  }

  @Patch(':id/prepare')
  @Roles(Role.VENDOR)
  @ApiOperation({
    summary: 'Prendre en charge la préparation du colis (Vendeur)',
    description: 'Passe la commande du statut PAID_ESCROW au statut PREPARING.',
  })
  async prepareOrder(
    @Param('id') orderId: string,
    @CurrentUser('id') vendorId: string,
  ) {
    return this.ordersService.prepareOrder(orderId, vendorId);
  }

  @Patch(':id/ship')
  @Roles(Role.VENDOR)
  @ApiOperation({
    summary: 'Déclarer la remise au livreur Tiak-Tiak (Vendeur)',
    description: 'Passe la commande au statut SHIPPED_TIAK_TIAK et déclenche le compte à rebours de sécurité de 24h.',
  })
  async shipOrder(
    @Param('id') orderId: string,
    @CurrentUser('id') vendorId: string,
  ) {
    return this.ordersService.shipOrder(orderId, vendorId);
  }

  @Post(':id/confirm-delivery')
  @ApiOperation({
    summary: 'Confirmer la réception et débloquer les fonds du séquestre (Client ou Vendeur/Livreur)',
    description: 'Débloque les fonds séquestrés vers le solde disponible du vendeur en transaction ACID. Le client peut cliquer directement ; le vendeur ou livreur doit fournir le code OTP à 6 chiffres.',
  })
  @ApiResponse({
    status: 200,
    description: 'Livraison confirmée et argent débloqué sur le portefeuille du marchand',
  })
  @ApiResponse({
    status: 400,
    description: 'Code OTP invalide ou commande sous litige',
  })
  async confirmDelivery(
    @Param('id') orderId: string,
    @CurrentUser('id') userId: string,
    @CurrentUser('role') role: Role,
    @Body() dto: ConfirmDeliveryDto,
  ) {
    return this.ordersService.confirmDelivery(orderId, userId, role, dto);
  }

  @Get(':id/invoice')
  @ApiOperation({
    summary: 'Télécharger le reçu / facture officiel PDF (Streaming binaire)',
    description: 'Génère à la volée le reçu PDF avec logo, détails boutique, articles, code promo éventuel et mention séquestre.',
  })
  @ApiResponse({
    status: 200,
    description: 'Fichier PDF streamé en direct',
  })
  @ApiResponse({
    status: 403,
    description: 'Accès non autorisé à cette facture',
  })
  async getOrderInvoice(
    @Param('id') orderId: string,
    @CurrentUser('id') userId: string,
    @CurrentUser('role') role: Role,
    @Res() res: Response,
  ) {
    return this.ordersService.generateInvoicePdf(orderId, userId, role, res);
  }

  @Post(':id/notes')
  @Roles(Role.VENDOR, Role.SUPER_ADMIN)
  @ApiOperation({
    summary: 'Ajouter un mémo interne vendeur sur une commande',
    description: 'Enregistre une note confidentielle visible uniquement par le commerçant et l’administration (invisible pour l’acheteur).',
  })
  @ApiResponse({
    status: 201,
    description: 'Mémo interne enregistré avec succès',
  })
  @ApiResponse({
    status: 403,
    description: 'Accès refusé : vous n’êtes pas le commerçant associé à cette commande',
  })
  async addOrderNote(
    @Param('id') orderId: string,
    @CurrentUser('id') vendorId: string,
    @Body() dto: CreateOrderNoteDto,
  ) {
    return this.ordersService.addOrderNote(orderId, vendorId, dto);
  }

  @Get(':id/notes')
  @Roles(Role.VENDOR, Role.SUPER_ADMIN)
  @ApiOperation({
    summary: 'Consulter l’historique des mémos internes vendeur d’une commande',
    description: 'Récupère la liste chronologique des mémos internes (strictement interdit aux clients acheteurs).',
  })
  @ApiResponse({
    status: 200,
    description: 'Historique des mémos internes retourné',
  })
  @ApiResponse({
    status: 403,
    description: 'Accès refusé',
  })
  async getOrderNotes(
    @Param('id') orderId: string,
    @CurrentUser('id') userId: string,
    @CurrentUser('role') role: Role,
  ) {
    return this.ordersService.getOrderNotes(orderId, userId, role);
  }
}
