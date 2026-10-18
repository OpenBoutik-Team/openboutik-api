import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { OrderStatus } from '../generated/prisma/client';

@Injectable()
export class AnalyticsService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Enregistre ou incrémente le compteur de visites journalier d'un produit
   */
  async recordProductView(productId: string) {
    const product = await this.prisma.product.findUnique({
      where: { id: productId },
    });

    if (!product) {
      throw new NotFoundException('Produit introuvable.');
    }

    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);

    return this.prisma.productView.upsert({
      where: {
        productId_date: {
          productId,
          date: today,
        },
      },
      create: {
        productId,
        date: today,
        count: 1,
      },
      update: {
        count: { increment: 1 },
      },
    });
  }

  /**
   * Retourne le Top 5 des produits les plus performants du marchand pour le mois en cours
   */
  async getTopProducts(vendorId: string) {
    const shop = await this.prisma.shop.findUnique({
      where: { ownerId: vendorId },
    });

    if (!shop) {
      throw new ForbiddenException(
        'Vous devez posséder une boutique pour consulter vos statistiques analytiques.',
      );
    }

    const now = new Date();
    const startOfMonth = new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1),
    );

    // Récupération de tous les produits de la boutique
    const products = await this.prisma.product.findMany({
      where: { shopId: shop.id },
      select: {
        id: true,
        name: true,
        slug: true,
        priceFcfa: true,
        compareAtPriceFcfa: true,
        stock: true,
        images: true,
        isPublished: true,
      },
    });

    if (products.length === 0) {
      return {
        period: `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, '0')}`,
        shopId: shop.id,
        topProducts: [],
      };
    }

    const productIds = products.map((p) => p.id);

    // Récupération des articles vendus sur des commandes confirmées / payées ce mois-ci
    const orderItems = await this.prisma.orderItem.findMany({
      where: {
        order: {
          shopId: shop.id,
          createdAt: { gte: startOfMonth },
          status: {
            in: [
              OrderStatus.PAID_ESCROW,
              OrderStatus.PREPARING,
              OrderStatus.SHIPPED_TIAK_TIAK,
              OrderStatus.DELIVERED_CONFIRMED,
            ],
          },
        },
        productId: { in: productIds },
      },
      select: {
        productId: true,
        quantity: true,
        totalPriceFcfa: true,
      },
    });

    // Récupération des vues journalières agrégées ce mois-ci
    const views = await this.prisma.productView.findMany({
      where: {
        productId: { in: productIds },
        date: { gte: startOfMonth },
      },
      select: {
        productId: true,
        count: true,
      },
    });

    // Calcul des indicateurs par produit
    const productStats = products.map((product) => {
      const items = orderItems.filter((item) => item.productId === product.id);
      const totalRevenueFcfa = items.reduce(
        (sum, item) => sum + item.totalPriceFcfa,
        0,
      );
      const totalUnitsSold = items.reduce(
        (sum, item) => sum + item.quantity,
        0,
      );

      const prodViews = views.filter((v) => v.productId === product.id);
      const totalViews = prodViews.reduce((sum, v) => sum + v.count, 0);

      const conversionRate =
        totalViews > 0
          ? Math.round((totalUnitsSold / totalViews) * 10000) / 100
          : 0;

      return {
        id: product.id,
        name: product.name,
        slug: product.slug,
        priceFcfa: product.priceFcfa,
        compareAtPriceFcfa: product.compareAtPriceFcfa,
        stock: product.stock,
        images: product.images,
        isPublished: product.isPublished,
        totalRevenueFcfa,
        totalUnitsSold,
        totalViews,
        conversionRate,
      };
    });

    // Tri décroissant : Chiffre d'affaires prioritaire, puis unités vendues
    productStats.sort((a, b) => {
      if (b.totalRevenueFcfa !== a.totalRevenueFcfa) {
        return b.totalRevenueFcfa - a.totalRevenueFcfa;
      }
      return b.totalUnitsSold - a.totalUnitsSold;
    });

    return {
      period: `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, '0')}`,
      shopId: shop.id,
      topProducts: productStats.slice(0, 5),
    };
  }
}
