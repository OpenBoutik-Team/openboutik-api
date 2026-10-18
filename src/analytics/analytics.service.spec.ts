import { Test, TestingModule } from '@nestjs/testing';
import {
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { AnalyticsService } from './analytics.service';
import { PrismaService } from '../prisma/prisma.service';

describe('AnalyticsService (Vendeur Dashboard & Top Produits Unit Tests)', () => {
  let service: AnalyticsService;
  let mockPrismaService: {
    product: { findUnique: jest.Mock; findMany: jest.Mock };
    productView: { upsert: jest.Mock; findMany: jest.Mock };
    shop: { findUnique: jest.Mock };
    orderItem: { findMany: jest.Mock };
  };

  const mockShop = {
    id: 'shop-uuid-1',
    ownerId: 'vendor-uuid-1',
    name: 'Boutique Wax Dakar',
  };

  beforeEach(async () => {
    mockPrismaService = {
      product: {
        findUnique: jest.fn(),
        findMany: jest.fn(),
      },
      productView: {
        upsert: jest.fn(),
        findMany: jest.fn(),
      },
      shop: {
        findUnique: jest.fn(),
      },
      orderItem: {
        findMany: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AnalyticsService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get<AnalyticsService>(AnalyticsService);
  });

  describe('Tracking des Visites Produits (recordProductView)', () => {
    it('doit renvoyer 404 si le produit visité est introuvable', async () => {
      mockPrismaService.product.findUnique.mockResolvedValue(null);

      await expect(
        service.recordProductView('prod-inexistant'),
      ).rejects.toThrow(NotFoundException);
    });

    it('doit incrémenter de manière atomique le compteur journalier à minuit UTC', async () => {
      mockPrismaService.product.findUnique.mockResolvedValue({
        id: 'prod-1',
        name: 'Robe Wax',
      });
      mockPrismaService.productView.upsert.mockResolvedValue({
        id: 'view-1',
        productId: 'prod-1',
        count: 5,
      });

      const res = await service.recordProductView('prod-1');

      expect(res.count).toBe(5);
      expect(mockPrismaService.productView.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            productId_date: expect.objectContaining({
              productId: 'prod-1',
            }),
          }),
          update: { count: { increment: 1 } },
          create: expect.objectContaining({
            productId: 'prod-1',
            count: 1,
          }),
        }),
      );
    });
  });

  describe('Top 5 des Produits Mensuels (getTopProducts)', () => {
    it('doit refuser l’accès si le vendeur ne possède pas de boutique', async () => {
      mockPrismaService.shop.findUnique.mockResolvedValue(null);

      await expect(
        service.getTopProducts('vendor-sans-boutique'),
      ).rejects.toThrow(ForbiddenException);
    });

    it('doit renvoyer une liste vide si la boutique n’a aucun produit', async () => {
      mockPrismaService.shop.findUnique.mockResolvedValue(mockShop);
      mockPrismaService.product.findMany.mockResolvedValue([]);

      const result = await service.getTopProducts(mockShop.ownerId);

      expect(result.topProducts).toEqual([]);
      expect(result.shopId).toBe(mockShop.id);
    });

    it('doit calculer le chiffre d’affaires, les ventes, les vues et le taux de conversion', async () => {
      mockPrismaService.shop.findUnique.mockResolvedValue(mockShop);
      mockPrismaService.product.findMany.mockResolvedValue([
        {
          id: 'p1',
          name: 'Boubou Soie',
          slug: 'boubou-soie',
          priceFcfa: 50000,
          compareAtPriceFcfa: 60000,
          stock: 10,
          images: ['img1.jpg'],
          isPublished: true,
        },
        {
          id: 'p2',
          name: 'Tunique Lin',
          slug: 'tunique-lin',
          priceFcfa: 20000,
          compareAtPriceFcfa: null,
          stock: 5,
          images: ['img2.jpg'],
          isPublished: true,
        },
      ]);

      mockPrismaService.orderItem.findMany.mockResolvedValue([
        { productId: 'p1', quantity: 2, totalPriceFcfa: 100000 },
        { productId: 'p1', quantity: 1, totalPriceFcfa: 50000 },
        { productId: 'p2', quantity: 1, totalPriceFcfa: 20000 },
      ]);

      mockPrismaService.productView.findMany.mockResolvedValue([
        { productId: 'p1', count: 30 },
        { productId: 'p2', count: 50 },
      ]);

      const result = await service.getTopProducts(mockShop.ownerId);

      expect(result.topProducts).toHaveLength(2);
      // P1 : 150 000 FCFA, 3 unités, 30 vues, convRate = 3/30 = 10%
      expect(result.topProducts[0].id).toBe('p1');
      expect(result.topProducts[0].totalRevenueFcfa).toBe(150000);
      expect(result.topProducts[0].totalUnitsSold).toBe(3);
      expect(result.topProducts[0].totalViews).toBe(30);
      expect(result.topProducts[0].conversionRate).toBe(10);

      // P2 : 20 000 FCFA, 1 unité, 50 vues, convRate = 1/50 = 2%
      expect(result.topProducts[1].id).toBe('p2');
      expect(result.topProducts[1].totalRevenueFcfa).toBe(20000);
      expect(result.topProducts[1].totalUnitsSold).toBe(1);
      expect(result.topProducts[1].totalViews).toBe(50);
      expect(result.topProducts[1].conversionRate).toBe(2);
    });
  });
});
