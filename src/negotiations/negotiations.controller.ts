import {
  Controller,
  Post,
  Get,
  Patch,
  Body,
  Param,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
} from '@nestjs/swagger';
import { NegotiationsService } from './negotiations.service';
import { CreateNegotiationDto } from './dto/create-negotiation.dto';
import { RespondNegotiationDto } from './dto/respond-negotiation.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Role } from '../generated/prisma/client';

@ApiTags('Le Wakhale Numérique (Négociation de Prix)')
@Controller('negotiations')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth('JWT-auth')
export class NegotiationsController {
  constructor(private readonly negotiationsService: NegotiationsService) {}

  @Post()
  @Roles(Role.CLIENT)
  @ApiOperation({
    summary: 'Proposer une offre de prix sur un article (Client)',
    description:
      'Initie un marchandage culturel sur un produit. Règle anti-abus : l’offre doit être comprise entre 50% et 99% du prix initial.',
  })
  @ApiResponse({
    status: 201,
    description: 'Offre de négociation créée avec succès (statut PENDING)',
  })
  @ApiResponse({
    status: 400,
    description: 'Offre trop basse (< 50%) ou supérieure au prix initial',
  })
  @ApiResponse({
    status: 409,
    description: 'Une négociation est déjà en cours pour ce produit',
  })
  async createNegotiation(
    @CurrentUser('id') buyerId: string,
    @Body() dto: CreateNegotiationDto,
  ) {
    return this.negotiationsService.createNegotiation(buyerId, dto);
  }

  @Get('my')
  @Roles(Role.CLIENT)
  @ApiOperation({
    summary: 'Consulter mes offres de négociation (Client)',
    description:
      'Retourne toutes les offres de prix initiées par l’acheteur connecté avec leurs statuts et coupons générés.',
  })
  @ApiResponse({
    status: 200,
    description: 'Liste des négociations retournée avec succès',
  })
  async getMyNegotiations(@CurrentUser('id') buyerId: string) {
    return this.negotiationsService.getMyNegotiations(buyerId);
  }

  @Get('shop')
  @Roles(Role.VENDOR)
  @ApiOperation({
    summary: 'Consulter les offres reçues par ma boutique (Vendeur)',
    description:
      'Retourne l’historique des propositions de prix soumises par les clients sur les articles du marchand.',
  })
  @ApiResponse({
    status: 200,
    description: 'Liste des offres reçues retournée avec succès',
  })
  async getShopNegotiations(@CurrentUser('id') vendorId: string) {
    return this.negotiationsService.getShopNegotiations(vendorId);
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Détail d’une négociation',
    description:
      'Accessible uniquement par l’acheteur à l’origine de l’offre ou le commerçant concerné (protection BOLA).',
  })
  @ApiParam({
    name: 'id',
    description: 'Identifiant UUID de la négociation',
  })
  @ApiResponse({
    status: 200,
    description: 'Détails de la négociation retournés',
  })
  @ApiResponse({
    status: 403,
    description: 'Accès non autorisé à cette négociation',
  })
  async getNegotiationById(
    @CurrentUser('id') userId: string,
    @Param('id') negotiationId: string,
  ) {
    return this.negotiationsService.getNegotiationById(userId, negotiationId);
  }

  @Patch(':id/respond')
  @Roles(Role.VENDOR)
  @ApiOperation({
    summary: 'Répondre à une offre de prix (Vendeur)',
    description:
      'Permet d’accepter (génère un coupon dynamique automatique), refuser ou proposer une contre-offre au client.',
  })
  @ApiParam({
    name: 'id',
    description: 'Identifiant UUID de la négociation',
  })
  @ApiResponse({
    status: 200,
    description: 'Réponse enregistrée avec succès',
  })
  @ApiResponse({
    status: 403,
    description: 'Vous n’êtes pas le propriétaire de cette boutique',
  })
  async respondNegotiation(
    @CurrentUser('id') vendorId: string,
    @Param('id') negotiationId: string,
    @Body() dto: RespondNegotiationDto,
  ) {
    return this.negotiationsService.respondNegotiation(
      vendorId,
      negotiationId,
      dto,
    );
  }

  @Patch(':id/accept-counter')
  @Roles(Role.CLIENT)
  @ApiOperation({
    summary: 'Accepter la contre-offre du vendeur (Client)',
    description:
      'Passe la négociation en ACCEPTED et génère immédiatement le coupon de réduction dynamique pour finaliser la commande.',
  })
  @ApiParam({
    name: 'id',
    description: 'Identifiant UUID de la négociation',
  })
  @ApiResponse({
    status: 200,
    description: 'Contre-offre acceptée et coupon promo généré',
  })
  async acceptCounterOffer(
    @CurrentUser('id') buyerId: string,
    @Param('id') negotiationId: string,
  ) {
    return this.negotiationsService.acceptCounterOffer(buyerId, negotiationId);
  }
}
