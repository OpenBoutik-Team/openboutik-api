import {
  Controller,
  Get,
  Post,
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
} from '@nestjs/swagger';
import { ReviewsService } from './reviews.service';
import { CreateReviewDto } from './dto/create-review.dto';
import { ReplyReviewDto } from './dto/reply-review.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Role } from '../generated/prisma/client';

@ApiTags('Avis Clients & Modération')
@Controller()
export class ReviewsController {
  constructor(private readonly reviewsService: ReviewsService) {}

  @Post('products/:productId/reviews')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.CLIENT)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Déposer un avis et une note sur un article (Client / Achat Vérifié)',
    description: 'Permet à un acheteur de noter de 1 à 5 étoiles et commenter un produit reçu. Nécessite une commande livrée et confirmée (statut DELIVERED_CONFIRMED).',
  })
  @ApiResponse({ status: 201, description: 'Avis enregistré avec succès' })
  @ApiResponse({ status: 400, description: 'Requête invalide' })
  @ApiResponse({ status: 403, description: 'Achat non vérifié ou commande non encore livrée' })
  @ApiResponse({ status: 404, description: 'Produit introuvable' })
  @ApiResponse({ status: 409, description: 'Avis déjà déposé par ce client sur ce produit' })
  createReview(
    @CurrentUser('id') userId: string,
    @Param('productId') productId: string,
    @Body() dto: CreateReviewDto,
  ) {
    return this.reviewsService.createReview(userId, productId, dto);
  }

  @Get('products/:productId/reviews')
  @ApiOperation({
    summary: 'Consulter la liste des avis et la note moyenne d’un article (Public)',
    description: 'Retourne la note moyenne sur 5, le nombre total d’avis, les commentaires avec prénom anonymisé et la réponse du vendeur si présente.',
  })
  @ApiResponse({ status: 200, description: 'Avis du produit récupérés' })
  @ApiResponse({ status: 404, description: 'Produit introuvable' })
  getProductReviews(@Param('productId') productId: string) {
    return this.reviewsService.getProductReviews(productId);
  }

  @Patch('reviews/:id/reply')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.VENDOR, Role.SUPER_ADMIN)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Répondre officiellement à un avis client (Vendeur / BOLA)',
    description: 'Permet au commerçant propriétaire de la boutique de publier une réponse publique sous un avis client.',
  })
  @ApiResponse({ status: 200, description: 'Réponse enregistrée avec succès' })
  @ApiResponse({ status: 403, description: 'Accès refusé : avis lié au produit d’une autre boutique' })
  @ApiResponse({ status: 404, description: 'Avis introuvable' })
  replyToReview(
    @CurrentUser('id') vendorId: string,
    @Param('id') reviewId: string,
    @Body() dto: ReplyReviewDto,
  ) {
    return this.reviewsService.replyToReview(vendorId, reviewId, dto);
  }
}
