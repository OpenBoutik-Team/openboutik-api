import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateStreamDto } from './dto/create-stream.dto';
import { UpdateStreamStatusDto } from './dto/update-stream-status.dto';
import { QueryStreamsDto } from './dto/query-streams.dto';
import { StreamsGateway } from './streams.gateway';
import { StreamStatus, Prisma } from '../generated/prisma/client';

@Injectable()
export class StreamsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly streamsGateway: StreamsGateway,
  ) {}

  /**
   * 1. Créer une vidéo courte ou une session Live Shopping
   */
  async createStream(vendorId: string, dto: CreateStreamDto) {
    const shop = await this.prisma.shop.findUnique({
      where: { ownerId: vendorId },
    });

    if (!shop) {
      throw new ForbiddenException(
        'Vous devez posséder une boutique pour publier des flux vidéo ou lancer un Live.',
      );
    }

    // Contrôle BOLA strict : Vérifier que tous les produits rattachés appartiennent à la boutique du vendeur
    if (dto.productIds && dto.productIds.length > 0) {
      const ownedProductsCount = await this.prisma.product.count({
        where: {
          id: { in: dto.productIds },
          shopId: shop.id,
        },
      });

      if (ownedProductsCount !== dto.productIds.length) {
        throw new ForbiddenException(
          'Accès refusé : vous ne pouvez rattacher que des produits appartenant à votre propre boutique.',
        );
      }
    }

    const stream = await this.prisma.mediaStream.create({
      data: {
        shopId: shop.id,
        title: dto.title,
        description: dto.description,
        type: dto.type,
        status:
          dto.type === 'SHORT_VIDEO'
            ? StreamStatus.PUBLISHED
            : StreamStatus.SCHEDULED,
        mediaUrl: dto.mediaUrl,
        thumbnailUrl: dto.thumbnailUrl,
        streamProducts: dto.productIds
          ? {
              create: dto.productIds.map((productId) => ({
                productId,
                isPinned: false,
              })),
            }
          : undefined,
      },
      include: {
        shop: {
          select: {
            id: true,
            name: true,
            slug: true,
            logoUrl: true,
            whatsappNumber: true,
          },
        },
        streamProducts: {
          include: {
            product: {
              select: {
                id: true,
                name: true,
                slug: true,
                priceFcfa: true,
                compareAtPriceFcfa: true,
                images: true,
                stock: true,
              },
            },
          },
        },
      },
    });

    return stream;
  }

  /**
   * 2. Lister les flux vidéo et lives shopping (public)
   */
  async getStreams(query: QueryStreamsDto) {
    const page = Math.max(1, query.page || 1);
    const limit = Math.max(1, Math.min(50, query.limit || 20));
    const skip = (page - 1) * limit;

    const where: Prisma.MediaStreamWhereInput = {};

    if (query.type) {
      where.type = query.type;
    }
    if (query.status) {
      where.status = query.status;
    }
    if (query.shopId) {
      where.shopId = query.shopId;
    }

    const [total, items] = await Promise.all([
      this.prisma.mediaStream.count({ where }),
      this.prisma.mediaStream.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          shop: {
            select: {
              id: true,
              name: true,
              slug: true,
              logoUrl: true,
            },
          },
          streamProducts: {
            include: {
              product: {
                select: {
                  id: true,
                  name: true,
                  slug: true,
                  priceFcfa: true,
                  compareAtPriceFcfa: true,
                  images: true,
                },
              },
            },
          },
        },
      }),
    ]);

    return {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
      items,
    };
  }

  /**
   * 3. Consulter les détails d'un flux par son identifiant
   */
  async getStreamById(streamId: string) {
    const stream = await this.prisma.mediaStream.findUnique({
      where: { id: streamId },
      include: {
        shop: {
          select: {
            id: true,
            name: true,
            slug: true,
            logoUrl: true,
            whatsappNumber: true,
          },
        },
        streamProducts: {
          include: {
            product: {
              select: {
                id: true,
                name: true,
                slug: true,
                priceFcfa: true,
                compareAtPriceFcfa: true,
                images: true,
                stock: true,
              },
            },
          },
        },
      },
    });

    if (!stream) {
      throw new NotFoundException('Flux vidéo ou Live introuvable.');
    }

    // Incrémenter les vues de manière asynchrone
    await this.prisma.mediaStream.update({
      where: { id: stream.id },
      data: { viewsCount: { increment: 1 } },
    });

    return stream;
  }

  /**
   * 4. Modifier le statut d'un Live (Démarrer ou Terminer)
   */
  async updateStreamStatus(
    vendorId: string,
    streamId: string,
    dto: UpdateStreamStatusDto,
  ) {
    const stream = await this.prisma.mediaStream.findUnique({
      where: { id: streamId },
      include: { shop: true },
    });

    if (!stream) {
      throw new NotFoundException('Flux introuvable.');
    }

    // Contrôle BOLA strict
    if (stream.shop.ownerId !== vendorId) {
      throw new ForbiddenException(
        'Accès refusé : vous n’êtes pas le propriétaire de ce flux.',
      );
    }

    const data: Prisma.MediaStreamUpdateInput = {
      status: dto.status,
    };

    if (dto.status === StreamStatus.LIVE && !stream.startedAt) {
      data.startedAt = new Date();
    }
    if (dto.status === StreamStatus.ENDED) {
      data.endedAt = new Date();
    }

    return this.prisma.mediaStream.update({
      where: { id: stream.id },
      data,
      include: {
        shop: true,
        streamProducts: {
          include: { product: true },
        },
      },
    });
  }

  /**
   * 5. Épingler un produit en direct pendant un Live Shopping (avec broadcast WebSocket)
   */
  async pinProduct(vendorId: string, streamId: string, productId: string) {
    const stream = await this.prisma.mediaStream.findUnique({
      where: { id: streamId },
      include: {
        shop: true,
        streamProducts: {
          include: { product: true },
        },
      },
    });

    if (!stream) {
      throw new NotFoundException('Flux introuvable.');
    }

    // Contrôle BOLA strict
    if (stream.shop.ownerId !== vendorId) {
      throw new ForbiddenException(
        'Accès refusé : vous n’êtes pas le propriétaire de ce flux.',
      );
    }

    const streamProduct = stream.streamProducts.find(
      (sp) => sp.productId === productId,
    );

    if (!streamProduct) {
      throw new BadRequestException(
        'Ce produit n’est pas associé à ce flux vidéo.',
      );
    }

    // Retirer l'épingle des autres produits et épingler le produit cible
    await this.prisma.streamProduct.updateMany({
      where: { streamId: stream.id },
      data: { isPinned: false },
    });

    const updatedStreamProduct = await this.prisma.streamProduct.update({
      where: {
        streamId_productId: {
          streamId: stream.id,
          productId,
        },
      },
      data: { isPinned: true },
      include: { product: true },
    });

    // Émission temps réel vers tous les spectateurs du direct
    this.streamsGateway.broadcastProductPopup(
      stream.id,
      updatedStreamProduct.product,
    );

    return updatedStreamProduct;
  }

  /**
   * 6. Supprimer un flux
   */
  async deleteStream(vendorId: string, streamId: string) {
    const stream = await this.prisma.mediaStream.findUnique({
      where: { id: streamId },
      include: { shop: true },
    });

    if (!stream) {
      throw new NotFoundException('Flux introuvable.');
    }

    if (stream.shop.ownerId !== vendorId) {
      throw new ForbiddenException(
        'Accès refusé : vous n’êtes pas le propriétaire de ce flux.',
      );
    }

    await this.prisma.mediaStream.delete({
      where: { id: stream.id },
    });

    return {
      success: true,
      message: 'Flux supprimé avec succès.',
    };
  }
}
