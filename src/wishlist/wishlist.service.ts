import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class WishlistService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * 1. Ajouter un produit aux favoris de l'acheteur
   */
  async addToWishlist(userId: string, productId: string) {
    const product = await this.prisma.product.findUnique({
      where: { id: productId },
    });

    if (!product || !product.isPublished) {
      throw new NotFoundException('Produit introuvable ou indisponible');
    }

    const existingItem = await this.prisma.wishlist.findUnique({
      where: {
        userId_productId: {
          userId,
          productId,
        },
      },
    });

    if (existingItem) {
      throw new ConflictException('Ce produit figure déjà dans vos favoris');
    }

    const item = await this.prisma.wishlist.create({
      data: {
        userId,
        productId,
      },
      include: {
        product: {
          include: {
            shop: {
              select: {
                id: true,
                name: true,
                slug: true,
                logoUrl: true,
                isVerified: true,
              },
            },
          },
        },
      },
    });

    return {
      success: true,
      message: 'Produit ajouté à vos favoris avec succès',
      item,
    };
  }

  /**
   * 2. Retirer un produit des favoris de l'acheteur
   */
  async removeFromWishlist(userId: string, productId: string) {
    const existingItem = await this.prisma.wishlist.findUnique({
      where: {
        userId_productId: {
          userId,
          productId,
        },
      },
    });

    if (!existingItem) {
      throw new NotFoundException('Ce produit ne figure pas dans vos favoris');
    }

    await this.prisma.wishlist.delete({
      where: {
        userId_productId: {
          userId,
          productId,
        },
      },
    });

    return {
      success: true,
      message: 'Produit retiré de vos favoris avec succès',
      productId,
    };
  }

  /**
   * 3. Récupérer tous les favoris de l'acheteur connecté
   */
  async getMyWishlist(userId: string) {
    const items = await this.prisma.wishlist.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      include: {
        product: {
          include: {
            shop: {
              select: {
                id: true,
                name: true,
                slug: true,
                logoUrl: true,
                isVerified: true,
              },
            },
          },
        },
      },
    });

    return {
      total: items.length,
      items,
    };
  }
}
