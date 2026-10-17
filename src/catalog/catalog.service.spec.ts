import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { CatalogService } from './catalog.service';
import { PrismaService } from '../prisma/prisma.service';

describe('CatalogService (Unit Tests)', () => {
  let catalogService: CatalogService;
  let mockPrismaService: any;

  const mockShop = {
    id: 'shop-1',
    ownerId: 'vendor-1',
    name: 'Teranga Mode',
    slug: 'teranga-mode',
  };

  beforeEach(async () => {
    mockPrismaService = {
      shop: {
        findUnique: jest.fn(),
      },
      product: {
        findUnique: jest.fn(),
        findFirst: jest.fn(),
        findMany: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
        count: jest.fn(),
      },
      productVariant: {
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CatalogService,
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    catalogService = module.get<CatalogService>(CatalogService);
  });

  describe('createProduct (Règle Métier Prix Barré)', () => {
    it('doit rejeter avec 400 si compareAtPriceFcfa <= priceFcfa', async () => {
      mockPrismaService.shop.findUnique.mockResolvedValue(mockShop);

      // Cas 1: prix barré inférieur
      await expect(
        catalogService.createProduct('vendor-1', {
          name: 'Boubou Bazin',
          priceFcfa: 25000,
          compareAtPriceFcfa: 20000,
          stock: 5,
          images: ['https://storage.sn/img.jpg'],
        }),
      ).rejects.toThrow(BadRequestException);

      // Cas 2: prix barré égal
      await expect(
        catalogService.createProduct('vendor-1', {
          name: 'Boubou Bazin',
          priceFcfa: 25000,
          compareAtPriceFcfa: 25000,
          stock: 5,
          images: ['https://storage.sn/img.jpg'],
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('doit créer avec succès un produit quand compareAtPriceFcfa > priceFcfa', async () => {
      mockPrismaService.shop.findUnique.mockResolvedValue(mockShop);
      mockPrismaService.product.findUnique.mockResolvedValue(null);

      const fakeCreated = {
        id: 'prod-1',
        shopId: mockShop.id,
        name: 'Boubou Bazin',
        slug: 'boubou-bazin',
        priceFcfa: 25000,
        compareAtPriceFcfa: 30000,
        stock: 5,
        lowStockThreshold: 2,
      };
      mockPrismaService.product.create.mockResolvedValue(fakeCreated);

      const result = await catalogService.createProduct('vendor-1', {
        name: 'Boubou Bazin',
        priceFcfa: 25000,
        compareAtPriceFcfa: 30000,
        stock: 5,
        lowStockThreshold: 2,
        images: ['https://storage.sn/img.jpg'],
      });

      expect(result).toBeDefined();
      expect(result.id).toBe('prod-1');
      expect(result.priceFcfa).toBe(25000);
      expect(result.compareAtPriceFcfa).toBe(30000);
    });
  });

  describe('Étanchéité BOLA (Ownership)', () => {
    it('doit rejeter avec ForbiddenException si Vendor B tente de modifier le produit de Vendor A', async () => {
      mockPrismaService.product.findUnique.mockResolvedValue({
        id: 'prod-1',
        shop: {
          id: 'shop-vendor-a',
          ownerId: 'vendor-a-id',
        },
      });

      await expect(
        catalogService.updateProduct('vendor-b-id', 'prod-1', {
          name: 'Hacked Name',
        }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('doit rejeter avec ForbiddenException si Vendor B tente de supprimer la variante de Vendor A', async () => {
      mockPrismaService.productVariant.findUnique.mockResolvedValue({
        id: 'variant-1',
        product: {
          shop: {
            id: 'shop-vendor-a',
            ownerId: 'vendor-a-id',
          },
        },
      });

      await expect(
        catalogService.deleteVariant('vendor-b-id', 'variant-1'),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('getLowStockProducts', () => {
    it('doit identifier les articles dont le stock <= seuil d’alerte', async () => {
      mockPrismaService.shop.findUnique.mockResolvedValue(mockShop);

      mockPrismaService.product.findMany.mockResolvedValue([
        {
          id: 'p-1',
          name: 'Produit Normal',
          slug: 'p-normal',
          stock: 10,
          lowStockThreshold: 2,
          variants: [],
        },
        {
          id: 'p-2',
          name: 'Produit Stock Bas',
          slug: 'p-low',
          stock: 2,
          lowStockThreshold: 3,
          variants: [],
        },
      ]);

      const result = await catalogService.getLowStockProducts('vendor-1');
      expect(result.totalAlerts).toBe(1);
      expect(result.shopId).toBe('shop-1');
    });
  });
});
