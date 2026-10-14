import {
  Injectable,
  NotFoundException,
  ConflictException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
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

    return {
      data: products,
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

    return product;
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
        images: dto.images,
        isPublished: dto.isPublished !== undefined ? dto.isPublished : true,
      },
      include: {
        category: true,
      },
    });
  }

  /**
   * Modification d'un produit avec vérification d'ownership stricte
   */
  async updateProduct(ownerId: string, productId: string, dto: UpdateProductDto) {
    const product = await this.findAndVerifyOwnership(ownerId, productId);

    return this.prisma.product.update({
      where: { id: product.id },
      data: dto,
      include: {
        category: true,
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
