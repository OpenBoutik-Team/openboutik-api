import {
  Controller,
  Post,
  Delete,
  Get,
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
import { WishlistService } from './wishlist.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@ApiTags('Favoris Client (Wishlist)')
@Controller('wishlist')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth('JWT-auth')
export class WishlistController {
  constructor(private readonly wishlistService: WishlistService) {}

  @Post(':productId')
  @ApiOperation({
    summary: 'Ajouter un produit aux favoris',
    description: 'Enregistre un produit dans la liste de souhaits de l’acheteur connecté.',
  })
  @ApiParam({
    name: 'productId',
    description: 'Identifiant UUID du produit',
  })
  @ApiResponse({
    status: 201,
    description: 'Produit ajouté aux favoris',
  })
  @ApiResponse({
    status: 404,
    description: 'Produit introuvable ou non publié',
  })
  @ApiResponse({
    status: 409,
    description: 'Produit déjà présent dans les favoris',
  })
  async addToWishlist(
    @CurrentUser('id') userId: string,
    @Param('productId') productId: string,
  ) {
    return this.wishlistService.addToWishlist(userId, productId);
  }

  @Delete(':productId')
  @ApiOperation({
    summary: 'Retirer un produit des favoris',
    description: 'Supprime un produit de la liste de souhaits de l’acheteur connecté.',
  })
  @ApiParam({
    name: 'productId',
    description: 'Identifiant UUID du produit',
  })
  @ApiResponse({
    status: 200,
    description: 'Produit retiré des favoris avec succès',
  })
  @ApiResponse({
    status: 404,
    description: 'Le produit n’était pas dans les favoris',
  })
  async removeFromWishlist(
    @CurrentUser('id') userId: string,
    @Param('productId') productId: string,
  ) {
    return this.wishlistService.removeFromWishlist(userId, productId);
  }

  @Get()
  @ApiOperation({
    summary: 'Consulter mes favoris',
    description:
      'Retourne la liste complète des produits enregistrés en favoris par l’acheteur connecté.',
  })
  @ApiResponse({
    status: 200,
    description: 'Liste des favoris retournée avec succès',
  })
  async getMyWishlist(@CurrentUser('id') userId: string) {
    return this.wishlistService.getMyWishlist(userId);
  }
}
