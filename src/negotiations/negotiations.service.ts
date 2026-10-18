import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateNegotiationDto } from './dto/create-negotiation.dto';
import {
  RespondNegotiationDto,
  NegotiationResponseAction,
} from './dto/respond-negotiation.dto';
import {
  NegotiationStatus,
  CouponType,
} from '../generated/prisma/client';

@Injectable()
export class NegotiationsService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * 1. Proposer une offre de prix (« Wakhale ») sur un article
   */
  async createNegotiation(buyerId: string, dto: CreateNegotiationDto) {
    const product = await this.prisma.product.findUnique({
      where: { id: dto.productId },
      include: { shop: true },
    });

    if (!product || !product.isPublished) {
      throw new NotFoundException('Produit introuvable ou indisponible.');
    }

    if (product.shop.ownerId === buyerId) {
      throw new BadRequestException(
        'Vous ne pouvez pas négocier un article de votre propre boutique.',
      );
    }

    // Règle anti-abus : proposedPriceFcfa doit être < prix initial et >= 50% du prix
    if (dto.proposedPriceFcfa >= product.priceFcfa) {
      throw new BadRequestException(
        `L’offre (${dto.proposedPriceFcfa} FCFA) doit être strictement inférieure au prix catalogue (${product.priceFcfa} FCFA).`,
      );
    }

    const minAllowedPrice = Math.ceil(product.priceFcfa * 0.5);
    if (dto.proposedPriceFcfa < minAllowedPrice) {
      throw new BadRequestException(
        `L’offre (${dto.proposedPriceFcfa} FCFA) ne peut pas être inférieure à 50% du prix initial (${minAllowedPrice} FCFA).`,
      );
    }

    // Vérifier si une négociation active existe déjà pour ce couple (produit, acheteur)
    const existingActive = await this.prisma.priceNegotiation.findFirst({
      where: {
        productId: product.id,
        buyerId,
        status: {
          in: [NegotiationStatus.PENDING, NegotiationStatus.COUNTER_OFFERED],
        },
        expiresAt: {
          gt: new Date(),
        },
      },
    });

    if (existingActive) {
      throw new ConflictException(
        'Une négociation est déjà en cours pour cet article avec cette boutique.',
      );
    }

    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 heures de validité

    const negotiation = await this.prisma.priceNegotiation.create({
      data: {
        productId: product.id,
        buyerId,
        shopId: product.shopId,
        originalPriceFcfa: product.priceFcfa,
        proposedPriceFcfa: dto.proposedPriceFcfa,
        status: NegotiationStatus.PENDING,
        expiresAt,
      },
      include: {
        product: {
          select: {
            id: true,
            name: true,
            slug: true,
            priceFcfa: true,
            images: true,
          },
        },
        shop: {
          select: {
            id: true,
            name: true,
            slug: true,
            logoUrl: true,
            whatsappNumber: true,
          },
        },
      },
    });

    return negotiation;
  }

  /**
   * 2. Répondre à une offre en tant que commerçant (Accepter, Refuser, Contre-offre)
   */
  async respondNegotiation(
    vendorId: string,
    negotiationId: string,
    dto: RespondNegotiationDto,
  ) {
    const negotiation = await this.prisma.priceNegotiation.findUnique({
      where: { id: negotiationId },
      include: {
        shop: true,
        product: true,
        buyer: {
          select: { id: true, fullName: true, phone: true },
        },
      },
    });

    if (!negotiation) {
      throw new NotFoundException('Négociation introuvable.');
    }

    // Contrôle BOLA strict : seul le propriétaire de la boutique peut répondre
    if (negotiation.shop.ownerId !== vendorId) {
      throw new ForbiddenException(
        'Accès refusé : vous n’êtes pas le commerçant associé à cette négociation.',
      );
    }

    if (
      negotiation.status !== NegotiationStatus.PENDING &&
      negotiation.status !== NegotiationStatus.COUNTER_OFFERED
    ) {
      throw new BadRequestException(
        `Cette négociation ne peut plus être modifiée (statut actuel : ${negotiation.status}).`,
      );
    }

    if (new Date() > negotiation.expiresAt) {
      await this.prisma.priceNegotiation.update({
        where: { id: negotiation.id },
        data: { status: NegotiationStatus.EXPIRED },
      });
      throw new BadRequestException('Cette offre de négociation a expiré.');
    }

    // Cas 1 : Refus pur et simple
    if (dto.action === NegotiationResponseAction.REJECT) {
      return this.prisma.priceNegotiation.update({
        where: { id: negotiation.id },
        data: { status: NegotiationStatus.REJECTED },
        include: { product: true, shop: true },
      });
    }

    // Cas 2 : Contre-offre du vendeur
    if (dto.action === NegotiationResponseAction.COUNTER_OFFER) {
      if (!dto.counterPriceFcfa) {
        throw new BadRequestException(
          'Veuillez spécifier le montant de votre contre-offre en FCFA.',
        );
      }

      if (
        dto.counterPriceFcfa <= negotiation.proposedPriceFcfa ||
        dto.counterPriceFcfa >= negotiation.originalPriceFcfa
      ) {
        throw new BadRequestException(
          `La contre-offre (${dto.counterPriceFcfa} FCFA) doit être strictement supérieure à l’offre client (${negotiation.proposedPriceFcfa} FCFA) et inférieure au prix initial (${negotiation.originalPriceFcfa} FCFA).`,
        );
      }

      return this.prisma.priceNegotiation.update({
        where: { id: negotiation.id },
        data: {
          counterPriceFcfa: dto.counterPriceFcfa,
          status: NegotiationStatus.COUNTER_OFFERED,
          expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // Relance de 24h
        },
        include: { product: true, shop: true },
      });
    }

    // Cas 3 : Acceptation par le vendeur -> Génération automatique du Coupon dynamique
    if (dto.action === NegotiationResponseAction.ACCEPT) {
      const discountValue =
        negotiation.originalPriceFcfa - negotiation.proposedPriceFcfa;
      const couponCode = `WAKHALE-${Math.random()
        .toString(36)
        .substring(2, 8)
        .toUpperCase()}`;

      return this.prisma.$transaction(async (tx) => {
        const coupon = await tx.coupon.create({
          data: {
            shopId: negotiation.shopId,
            code: couponCode,
            type: CouponType.FIXED_FCFA,
            value: discountValue,
            maxUses: 1,
            expiryDate: new Date(Date.now() + 24 * 60 * 60 * 1000),
            isActive: true,
          },
        });

        const updated = await tx.priceNegotiation.update({
          where: { id: negotiation.id },
          data: {
            status: NegotiationStatus.ACCEPTED,
            generatedCouponId: coupon.id,
          },
          include: {
            product: true,
            shop: true,
            generatedCoupon: true,
          },
        });

        return updated;
      });
    }

    throw new BadRequestException('Action non reconnue.');
  }

  /**
   * 3. L'acheteur accepte la contre-offre du vendeur
   */
  async acceptCounterOffer(buyerId: string, negotiationId: string) {
    const negotiation = await this.prisma.priceNegotiation.findUnique({
      where: { id: negotiationId },
      include: {
        shop: true,
        product: true,
      },
    });

    if (!negotiation) {
      throw new NotFoundException('Négociation introuvable.');
    }

    if (negotiation.buyerId !== buyerId) {
      throw new ForbiddenException(
        'Accès refusé : vous n’êtes pas l’acheteur à l’origine de cette proposition.',
      );
    }

    if (negotiation.status !== NegotiationStatus.COUNTER_OFFERED) {
      throw new BadRequestException(
        'Aucune contre-offre en attente d’acceptation sur cette négociation.',
      );
    }

    if (!negotiation.counterPriceFcfa) {
      throw new BadRequestException(
        'Erreur d’état : aucune contre-offre chiffrée n’a été enregistrée.',
      );
    }

    if (new Date() > negotiation.expiresAt) {
      await this.prisma.priceNegotiation.update({
        where: { id: negotiation.id },
        data: { status: NegotiationStatus.EXPIRED },
      });
      throw new BadRequestException('Cette contre-offre a expiré.');
    }

    const discountValue =
      negotiation.originalPriceFcfa - negotiation.counterPriceFcfa;
    const couponCode = `WAKHALE-${Math.random()
      .toString(36)
      .substring(2, 8)
      .toUpperCase()}`;

    return this.prisma.$transaction(async (tx) => {
      const coupon = await tx.coupon.create({
        data: {
          shopId: negotiation.shopId,
          code: couponCode,
          type: CouponType.FIXED_FCFA,
          value: discountValue,
          maxUses: 1,
          expiryDate: new Date(Date.now() + 24 * 60 * 60 * 1000),
          isActive: true,
        },
      });

      const updated = await tx.priceNegotiation.update({
        where: { id: negotiation.id },
        data: {
          status: NegotiationStatus.ACCEPTED,
          generatedCouponId: coupon.id,
        },
        include: {
          product: true,
          shop: true,
          generatedCoupon: true,
        },
      });

      return updated;
    });
  }

  /**
   * 4. Consulter l'historique de ses négociations (Acheteur)
   */
  async getMyNegotiations(buyerId: string) {
    return this.prisma.priceNegotiation.findMany({
      where: { buyerId },
      orderBy: { createdAt: 'desc' },
      include: {
        product: {
          select: {
            id: true,
            name: true,
            slug: true,
            priceFcfa: true,
            images: true,
          },
        },
        shop: {
          select: {
            id: true,
            name: true,
            slug: true,
            logoUrl: true,
            whatsappNumber: true,
          },
        },
        generatedCoupon: true,
      },
    });
  }

  /**
   * 5. Consulter les négociations reçues par la boutique (Commerçant)
   */
  async getShopNegotiations(vendorId: string) {
    const shop = await this.prisma.shop.findUnique({
      where: { ownerId: vendorId },
    });

    if (!shop) {
      throw new ForbiddenException(
        'Vous devez posséder une boutique pour consulter les négociations.',
      );
    }

    return this.prisma.priceNegotiation.findMany({
      where: { shopId: shop.id },
      orderBy: { createdAt: 'desc' },
      include: {
        product: {
          select: {
            id: true,
            name: true,
            slug: true,
            priceFcfa: true,
            images: true,
          },
        },
        buyer: {
          select: {
            id: true,
            fullName: true,
            phone: true,
          },
        },
        generatedCoupon: true,
      },
    });
  }

  /**
   * 6. Consulter le détail d'une négociation (Acheteur ou Vendeur propriétaire)
   */
  async getNegotiationById(userId: string, negotiationId: string) {
    const negotiation = await this.prisma.priceNegotiation.findUnique({
      where: { id: negotiationId },
      include: {
        product: true,
        shop: true,
        buyer: {
          select: { id: true, fullName: true, phone: true },
        },
        generatedCoupon: true,
      },
    });

    if (!negotiation) {
      throw new NotFoundException('Négociation introuvable.');
    }

    const isBuyer = negotiation.buyerId === userId;
    const isVendor = negotiation.shop.ownerId === userId;

    if (!isBuyer && !isVendor) {
      throw new ForbiddenException(
        'Accès non autorisé à cette négociation de prix.',
      );
    }

    return negotiation;
  }
}
