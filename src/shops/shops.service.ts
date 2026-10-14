import {
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UpdateShopDto } from './dto/update-shop.dto';
import { Prisma, OrderStatus } from '../generated/prisma/client';

@Injectable()
export class ShopsService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Liste publique des boutiques actives sur la marketplace (Dev 1)
   */
  async getAllShops(query: { search?: string; isVerified?: boolean; city?: string }) {
    const where: Prisma.ShopWhereInput = { isActive: true };

    if (query.city) {
      where.city = { contains: query.city };
    }

    if (query.isVerified !== undefined) {
      where.isVerified = query.isVerified;
    }

    if (query.search) {
      where.OR = [
        { name: { contains: query.search } },
        { description: { contains: query.search } },
        { city: { contains: query.search } },
      ];
    }

    const shops = await this.prisma.shop.findMany({
      where,
      select: {
        id: true,
        name: true,
        slug: true,
        description: true,
        logoUrl: true,
        bannerUrl: true,
        primaryColor: true,
        whatsappNumber: true,
        city: true,
        isVerified: true,
        subscriptionPlan: true,
        createdAt: true,
        _count: {
          select: {
            products: {
              where: { isPublished: true },
            },
          },
        },
      },
      orderBy: [
        { isVerified: 'desc' },
        { createdAt: 'desc' },
      ],
    });

    return shops;
  }

  /**
   * Vitrine publique d'une boutique par son slug (Dev 1 - openboutik.sn/boutique/[slug])
   */
  async findBySlug(slug: string) {
    const shop = await this.prisma.shop.findUnique({
      where: { slug: slug.toLowerCase().trim() },
      include: {
        categories: {
          include: {
            _count: {
              select: {
                products: { where: { isPublished: true } },
              },
            },
          },
        },
        products: {
          where: { isPublished: true },
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!shop || !shop.isActive) {
      throw new NotFoundException(`La boutique "${slug}" est introuvable ou inactive`);
    }

    return shop;
  }

  /**
   * Tableau de bord complet du commerçant connecté (Dev 2 - openboutik-seller)
   */
  async getVendorDashboard(ownerId: string) {
    const shop = await this.prisma.shop.findUnique({
      where: { ownerId },
      include: {
        wallet: true,
        subscriptions: {
          where: { status: 'ACTIVE' },
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
      },
    });

    if (!shop) {
      throw new NotFoundException('Aucune boutique associée à ce compte vendeur');
    }

    // Agrégations statistiques pour le tableau de bord marchand
    const [
      totalProductsCount,
      outOfStockProductsCount,
      totalOrdersCount,
      pendingOrdersCount,
      shippedOrdersCount,
      deliveredOrdersCount,
    ] = await Promise.all([
      this.prisma.product.count({ where: { shopId: shop.id } }),
      this.prisma.product.count({ where: { shopId: shop.id, stock: 0 } }),
      this.prisma.order.count({ where: { shopId: shop.id } }),
      this.prisma.order.count({
        where: { shopId: shop.id, status: { in: [OrderStatus.PAID_ESCROW, OrderStatus.PREPARING] } },
      }),
      this.prisma.order.count({
        where: { shopId: shop.id, status: OrderStatus.SHIPPED_TIAK_TIAK },
      }),
      this.prisma.order.count({
        where: { shopId: shop.id, status: OrderStatus.DELIVERED_CONFIRMED },
      }),
    ]);

    return {
      shop,
      statistics: {
        products: {
          total: totalProductsCount,
          outOfStock: outOfStockProductsCount,
        },
        orders: {
          total: totalOrdersCount,
          pendingPreparation: pendingOrdersCount,
          inTransitTiakTiak: shippedOrdersCount,
          deliveredSuccess: deliveredOrdersCount,
        },
        financials: {
          escrowBalanceFcfa: shop.wallet?.escrowBalanceFcfa || 0,
          availableBalanceFcfa: shop.wallet?.availableBalanceFcfa || 0,
          totalEarnedFcfa: shop.wallet?.totalEarnedFcfa || 0,
        },
      },
    };
  }

  /**
   * Mise à jour de la boutique par son propriétaire
   */
  async updateVendorShop(ownerId: string, dto: UpdateShopDto) {
    const shop = await this.prisma.shop.findUnique({
      where: { ownerId },
    });

    if (!shop) {
      throw new NotFoundException('Boutique introuvable');
    }

    return this.prisma.shop.update({
      where: { id: shop.id },
      data: dto,
    });
  }

  /**
   * Certification / Validation d'une boutique par le Super-Admin
   */
  async verifyShop(shopId: string, isVerified: boolean, superAdminId: string, notes?: string) {
    const shop = await this.prisma.shop.findUnique({
      where: { id: shopId },
    });

    if (!shop) {
      throw new NotFoundException('Boutique introuvable');
    }

    const [updatedShop] = await this.prisma.$transaction([
      this.prisma.shop.update({
        where: { id: shopId },
        data: { isVerified },
      }),
      this.prisma.auditLog.create({
        data: {
          userId: superAdminId,
          action: isVerified ? 'SHOP_VERIFIED' : 'SHOP_UNVERIFIED',
          entityType: 'SHOP',
          entityId: shopId,
          metadata: {
            shopName: shop.name,
            slug: shop.slug,
            notes,
          },
        },
      }),
    ]);

    return updatedShop;
  }
}
