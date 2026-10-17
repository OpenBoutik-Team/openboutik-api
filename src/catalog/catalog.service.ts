import {
  Injectable,
  NotFoundException,
  ConflictException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { CreateProductVariantDto } from './dto/create-variant.dto';
import { UpdateProductVariantDto } from './dto/update-variant.dto';
import { Prisma } from '../generated/prisma/client';
import { QueryProductsDto, ProductSortBy } from './dto/query-products.dto';
import { CreateCategoryDto } from './dto/create-category.dto';

@Injectable()
export class CatalogService {
  constructor(private readonly prisma: PrismaService) {}

  // ----------------------------------------------------------------------------
  // CATÉGORIES
  // ----------------------------------------------------------------------------

  async getCategories(shopSlug?: string) {
    const where: Prisma.CategoryWhereInput = {};
    if (shopSlug) {
      where.shop = { slug: shopSlug.toLowerCase().trim() };
    }

    return this.prisma.category.findMany({
      where,
      include: {
        _count: {
          select: {
            products: {
              where: { isPublished: true },
            },
          },
        },
      },
      orderBy: { name: 'asc' },
    });
  }

  async createCategory(ownerId: string, dto: CreateCategoryDto) {
    const shop = await this.prisma.shop.findUnique({
      where: { ownerId },
    });

    if (!shop) {
      throw new NotFoundException('Boutique introuvable pour ce vendeur');
    }

    const slug = dto.slug
      ? dto.slug.toLowerCase().trim()
      : this.slugify(dto.name);

    const existing = await this.prisma.category.findUnique({
      where: {
        shopId_slug: {
          shopId: shop.id,
          slug,
        },
      },
    });

    if (existing) {
      throw new ConflictException('Une catégorie avec ce nom ou ce slug existe déjà dans votre boutique');
    }

    return this.prisma.category.create({
      data: {
        shopId: shop.id,
        name: dto.name,
        slug,
        imageUrl: dto.imageUrl,
      },
    });
  }

  // ----------------------------------------------------------------------------
  // PRODUITS
  // ----------------------------------------------------------------------------

  /**
   * Moteur de recherche et de filtres Marketplace paginé (Dev 1)
   */
  async findAllProducts(query: QueryProductsDto) {
    const page = Math.max(1, query.page || 1);
    const limit = Math.max(1, Math.min(50, query.limit || 12));
    const skip = (page - 1) * limit;

    const where: Prisma.ProductWhereInput = {
      isPublished: true,
      shop: { is: { isActive: true } },
    };

    if (query.shopSlug) {
      where.shop = {
        is: {
          isActive: true,
          slug: query.shopSlug.toLowerCase().trim(),
        },
      };
    }

    if (query.categorySlug) {
      where.category = {
        is: {
          slug: query.categorySlug.toLowerCase().trim(),
        },
      };
    }

    if (query.inStockOnly) {
      where.stock = { gt: 0 };
    }

    if (query.minPrice !== undefined || query.maxPrice !== undefined) {
      const priceFilter: Prisma.IntFilter = {};
      if (query.minPrice !== undefined) priceFilter.gte = query.minPrice;
      if (query.maxPrice !== undefined) priceFilter.lte = query.maxPrice;
      where.priceFcfa = priceFilter;
    }

    if (query.search) {
      where.OR = [
        { name: { contains: query.search } },
        { description: { contains: query.search } },
      ];
    }

    // Gestion du tri
    let orderBy: Prisma.ProductOrderByWithRelationInput = { createdAt: 'desc' };
    if (query.sortBy === ProductSortBy.PRICE_ASC) {
      orderBy = { priceFcfa: 'asc' };
    } else if (query.sortBy === ProductSortBy.PRICE_DESC) {
      orderBy = { priceFcfa: 'desc' };
    }

    const [total, products] = await Promise.all([
      this.prisma.product.count({ where }),
      this.prisma.product.findMany({
        where,
        skip,
        take: limit,
        orderBy,
        include: {
          category: {
            select: { id: true, name: true, slug: true },
          },
          variants: {
            where: { isActive: true },
            select: {
              id: true,
              sku: true,
              priceFcfa: true,
              compareAtPriceFcfa: true,
              stock: true,
              attributes: true,
            },
          },
          shop: {
            select: {
              id: true,
              name: true,
              slug: true,
              logoUrl: true,
              primaryColor: true,
              whatsappNumber: true,
              city: true,
              isVerified: true,
            },
          },
        },
      }),
    ]);

    const mappedProducts = products.map((p) => ({
      ...p,
      isLowStock: p.stock > 0 && p.stock <= p.lowStockThreshold,
    }));

    return {
      data: mappedProducts,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Fiche produit détaillée avec données de la boutique (Social Commerce WhatsApp)
   */
  async findProductBySlug(shopSlug: string, productSlug: string) {
    const product = await this.prisma.product.findFirst({
      where: {
        slug: productSlug.toLowerCase().trim(),
        shop: {
          slug: shopSlug.toLowerCase().trim(),
          isActive: true,
        },
      },
      include: {
        category: true,
        variants: {
          where: { isActive: true },
          orderBy: { priceFcfa: 'asc' },
        },
        reviews: {
          where: { isApproved: true },
          orderBy: { createdAt: 'desc' },
          take: 10,
          include: {
            user: {
              select: {
                id: true,
                fullName: true,
              },
            },
          },
        },
        shop: {
          select: {
            id: true,
            name: true,
            slug: true,
            logoUrl: true,
            bannerUrl: true,
            primaryColor: true,
            whatsappNumber: true,
            city: true,
            address: true,
            isVerified: true,
            subscriptionPlan: true,
          },
        },
      },
    });

    if (!product || !product.isPublished) {
      throw new NotFoundException(`Produit introuvable dans la boutique "${shopSlug}"`);
    }

    return {
      ...product,
      isLowStock: product.stock > 0 && product.stock <= product.lowStockThreshold,
    };
  }

  /**
   * Création d'un produit par le marchand connecté (Dev 2)
   */
  async createProduct(ownerId: string, dto: CreateProductDto) {
    const shop = await this.prisma.shop.findUnique({
      where: { ownerId },
    });

    if (!shop) {
      throw new NotFoundException('Boutique introuvable pour ce compte vendeur');
    }

    // Règle d'or : compareAtPriceFcfa doit être strictement supérieur au prix de vente
    if (dto.compareAtPriceFcfa !== undefined && dto.compareAtPriceFcfa !== null) {
      if (dto.compareAtPriceFcfa <= dto.priceFcfa) {
        throw new BadRequestException('Le prix barré doit être strictement supérieur au prix de vente actuel');
      }
    }

    const slug = dto.slug ? dto.slug.toLowerCase().trim() : this.slugify(dto.name);

    const existingProduct = await this.prisma.product.findUnique({
      where: {
        shopId_slug: {
          shopId: shop.id,
          slug,
        },
      },
    });

    if (existingProduct) {
      throw new ConflictException('Un produit avec ce nom ou ce slug existe déjà dans votre boutique');
    }

    return this.prisma.product.create({
      data: {
        shopId: shop.id,
        categoryId: dto.categoryId,
        name: dto.name,
        slug,
        description: dto.description,
        priceFcfa: dto.priceFcfa,
        compareAtPriceFcfa: dto.compareAtPriceFcfa,
        stock: dto.stock,
        lowStockThreshold: dto.lowStockThreshold ?? 0,
        images: dto.images,
        isPublished: dto.isPublished !== undefined ? dto.isPublished : true,
      },
      include: {
        category: true,
        variants: true,
      },
    });
  }

  /**
   * Modification d'un produit avec vérification d'ownership stricte
   */
  async updateProduct(ownerId: string, productId: string, dto: UpdateProductDto) {
    const product = await this.findAndVerifyOwnership(ownerId, productId);

    const targetPrice = dto.priceFcfa ?? product.priceFcfa;
    const targetCompare =
      dto.compareAtPriceFcfa !== undefined
        ? dto.compareAtPriceFcfa
        : product.compareAtPriceFcfa;

    if (targetCompare !== null && targetCompare !== undefined) {
      if (targetCompare <= targetPrice) {
        throw new BadRequestException('Le prix barré doit être strictement supérieur au prix de vente actuel');
      }
    }

    return this.prisma.product.update({
      where: { id: product.id },
      data: dto,
      include: {
        category: true,
        variants: true,
      },
    });
  }

  /**
   * Ajustement direct du stock physique
   */
  async updateStock(ownerId: string, productId: string, stock: number) {
    const product = await this.findAndVerifyOwnership(ownerId, productId);

    return this.prisma.product.update({
      where: { id: product.id },
      data: { stock },
    });
  }

  /**
   * Suppression d'un produit
   */
  async deleteProduct(ownerId: string, productId: string) {
    const product = await this.findAndVerifyOwnership(ownerId, productId);

    await this.prisma.product.delete({
      where: { id: product.id },
    });

    return { message: 'Produit supprimé avec succès' };
  }

  // ----------------------------------------------------------------------------
  // VARIANTES DE PRODUITS (TAILLES, COULEURS, ATTRIBUTS)
  // ----------------------------------------------------------------------------

  /**
   * Création d'une déclinaison / variante pour un produit existant (Dev 2)
   */
  async createVariant(ownerId: string, productId: string, dto: CreateProductVariantDto) {
    const product = await this.findAndVerifyOwnership(ownerId, productId);

    if (dto.compareAtPriceFcfa !== undefined && dto.compareAtPriceFcfa !== null) {
      if (dto.compareAtPriceFcfa <= dto.priceFcfa) {
        throw new BadRequestException('Le prix barré de la variante doit être strictement supérieur à son prix de vente');
      }
    }

    return this.prisma.productVariant.create({
      data: {
        productId: product.id,
        sku: dto.sku,
        priceFcfa: dto.priceFcfa,
        compareAtPriceFcfa: dto.compareAtPriceFcfa,
        stock: dto.stock,
        attributes: dto.attributes,
        isActive: dto.isActive !== undefined ? dto.isActive : true,
      },
    });
  }

  /**
   * Modification d'une déclinaison / variante
   */
  async updateVariant(ownerId: string, variantId: string, dto: UpdateProductVariantDto) {
    const variant = await this.prisma.productVariant.findUnique({
      where: { id: variantId },
      include: {
        product: {
          include: { shop: true },
        },
      },
    });

    if (!variant) {
      throw new NotFoundException('Variante introuvable');
    }

    if (variant.product.shop.ownerId !== ownerId) {
      throw new ForbiddenException('Vous n’avez pas le droit de modifier une variante appartenant à une autre boutique');
    }

    const targetPrice = dto.priceFcfa ?? variant.priceFcfa;
    const targetCompare =
      dto.compareAtPriceFcfa !== undefined
        ? dto.compareAtPriceFcfa
        : variant.compareAtPriceFcfa;

    if (targetCompare !== null && targetCompare !== undefined) {
      if (targetCompare <= targetPrice) {
        throw new BadRequestException('Le prix barré de la variante doit être strictement supérieur à son prix de vente');
      }
    }

    return this.prisma.productVariant.update({
      where: { id: variantId },
      data: dto,
    });
  }

  /**
   * Suppression d'une déclinaison / variante
   */
  async deleteVariant(ownerId: string, variantId: string) {
    const variant = await this.prisma.productVariant.findUnique({
      where: { id: variantId },
      include: {
        product: {
          include: { shop: true },
        },
      },
    });

    if (!variant) {
      throw new NotFoundException('Variante introuvable');
    }

    if (variant.product.shop.ownerId !== ownerId) {
      throw new ForbiddenException('Vous n’avez pas le droit de supprimer une variante appartenant à une autre boutique');
    }

    await this.prisma.productVariant.delete({
      where: { id: variantId },
    });

    return { message: 'Variante supprimée avec succès' };
  }

  // ----------------------------------------------------------------------------
  // ALERTES STOCK BAS (DEV 2)
  // ----------------------------------------------------------------------------

  /**
   * Liste des alertes de stock critique de la boutique
   */
  async getLowStockProducts(ownerId: string) {
    const shop = await this.prisma.shop.findUnique({
      where: { ownerId },
    });

    if (!shop) {
      throw new NotFoundException('Boutique introuvable pour ce compte vendeur');
    }

    const products = await this.prisma.product.findMany({
      where: {
        shopId: shop.id,
        isPublished: true,
      },
      include: {
        variants: {
          where: { isActive: true },
        },
      },
      orderBy: { stock: 'asc' },
    });

    const lowStockAlerts = [];

    for (const prod of products) {
      const isProductLow = prod.stock <= prod.lowStockThreshold;
      const criticalVariants = prod.variants.filter(
        (v) => v.stock <= prod.lowStockThreshold,
      );

      if (isProductLow || criticalVariants.length > 0) {
        lowStockAlerts.push({
          productId: prod.id,
          productName: prod.name,
          slug: prod.slug,
          currentStock: prod.stock,
          threshold: prod.lowStockThreshold,
          isProductOutOfStock: prod.stock === 0,
          isLowStock: isProductLow,
          variantsCount: prod.variants.length,
          criticalVariants: criticalVariants.map((v) => ({
            id: v.id,
            sku: v.sku,
            attributes: v.attributes,
            stock: v.stock,
            isOutOfStock: v.stock === 0,
          })),
        });
      }
    }

    return {
      shopId: shop.id,
      shopName: shop.name,
      totalAlerts: lowStockAlerts.length,
      alerts: lowStockAlerts,
    };
  }

  /**
   * Méthode d'isolation de sécurité : vérifie que le vendeur possède bien le produit
   */
  private async findAndVerifyOwnership(ownerId: string, productId: string) {
    const product = await this.prisma.product.findUnique({
      where: { id: productId },
      include: { shop: true },
    });

    if (!product) {
      throw new NotFoundException('Produit introuvable');
    }

    if (product.shop.ownerId !== ownerId) {
      throw new ForbiddenException('Vous n’avez pas le droit de modifier un produit appartenant à une autre boutique');
    }

    return product;
  }

  private slugify(text: string): string {
    return text
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)+/g, '');
  }
}
