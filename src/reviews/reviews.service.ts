import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateReviewDto } from './dto/create-review.dto';
import { ReplyReviewDto } from './dto/reply-review.dto';
import { OrderStatus } from '../generated/prisma/client';

@Injectable()
export class ReviewsService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Publication d'un avis client avec contrôle strict "Achat Vérifié" (DELIVERED_CONFIRMED)
   */
  async createReview(userId: string, productId: string, dto: CreateReviewDto) {
    const product = await this.prisma.product.findUnique({
      where: { id: productId },
    });

    if (!product) {
      throw new NotFoundException('Produit introuvable.');
    }

    // Unicité : 1 seul avis par produit et par client (409 Conflict si doublon)
    const existingReview = await this.prisma.review.findUnique({
      where: {
        productId_userId: {
          productId,
          userId,
        },
      },
    });

    if (existingReview) {
      throw new ConflictException(
        'Vous avez déjà déposé un avis sur cet article.',
      );
    }

    // Contrôle Anti-Fraude "Achat Vérifié" : Le client doit avoir reçu le produit (403 Forbidden)
    const verifiedOrder = await this.prisma.order.findFirst({
      where: {
        clientId: userId,
        status: OrderStatus.DELIVERED_CONFIRMED,
        items: {
          some: {
            productId,
          },
        },
      },
    });

    if (!verifiedOrder) {
      throw new ForbiddenException(
        'Achat non vérifié : Vous devez avoir commandé et reçu cet article (statut confirmé) pour déposer un avis.',
      );
    }

    return this.prisma.review.create({
      data: {
        productId,
        userId,
        orderId: verifiedOrder.id,
        rating: dto.rating,
        comment: dto.comment ? dto.comment.trim() : null,
        isApproved: true,
      },
      include: {
        user: {
          select: {
            id: true,
            fullName: true,
          },
        },
      },
    });
  }

  /**
   * Consultation publique des avis clients d'un produit avec moyenne et formatage
   */
  async getProductReviews(productId: string) {
    const product = await this.prisma.product.findUnique({
      where: { id: productId },
    });

    if (!product) {
      throw new NotFoundException('Produit introuvable.');
    }

    const reviews = await this.prisma.review.findMany({
      where: {
        productId,
        isApproved: true,
      },
      include: {
        user: {
          select: {
            id: true,
            fullName: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    const totalReviews = reviews.length;
    const averageRating =
      totalReviews > 0
        ? Math.round(
            (reviews.reduce((acc, r) => acc + r.rating, 0) / totalReviews) * 10,
          ) / 10
        : 0;

    const formattedReviews = reviews.map((r) => {
      const parts = r.user.fullName.trim().split(' ');
      const firstName = parts[0] || 'Client';
      const lastInitial =
        parts.length > 1 ? `${parts[parts.length - 1][0]}.` : '';
      const maskedName = `${firstName} ${lastInitial}`.trim();

      return {
        id: r.id,
        rating: r.rating,
        comment: r.comment,
        customerName: maskedName,
        vendorReply: r.vendorReply,
        repliedAt: r.repliedAt,
        createdAt: r.createdAt,
      };
    });

    return {
      productId,
      totalReviews,
      averageRating,
      reviews: formattedReviews,
    };
  }

  /**
   * Réponse officielle du commerçant à un avis (BOLA strict sur la boutique)
   */
  async replyToReview(vendorId: string, reviewId: string, dto: ReplyReviewDto) {
    const review = await this.prisma.review.findUnique({
      where: { id: reviewId },
      include: {
        product: {
          include: {
            shop: true,
          },
        },
      },
    });

    if (!review) {
      throw new NotFoundException('Avis introuvable.');
    }

    // Protection BOLA : Seul le vendeur propriétaire de la boutique peut répondre
    if (review.product.shop.ownerId !== vendorId) {
      throw new ForbiddenException(
        'Accès refusé : vous ne pouvez répondre qu’aux avis concernant les produits de votre propre boutique.',
      );
    }

    return this.prisma.review.update({
      where: { id: reviewId },
      data: {
        vendorReply: dto.reply.trim(),
        repliedAt: new Date(),
      },
    });
  }
}
