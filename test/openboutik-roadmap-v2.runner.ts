import { Test, TestingModule } from '@nestjs/testing';
import {
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { CatalogService } from '../src/catalog/catalog.service';
import { ShopsService } from '../src/shops/shops.service';
import { OrdersService } from '../src/orders/orders.service';
import { CouponsService } from '../src/coupons/coupons.service';
import { ReviewsService } from '../src/reviews/reviews.service';
import { AnalyticsService } from '../src/analytics/analytics.service';
import { PrismaService } from '../src/prisma/prisma.service';
import { Role, CouponType } from '../src/generated/prisma/client';

describe('OpenBoutik Roadmap V2 Espace Vendeur — Crash-Test Intégration Global (8 Scénarios)', () => {
  let catalogService: CatalogService;
  let shopsService: ShopsService;
  let ordersService: OrdersService;
  let couponsService: CouponsService;
  let reviewsService: ReviewsService;
  let analyticsService: AnalyticsService;

  let mockPrisma: any;

  const mockVendor = {
    id: 'vendor-teranga-uuid',
    email: 'moussa.diop@terangamode.sn',
    role: Role.VENDOR,
  };

  const mockShop = {
    id: 'shop-teranga-uuid',
    ownerId: mockVendor.id,
    name: 'Teranga Mode',
    slug: 'teranga-mode',
    isOnVacation: false,
    vacationMessage: null,
    subscriptionPlan: 'PRO',
  };

  const mockProduct = {
    id: 'prod-boubou-uuid',
    shopId: mockShop.id,
    name: 'Boubou Bazin Riche Brodé 3 Pièces',
    slug: 'boubou-bazin-riche-brode',
    priceFcfa: 35000,
    compareAtPriceFcfa: 40000,
    stock: 15,
    lowStockThreshold: 5,
    images: ['https://storage.openboutik.sn/boubou.jpg'],
    isPublished: true,
    shop: mockShop,
    variants: [],
  };

  beforeEach(async () => {
    mockPrisma = {
      product: {
        findUnique: jest.fn(),
        findMany: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
      productVariant: {
        findUnique: jest.fn(),
        findMany: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      },
      shop: {
        findUnique: jest.fn(),
        findMany: jest.fn(),
        update: jest.fn(),
      },
      coupon: {
        findUnique: jest.fn(),
        findFirst: jest.fn(),
        findMany: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      },
      order: {
        findUnique: jest.fn(),
        findFirst: jest.fn(),
        findMany: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        updateMany: jest.fn(),
      },
      orderItem: {
        findMany: jest.fn(),
      },
      orderNote: {
        findMany: jest.fn(),
        create: jest.fn(),
      },
      review: {
        findUnique: jest.fn(),
        findMany: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
      productView: {
        upsert: jest.fn(),
        findMany: jest.fn(),
      },
      auditLog: {
        create: jest.fn(),
      },
      checkoutSession: {
        create: jest.fn(),
      },
      escrowTransaction: {
        create: jest.fn(),
        updateMany: jest.fn(),
      },
      vendorWallet: {
        update: jest.fn(),
      },
      $transaction: jest.fn((callbackOrArray) => {
        if (typeof callbackOrArray === 'function') {
          return callbackOrArray(mockPrisma);
        }
        return Promise.all(callbackOrArray);
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CatalogService,
        ShopsService,
        OrdersService,
        CouponsService,
        ReviewsService,
        AnalyticsService,
        {
          provide: PrismaService,
          useValue: mockPrisma,
        },
      ],
    }).compile();

    catalogService = module.get<CatalogService>(CatalogService);
    shopsService = module.get<ShopsService>(ShopsService);
    ordersService = module.get<OrdersService>(OrdersService);
    couponsService = module.get<CouponsService>(CouponsService);
    reviewsService = module.get<ReviewsService>(ReviewsService);
    analyticsService = module.get<AnalyticsService>(AnalyticsService);
  });

  // ----------------------------------------------------------------------------
  // SCÉNARIO 1 : Variantes de Produits (Catalogue Avancé)
  // ----------------------------------------------------------------------------
  describe('Scénario 1 : Variantes de Produits (Tailles & Couleurs)', () => {
    it('doit refuser la création d’une variante si compareAtPriceFcfa <= priceFcfa', async () => {
      mockPrisma.product.findUnique.mockResolvedValue(mockProduct);

      await expect(
        catalogService.createVariant(mockVendor.id, mockProduct.id, {
          priceFcfa: 40000,
          compareAtPriceFcfa: 35000, // Invalide : prix barré inférieur au prix
          stock: 5,
          attributes: { taille: 'XL' },
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('doit créer avec succès une variante pour le vendeur légitime', async () => {
      mockPrisma.product.findUnique.mockResolvedValue(mockProduct);
      mockPrisma.productVariant.create.mockResolvedValue({
        id: 'var-1',
        productId: mockProduct.id,
        sku: 'BOUBOU-BN-XL',
        priceFcfa: 35000,
        compareAtPriceFcfa: 40000,
        stock: 5,
        attributes: { taille: 'XL', couleur: 'Bleu Nuit' },
        isActive: true,
      });

      const variant = await catalogService.createVariant(
        mockVendor.id,
        mockProduct.id,
        {
          sku: 'BOUBOU-BN-XL',
          priceFcfa: 35000,
          compareAtPriceFcfa: 40000,
          stock: 5,
          attributes: { taille: 'XL', couleur: 'Bleu Nuit' },
        },
      );

      expect(variant.sku).toBe('BOUBOU-BN-XL');
      expect(variant.stock).toBe(5);
    });
  });

  // ----------------------------------------------------------------------------
  // SCÉNARIO 2 : Alertes de Stock Critique (lowStockThreshold)
  // ----------------------------------------------------------------------------
  describe('Scénario 2 : Alertes Stock Faible Vendeur', () => {
    it('doit retourner les produits dont le stock est inférieur ou égal au seuil critique', async () => {
      mockPrisma.shop.findUnique.mockResolvedValue(mockShop);
      mockPrisma.product.findMany.mockResolvedValue([
        {
          ...mockProduct,
          stock: 3,
          lowStockThreshold: 5,
          variants: [],
        },
      ]);

      const lowStockReport = await catalogService.getLowStockProducts(
        mockVendor.id,
      );

      expect(lowStockReport.totalAlerts).toBe(1);
      expect(lowStockReport.alerts).toHaveLength(1);
      expect(lowStockReport.alerts[0].isLowStock).toBe(true);
      expect(lowStockReport.alerts[0].currentStock).toBe(3);
    });
  });

  // ----------------------------------------------------------------------------
  // SCÉNARIO 3 : Mode Vacances Vendeur
  // ----------------------------------------------------------------------------
  describe('Scénario 3 : Activation du Mode Vacances & Blocage Commandes', () => {
    it('doit permettre au marchand de basculer en mode vacances avec message personnalisé', async () => {
      mockPrisma.shop.findUnique.mockResolvedValue(mockShop);
      mockPrisma.shop.update.mockResolvedValue({
        ...mockShop,
        isOnVacation: true,
        vacationMessage: 'Boutique fermée pour le Magal de Touba jusqu’à lundi.',
      });

      const updated = await shopsService.setVacationMode(mockVendor.id, {
        isOnVacation: true,
        vacationMessage: 'Boutique fermée pour le Magal de Touba jusqu’à lundi.',
      });

      expect(updated.isOnVacation).toBe(true);
      expect(updated.vacationMessage).toContain('Magal de Touba');
    });

    it('doit bloquer le checkout client si la boutique est en mode vacances', async () => {
      mockPrisma.product.findMany.mockResolvedValue([
        {
          ...mockProduct,
          shop: {
            ...mockShop,
            isOnVacation: true,
            vacationMessage: 'Boutique en vacances.',
          },
        },
      ]);

      await expect(
        ordersService.checkout('client-1', {
          items: [{ productId: mockProduct.id, quantity: 1 }],
          deliveryAddress: 'Dakar Plateau',
          deliveryCity: 'Dakar',
          deliveryPhone: '+221770001122',
          paymentProvider: 'WAVE' as any,
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  // ----------------------------------------------------------------------------
  // SCÉNARIO 4 : Codes Promo & Marketing Vendeur (Arbitrage Q2)
  // ----------------------------------------------------------------------------
  describe('Scénario 4 : Codes Promo & Déduction Financière', () => {
    it('doit créer un code promo TABASKI20 avec validation de date future et majuscules', async () => {
      mockPrisma.shop.findUnique.mockResolvedValue(mockShop);
      mockPrisma.coupon.findUnique.mockResolvedValue(null);

      const futureDate = new Date(Date.now() + 86400000 * 30);
      mockPrisma.coupon.create.mockResolvedValue({
        id: 'coup-1',
        shopId: mockShop.id,
        code: 'TABASKI20',
        type: CouponType.PERCENTAGE,
        value: 20,
        expiryDate: futureDate,
        maxUses: 50,
        usedCount: 0,
        isActive: true,
      });

      const coupon = await couponsService.createCoupon(mockVendor.id, {
        code: 'tabaski20',
        type: CouponType.PERCENTAGE,
        value: 20,
        expiryDate: futureDate.toISOString(),
        maxUses: 50,
      });

      expect(coupon.code).toBe('TABASKI20');
      expect(coupon.value).toBe(20);
    });

    it('doit calculer la déduction exacte et interdire tout solde négatif', async () => {
      mockPrisma.coupon.findUnique.mockResolvedValue({
        id: 'coup-fixed',
        shopId: mockShop.id,
        code: 'PROMO10K',
        type: CouponType.FIXED_FCFA,
        value: 10000,
        expiryDate: new Date(Date.now() + 86400000),
        maxUses: null,
        usedCount: 0,
        isActive: true,
      });

      const validation = await couponsService.validateCoupon({
        code: 'PROMO10K',
        shopId: mockShop.id,
        subtotalFcfa: 8000, // Inférieur aux 10 000 FCFA
      });

      expect(validation.discountAmountFcfa).toBe(8000); // Plafonné au sous-total
      expect(validation.newSubtotalFcfa).toBe(0);
    });
  });

  // ----------------------------------------------------------------------------
  // SCÉNARIO 5 : Mémos Internes Vendeur (OrderNote & BOLA)
  // ----------------------------------------------------------------------------
  describe('Scénario 5 : Mémos Internes Vendeur Confidentiels', () => {
    it('doit permettre au marchand d’ajouter un mémo interne sur sa commande', async () => {
      mockPrisma.order.findUnique.mockResolvedValue({
        id: 'ord-1',
        shop: { ownerId: mockVendor.id },
      });
      mockPrisma.orderNote.create.mockResolvedValue({
        id: 'note-1',
        orderId: 'ord-1',
        text: 'Client joint par téléphone, livraison avancée à 15h.',
      });

      const note = await ordersService.addOrderNote('ord-1', mockVendor.id, {
        text: 'Client joint par téléphone, livraison avancée à 15h.',
      });

      expect(note.text).toContain('livraison avancée');
    });

    it('doit formellement interdire la lecture des mémos à un client', async () => {
      await expect(
        ordersService.getOrderNotes('ord-1', 'client-uuid', Role.CLIENT),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  // ----------------------------------------------------------------------------
  // SCÉNARIO 6 : Facturation & Reçus PDF en Streaming
  // ----------------------------------------------------------------------------
  describe('Scénario 6 : Reçu PDF Officiel (Option A)', () => {
    it('doit interdire le téléchargement de la facture à un tiers non autorisé', async () => {
      mockPrisma.order.findUnique.mockResolvedValue({
        id: 'ord-1',
        clientId: 'client-legitime',
        shop: { ownerId: mockVendor.id },
      });

      const mockRes = { setHeader: jest.fn() } as any;

      await expect(
        ordersService.generateInvoicePdf(
          'ord-1',
          'tiers-inconnu',
          Role.CLIENT,
          mockRes,
        ),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  // ----------------------------------------------------------------------------
  // SCÉNARIO 7 : Avis Clients 5★ (Achat Vérifié & Réponse Vendeur)
  // ----------------------------------------------------------------------------
  describe('Scénario 7 : Avis Clients 5★ & Modération', () => {
    it('doit refuser un avis si le client n’a pas acheté et reçu le produit', async () => {
      mockPrisma.product.findUnique.mockResolvedValue(mockProduct);
      mockPrisma.review.findUnique.mockResolvedValue(null);
      mockPrisma.order.findFirst.mockResolvedValue(null); // Pas d'achat DELIVERED_CONFIRMED

      await expect(
        reviewsService.createReview('client-sans-achat', mockProduct.id, {
          rating: 5,
          comment: 'Très beau tissu !',
        }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('doit permettre au marchand de répondre officiellement à un avis sur son produit', async () => {
      mockPrisma.review.findUnique.mockResolvedValue({
        id: 'rev-1',
        product: {
          shop: { ownerId: mockVendor.id },
        },
      });
      mockPrisma.review.update.mockResolvedValue({
        id: 'rev-1',
        vendorReply: 'Jërëjëf pour votre confiance !',
        repliedAt: new Date(),
      });

      const updated = await reviewsService.replyToReview(
        mockVendor.id,
        'rev-1',
        {
          reply: 'Jërëjëf pour votre confiance !',
        },
      );

      expect(updated.vendorReply).toBe('Jërëjëf pour votre confiance !');
    });
  });

  // ----------------------------------------------------------------------------
  // SCÉNARIO 8 : Analytique & Top 5 Ventes Mensuelles
  // ----------------------------------------------------------------------------
  describe('Scénario 8 : Tracking des Vues & Top 5 Ventes', () => {
    it('doit incrémenter le compteur de visite journalier à minuit UTC', async () => {
      mockPrisma.product.findUnique.mockResolvedValue(mockProduct);
      mockPrisma.productView.upsert.mockResolvedValue({
        productId: mockProduct.id,
        count: 10,
      });

      const view = await analyticsService.recordProductView(mockProduct.id);
      expect(view.count).toBe(10);
    });

    it('doit renvoyer le Top 5 trié par chiffre d’affaires en FCFA avec taux de conversion', async () => {
      mockPrisma.shop.findUnique.mockResolvedValue(mockShop);
      mockPrisma.product.findMany.mockResolvedValue([
        {
          id: 'p1',
          name: 'Boubou Soie',
          slug: 'boubou-soie',
          priceFcfa: 40000,
          compareAtPriceFcfa: null,
          stock: 10,
          images: [],
          isPublished: true,
        },
      ]);
      mockPrisma.orderItem.findMany.mockResolvedValue([
        { productId: 'p1', quantity: 3, totalPriceFcfa: 120000 },
      ]);
      mockPrisma.productView.findMany.mockResolvedValue([
        { productId: 'p1', count: 30 },
      ]);

      const analytics = await analyticsService.getTopProducts(mockVendor.id);

      expect(analytics.topProducts).toHaveLength(1);
      expect(analytics.topProducts[0].totalRevenueFcfa).toBe(120000);
      expect(analytics.topProducts[0].totalUnitsSold).toBe(3);
      expect(analytics.topProducts[0].conversionRate).toBe(10); // 3 / 30 = 10%
    });
  });
});
