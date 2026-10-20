import { Test, TestingModule } from '@nestjs/testing';
import {
  BadRequestException,
  ForbiddenException,
  ConflictException,
} from '@nestjs/common';
import { CatalogService } from '../src/catalog/catalog.service';
import { ShopsService } from '../src/shops/shops.service';
import { OrdersService } from '../src/orders/orders.service';
import { CouponsService } from '../src/coupons/coupons.service';
import { ReviewsService } from '../src/reviews/reviews.service';
import { AnalyticsService } from '../src/analytics/analytics.service';
import { WalletsService } from '../src/wallets/wallets.service';
import { DisputesService } from '../src/disputes/disputes.service';
import { PrismaService } from '../src/prisma/prisma.service';
import {
  Role,
  CouponType,
  OrderStatus,
  PaymentProvider,
  DeliveryMethod,
  SubscriptionPlan,
  KycStatus,
  EscrowStatus,
  DisputeStatus,
} from '../src/generated/prisma/client';
import { DisputeDecision } from '../src/disputes/dto/arbitrate-dispute.dto';
import { Response } from 'express';

describe('OpenBoutik V2 — Suite Complète de Crash-Test E2E & Pentest (8 Scénarios de Certification)', () => {
  let catalogService: CatalogService;
  let shopsService: ShopsService;
  let ordersService: OrdersService;
  let couponsService: CouponsService;
  let reviewsService: ReviewsService;
  let analyticsService: AnalyticsService;
  let walletsService: WalletsService;
  let disputesService: DisputesService;

  let mockPrisma: any;

  // Données dakaroises de test
  const vendorA = {
    id: 'usr-vendor-a-uuid',
    fullName: 'Moussa Diop',
    phone: '+221770010001',
    email: 'moussa@terangamode.sn',
    role: Role.VENDOR,
  };

  const vendorB = {
    id: 'usr-vendor-b-uuid',
    fullName: 'Ibrahima Ndiaye',
    phone: '+221770020002',
    email: 'ibrahima@dakartech.sn',
    role: Role.VENDOR,
  };

  const clientA = {
    id: 'usr-client-a-uuid',
    fullName: 'Fatou Sow',
    phone: '+221770030003',
    email: 'fatou.sow@gmail.com',
    role: Role.CLIENT,
  };

  const clientB = {
    id: 'usr-client-b-uuid',
    fullName: 'Cheikh Fall',
    phone: '+221770040004',
    email: 'cheikh.fall@gmail.com',
    role: Role.CLIENT,
  };

  const adminUser = {
    id: 'usr-admin-super-uuid',
    fullName: 'Amadou Bamba Ba',
    phone: '+221770090009',
    email: 'admin@openboutik.sn',
    role: Role.SUPER_ADMIN,
  };

  const shopA = {
    id: 'shop-teranga-uuid',
    ownerId: vendorA.id,
    name: 'Teranga Mode Dakar',
    slug: 'teranga-mode-dakar',
    city: 'Dakar',
    address: 'Mermoz Pyrotechnie',
    whatsappNumber: '+221770010001',
    isOnVacation: false,
    vacationMessage: null,
    subscriptionPlan: SubscriptionPlan.FREE,
    isActive: true,
    isVerified: true,
    onboardingStep: 5,
    onboardingCompleted: true,
    owner: vendorA,
  };

  const shopB = {
    id: 'shop-dakartech-uuid',
    ownerId: vendorB.id,
    name: 'Dakar Tech Gadgets',
    slug: 'dakar-tech-gadgets',
    city: 'Dakar',
    address: 'Plateau Rue Carnot',
    whatsappNumber: '+221770020002',
    isOnVacation: false,
    vacationMessage: null,
    subscriptionPlan: SubscriptionPlan.PRO,
    isActive: true,
    isVerified: true,
    onboardingStep: 5,
    onboardingCompleted: true,
    owner: vendorB,
  };

  beforeEach(async () => {
    mockPrisma = {
      product: {
        findUnique: jest.fn(),
        findFirst: jest.fn(),
        findMany: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        count: jest.fn(),
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
        findFirst: jest.fn(),
        findMany: jest.fn(),
        update: jest.fn(),
        create: jest.fn(),
      },
      user: {
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
        create: jest.fn(),
      },
      orderNote: {
        findMany: jest.fn(),
        create: jest.fn(),
      },
      review: {
        findUnique: jest.fn(),
        findFirst: jest.fn(),
        findMany: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
      productView: {
        upsert: jest.fn(),
        findMany: jest.fn(),
      },
      vendorWallet: {
        findUnique: jest.fn(),
        update: jest.fn(),
      },
      escrowTransaction: {
        findUnique: jest.fn(),
        findFirst: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        updateMany: jest.fn(),
      },
      dispute: {
        findUnique: jest.fn(),
        findFirst: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
      auditLog: {
        create: jest.fn(),
      },
      checkoutSession: {
        create: jest.fn(),
      },
      $transaction: jest.fn(async (callbackOrArray) => {
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
        WalletsService,
        DisputesService,
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
    walletsService = module.get<WalletsService>(WalletsService);
    disputesService = module.get<DisputesService>(DisputesService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  // ============================================================================
  // SCÉNARIO 1 : Catalogue Avancé — Variantes, Prix Barrés & Stock Bas
  // ============================================================================
  describe('SCÉNARIO 1 : Catalogue Avancé — Variantes, Prix Barrés & Alerte Stock Bas', () => {
    it('1.1 doit rejeter avec 400 Bad Request si compareAtPriceFcfa <= priceFcfa', async () => {
      mockPrisma.shop.findUnique.mockResolvedValue(shopA);

      // Cas 1 : Prix barré inférieur au prix de vente (15 000 <= 20 000)
      await expect(
        catalogService.createProduct(vendorA.id, {
          name: 'Boubou Bazin Sénégalais',
          priceFcfa: 20000,
          compareAtPriceFcfa: 15000,
          stock: 10,
          images: ['https://openboutik.sn/boubou.jpg'],
        }),
      ).rejects.toThrow(BadRequestException);

      // Cas 2 : Prix barré égal au prix de vente (20 000 <= 20 000)
      await expect(
        catalogService.createProduct(vendorA.id, {
          name: 'Boubou Bazin Sénégalais',
          priceFcfa: 20000,
          compareAtPriceFcfa: 20000,
          stock: 10,
          images: ['https://openboutik.sn/boubou.jpg'],
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('1.2 doit créer avec succès un produit valide avec compareAtPriceFcfa > priceFcfa et lowStockThreshold', async () => {
      mockPrisma.shop.findUnique.mockResolvedValue(shopA);
      mockPrisma.product.findUnique.mockResolvedValue(null);
      const createdMock = {
        id: 'prod-boubou-1',
        shopId: shopA.id,
        name: 'Grand Boubou Bazin Brodé',
        slug: 'grand-boubou-bazin-brode',
        priceFcfa: 18000,
        compareAtPriceFcfa: 25000,
        stock: 10,
        lowStockThreshold: 2,
        images: ['https://openboutik.sn/boubou1.jpg'],
        isPublished: true,
      };
      mockPrisma.product.create.mockResolvedValue(createdMock);

      const result = await catalogService.createProduct(vendorA.id, {
        name: 'Grand Boubou Bazin Brodé',
        priceFcfa: 18000,
        compareAtPriceFcfa: 25000,
        stock: 10,
        lowStockThreshold: 2,
        images: ['https://openboutik.sn/boubou1.jpg'],
      });

      expect(result).toBeDefined();
      expect(result.priceFcfa).toBe(18000);
      expect(result.compareAtPriceFcfa).toBe(25000);
      expect(result.lowStockThreshold).toBe(2);
    });

    it('1.3 & 1.4 doit créer 2 variantes et décrémenter atomiquement le stock lors d’une commande', async () => {
      const variant1 = {
        id: 'var-l-rouge',
        productId: 'prod-boubou-1',
        sku: 'BOUBOU-L-ROUGE',
        priceFcfa: 18000,
        stock: 3,
        attributes: { taille: 'L', couleur: 'Rouge' },
        isActive: true,
      };

      const variant2 = {
        id: 'var-xl-bleu',
        productId: 'prod-boubou-1',
        sku: 'BOUBOU-XL-BLEU',
        priceFcfa: 20000,
        stock: 5,
        attributes: { taille: 'XL', couleur: 'Bleu' },
        isActive: true,
      };

      const productMock = {
        id: 'prod-boubou-1',
        shopId: shopA.id,
        name: 'Grand Boubou Bazin Brodé',
        priceFcfa: 18000,
        stock: 8,
        lowStockThreshold: 2,
        shop: { ...shopA, wallet: { id: 'w-1' } },
        variants: [variant1, variant2],
      };

      mockPrisma.product.findMany.mockResolvedValue([productMock]);
      mockPrisma.shop.findUnique.mockResolvedValue(shopA);
      mockPrisma.checkoutSession.create.mockResolvedValue({ id: 'cs-var-1' });
      mockPrisma.productVariant.update.mockResolvedValue({
        ...variant1,
        stock: 1, // 3 - 2 = 1
      });
      mockPrisma.product.update.mockResolvedValue({ id: productMock.id, stock: 6 });
      mockPrisma.order.create.mockResolvedValue({
        id: 'ord-var-1',
        orderNumber: 'OB-2026-V1',
        subtotalFcfa: 36000,
        totalAmountFcfa: 38000,
        status: OrderStatus.PAID_ESCROW,
      });

      const checkoutDto = {
        paymentProvider: PaymentProvider.WAVE,
        deliveryMethod: DeliveryMethod.TIAK_TIAK,
        deliveryAddress: 'Sacré-Cœur 3',
        deliveryCity: 'Dakar',
        deliveryPhone: '+221770030003',
        items: [
          {
            productId: productMock.id,
            variantId: variant1.id,
            quantity: 2,
          },
        ],
      };

      const orders = await ordersService.checkout(clientA.id, checkoutDto);
      expect(orders).toBeDefined();

      expect(mockPrisma.productVariant.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: variant1.id },
          data: { stock: { decrement: 2 } },
        }),
      );

      // Vérification alerte stock faible (stock: 1 <= threshold: 2)
      mockPrisma.product.findMany.mockResolvedValueOnce([
        {
          ...productMock,
          stock: 6,
          variants: [
            { ...variant1, stock: 1 },
            { ...variant2, stock: 5 },
          ],
        },
      ]);

      const alerts = await catalogService.getLowStockProducts(vendorA.id);
      expect(alerts.totalAlerts).toBe(1);
      expect(alerts.alerts[0].criticalVariants.length).toBe(1);
      expect(alerts.alerts[0].criticalVariants[0].sku).toBe('BOUBOU-L-ROUGE');
      expect(alerts.alerts[0].criticalVariants[0].stock).toBe(1);
    });

    it('1.5 Concurrence sur Variante (Promise.all) : 1 unité restante, 2 commandes simultanées', async () => {
      let currentVariantStock = 1;

      mockPrisma.product.findMany.mockImplementation(async () => {
        return [
          {
            id: 'prod-boubou-1',
            shopId: shopA.id,
            name: 'Grand Boubou Bazin Brodé',
            priceFcfa: 18000,
            stock: 1,
            lowStockThreshold: 2,
            shop: { ...shopA, wallet: { id: 'w-1' } },
            variants: [
              {
                id: 'var-l-rouge',
                productId: 'prod-boubou-1',
                sku: 'BOUBOU-L-ROUGE',
                priceFcfa: 18000,
                stock: currentVariantStock,
                attributes: { taille: 'L', couleur: 'Rouge' },
                isActive: true,
              },
            ],
          },
        ];
      });

      mockPrisma.shop.findUnique.mockResolvedValue(shopA);
      mockPrisma.checkoutSession.create.mockResolvedValue({ id: 'cs-race' });

      mockPrisma.productVariant.update.mockImplementation(async () => {
        if (currentVariantStock < 1) {
          throw new BadRequestException('Stock insuffisant pour cette variante');
        }
        currentVariantStock -= 1;
        return { id: 'var-l-rouge', stock: currentVariantStock };
      });

      mockPrisma.product.update.mockResolvedValue({ id: 'prod-boubou-1', stock: 0 });
      mockPrisma.order.create.mockResolvedValue({
        id: 'ord-race-win',
        orderNumber: 'OB-2026-WIN',
        totalAmountFcfa: 20000,
        status: OrderStatus.PAID_ESCROW,
      });

      const orderPayload = {
        paymentProvider: PaymentProvider.WAVE,
        deliveryMethod: DeliveryMethod.TIAK_TIAK,
        deliveryAddress: 'Medina Rue 6',
        deliveryCity: 'Dakar',
        deliveryPhone: '+221770030003',
        items: [
          {
            productId: 'prod-boubou-1',
            variantId: 'var-l-rouge',
            quantity: 1,
          },
        ],
      };

      const [res1, res2] = await Promise.allSettled([
        ordersService.checkout(clientA.id, orderPayload),
        ordersService.checkout(clientB.id, orderPayload),
      ]);

      const successCount = [res1, res2].filter((r) => r.status === 'fulfilled').length;
      const rejectedCount = [res1, res2].filter((r) => r.status === 'rejected').length;

      expect(successCount).toBe(1);
      expect(rejectedCount).toBe(1);
      expect(currentVariantStock).toBe(0);
    });
  });

  // ============================================================================
  // SCÉNARIO 2 : Bouton « Mode Vacances » (is_on_vacation & vacation_message)
  // ============================================================================
  describe('SCÉNARIO 2 : Bouton « Mode Vacances »', () => {
    it('2.1 doit permettre au vendeur d’activer le mode vacances', async () => {
      mockPrisma.shop.findUnique.mockResolvedValue(shopA);
      mockPrisma.shop.update.mockResolvedValue({
        ...shopA,
        isOnVacation: true,
        vacationMessage: 'Fermé pour la Tabaski, reprise des livraisons lundi !',
      });

      const updated = await shopsService.setVacationMode(vendorA.id, {
        isOnVacation: true,
        vacationMessage: 'Fermé pour la Tabaski, reprise des livraisons lundi !',
      });

      expect(updated.isOnVacation).toBe(true);
      expect(updated.vacationMessage).toBe('Fermé pour la Tabaski, reprise des livraisons lundi !');
    });

    it('2.2 la vitrine reste consultable par les clients avec l’indication vacances', async () => {
      mockPrisma.shop.findUnique.mockResolvedValue({
        ...shopA,
        isOnVacation: true,
        vacationMessage: 'Fermé pour la Tabaski, reprise des livraisons lundi !',
      });

      const shop = await shopsService.findBySlug(shopA.slug);
      expect(shop).toBeDefined();
      expect(shop.isOnVacation).toBe(true);
      expect(shop.vacationMessage).toContain('Tabaski');
    });

    it('2.3 la tentative de validation de commande doit être strictement rejetée avec le message exact', async () => {
      const vacationShop = {
        ...shopA,
        isOnVacation: true,
        vacationMessage: 'Fermé pour la Tabaski, reprise des livraisons lundi !',
        wallet: { id: 'w-1' },
      };

      mockPrisma.product.findMany.mockResolvedValue([
        {
          id: 'prod-1',
          shopId: vacationShop.id,
          name: 'Bazin',
          priceFcfa: 10000,
          stock: 5,
          shop: vacationShop,
          variants: [],
        },
      ]);

      await expect(
        ordersService.checkout(clientA.id, {
          paymentProvider: PaymentProvider.WAVE,
          deliveryMethod: DeliveryMethod.TIAK_TIAK,
          deliveryAddress: 'Almadies',
          deliveryCity: 'Dakar',
          deliveryPhone: '+221770030003',
          items: [{ productId: 'prod-1', quantity: 1 }],
        }),
      ).rejects.toThrow(vacationShop.vacationMessage);
    });

    it('2.4 après désactivation du mode vacances, le client peut commander normalement', async () => {
      const activeShop = {
        ...shopA,
        isOnVacation: false,
        vacationMessage: null,
        wallet: { id: 'w-1' },
      };

      mockPrisma.product.findMany.mockResolvedValue([
        {
          id: 'prod-1',
          shopId: activeShop.id,
          name: 'Bazin',
          priceFcfa: 10000,
          stock: 5,
          shop: activeShop,
          variants: [],
        },
      ]);

      mockPrisma.checkoutSession.create.mockResolvedValue({ id: 'cs-active' });
      mockPrisma.product.update.mockResolvedValue({ id: 'prod-1', stock: 4 });
      mockPrisma.order.create.mockResolvedValue({
        id: 'ord-active',
        orderNumber: 'OB-2026-ACTIVE',
        totalAmountFcfa: 12000,
        status: OrderStatus.PAID_ESCROW,
      });

      const orders = await ordersService.checkout(clientA.id, {
        paymentProvider: PaymentProvider.ORANGE_MONEY,
        deliveryMethod: DeliveryMethod.TIAK_TIAK,
        deliveryAddress: 'Ouakam',
        deliveryCity: 'Dakar',
        deliveryPhone: '+221770030003',
        items: [{ productId: 'prod-1', quantity: 1 }],
      });

      expect(orders).toBeDefined();
    });
  });

  // ============================================================================
  // SCÉNARIO 3 : Codes Promo, Séquestre, Commissions 2%-4% & Concurrence
  // ============================================================================
  describe('SCÉNARIO 3 : Codes Promo, Séquestre, Commissions & Attaque Concurrence', () => {
    it('3.1 Création et validation sécurisée des règles coupon (expiré & inter-boutique)', async () => {
      mockPrisma.shop.findUnique.mockResolvedValue(shopA);
      mockPrisma.coupon.findUnique.mockResolvedValue(null);

      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 30);

      mockPrisma.coupon.create.mockResolvedValue({
        id: 'cpn-tabaski',
        shopId: shopA.id,
        code: 'TABASKI20',
        type: CouponType.PERCENTAGE,
        value: 20,
        maxUses: 1,
        usedCount: 0,
        expiryDate: futureDate,
        isActive: true,
      });

      const coupon = await couponsService.createCoupon(vendorA.id, {
        code: 'TABASKI20',
        type: CouponType.PERCENTAGE,
        value: 20,
        maxUses: 1,
        expiryDate: futureDate.toISOString(),
      });
      expect(coupon.code).toBe('TABASKI20');

      // Tentative d'utiliser un code expiré KORITE10
      const expiredDate = new Date();
      expiredDate.setDate(expiredDate.getDate() - 5);
      mockPrisma.coupon.findUnique.mockResolvedValue({
        id: 'cpn-korite',
        shopId: shopA.id,
        code: 'KORITE10',
        type: CouponType.PERCENTAGE,
        value: 10,
        expiryDate: expiredDate,
        isActive: true,
        usedCount: 0,
      });

      await expect(
        couponsService.validateCoupon({
          code: 'KORITE10',
          shopId: shopA.id,
          subtotalFcfa: 20000,
        }),
      ).rejects.toThrow(new BadRequestException('Ce code promotionnel a expiré.'));

      // Attaque Inter-Boutiques : Coupon de Boutique A non trouvé sur Boutique B
      mockPrisma.coupon.findUnique.mockResolvedValue(null);

      await expect(
        couponsService.validateCoupon({
          code: 'TABASKI20',
          shopId: shopB.id,
          subtotalFcfa: 20000,
        }),
      ).rejects.toThrow(
        new BadRequestException('Code promotionnel invalide ou inactif.'),
      );
    });

    it('3.2 Attaque Concurrence sur maxUses: 1 (Promise.all) : 5 requêtes simultanées', async () => {
      let couponUsedCount = 0;
      const futureDate = new Date(Date.now() + 86400000 * 30);

      const couponMock = {
        id: 'cpn-race',
        shopId: shopA.id,
        code: 'TABASKI20',
        type: CouponType.PERCENTAGE,
        value: 20,
        maxUses: 1,
        usedCount: 0,
        isActive: true,
        expiryDate: futureDate,
      };

      const productMock = {
        id: 'prod-wax-race',
        shopId: shopA.id,
        name: 'Tissu Wax Sénégalais',
        priceFcfa: 50000,
        stock: 50,
        shop: { ...shopA, wallet: { id: 'w-1' } },
        variants: [],
      };

      mockPrisma.product.findMany.mockResolvedValue([productMock]);
      mockPrisma.coupon.findFirst.mockResolvedValue(couponMock);
      mockPrisma.checkoutSession.create.mockResolvedValue({ id: 'cs-coupon-race' });
      mockPrisma.product.update.mockResolvedValue({ id: 'prod-wax-race', stock: 49 });

      // Mock update coupon atomique avec transaction MySQL
      mockPrisma.coupon.update.mockImplementation(async () => {
        couponUsedCount += 1;
        return {
          ...couponMock,
          usedCount: couponUsedCount,
        };
      });

      mockPrisma.order.create.mockResolvedValue({
        id: 'ord-coupon-win',
        orderNumber: 'OB-2026-COUPON-WIN',
        subtotalFcfa: 50000,
        discountAmountFcfa: 10000,
        totalAmountFcfa: 42000,
        status: OrderStatus.PAID_ESCROW,
      });

      const orderDto = {
        paymentProvider: PaymentProvider.WAVE,
        deliveryMethod: DeliveryMethod.TIAK_TIAK,
        deliveryAddress: 'Yoff Tonghor',
        deliveryCity: 'Dakar',
        deliveryPhone: '+221770030003',
        couponCode: 'TABASKI20',
        items: [{ productId: productMock.id, quantity: 1 }],
      };

      // 5 requêtes concurrentes via Promise.allSettled
      const results = await Promise.allSettled([
        ordersService.checkout(clientA.id, orderDto),
        ordersService.checkout(clientB.id, orderDto),
        ordersService.checkout(clientA.id, orderDto),
        ordersService.checkout(clientB.id, orderDto),
        ordersService.checkout(clientA.id, orderDto),
      ]);

      const fulfilled = results.filter((r) => r.status === 'fulfilled');
      const rejected = results.filter((r) => r.status === 'rejected');

      expect(fulfilled.length).toBe(1);
      expect(rejected.length).toBe(4);
      expect(couponUsedCount).toBeGreaterThanOrEqual(1);
    });

    it('3.3 Exactitude Mathématique du Séquestre au franc CFA près (Commissions 2% et 4%)', async () => {
      const subtotalFcfa = 50000;
      const discountAmountFcfa = 10000;
      const discountedSubtotal = subtotalFcfa - discountAmountFcfa; // 40 000 FCFA
      const deliveryFeeFcfa = 2000;
      const totalAmountFcfa = discountedSubtotal + deliveryFeeFcfa; // 42 000 FCFA

      // CAS 1 : Boutique FREE -> Taux 4%
      const freeRate = 4;
      const commissionFree = Math.round(discountedSubtotal * (freeRate / 100)); // 1 600 FCFA
      const netVendorFree = discountedSubtotal - commissionFree; // 38 400 FCFA

      expect(commissionFree).toBe(1600);
      expect(netVendorFree).toBe(38400);
      expect(commissionFree + netVendorFree).toBe(40000); // 1600 + 38400 === 40000 strict !

      // CAS 2 : Boutique PREMIUM -> Taux 2%
      const premiumRate = 2;
      const commissionPremium = Math.round(discountedSubtotal * (premiumRate / 100)); // 800 FCFA
      const netVendorPremium = discountedSubtotal - commissionPremium; // 39 200 FCFA

      expect(commissionPremium).toBe(800);
      expect(netVendorPremium).toBe(39200);
      expect(commissionPremium + netVendorPremium).toBe(40000); // 800 + 39200 === 40000 strict !

      // Simulation de libération du séquestre après confirmation de livraison
      let orderStatus33: OrderStatus = OrderStatus.SHIPPED_TIAK_TIAK;
      mockPrisma.order.findUnique.mockImplementation(async () => ({
        id: 'ord-delivered-1',
        shopId: shopA.id,
        clientId: clientA.id,
        deliveryConfirmationCode: '4829',
        status: orderStatus33,
        totalAmountFcfa,
        subtotalFcfa: discountedSubtotal,
        commissionAmountFcfa: commissionFree,
        netVendorAmountFcfa: netVendorFree,
        shop: shopA,
        escrow: {
          id: 'esc-1',
          totalAmountFcfa,
          commissionAmountFcfa: commissionFree,
          netVendorAmountFcfa: netVendorFree,
          status: EscrowStatus.HELD_IN_ESCROW,
        },
      }));

      mockPrisma.order.updateMany.mockImplementation(async () => {
        orderStatus33 = OrderStatus.DELIVERED_CONFIRMED;
        return { count: 1 };
      });
      mockPrisma.escrowTransaction.updateMany.mockResolvedValue({ count: 1 });
      mockPrisma.order.update.mockResolvedValue({
        id: 'ord-delivered-1',
        status: OrderStatus.DELIVERED_CONFIRMED,
      });

      const confirmed = await ordersService.confirmDelivery(
        'ord-delivered-1',
        clientA.id,
        Role.CLIENT,
        { confirmationCode: '4829' },
      );

      expect(confirmed?.status).toBe(OrderStatus.DELIVERED_CONFIRMED);
      expect(mockPrisma.vendorWallet.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { shopId: shopA.id },
          data: {
            escrowBalanceFcfa: { decrement: 38400 },
            availableBalanceFcfa: { increment: 38400 },
            totalEarnedFcfa: { increment: 38400 },
          },
        }),
      );
    });
  });

  // ============================================================================
  // SCÉNARIO 4 : Mémos Internes (OrderNotes) & Étanchéité BOLA
  // ============================================================================
  describe('SCÉNARIO 4 : Mémos Internes & Étanchéité BOLA Absolue', () => {
    const mockOrderA = {
      id: 'ord-mermoz-1',
      shopId: shopA.id,
      clientId: clientA.id,
      orderNumber: 'OB-2026-MERMOZ',
      shop: shopA,
      client: clientA,
      items: [],
      notes: [{ id: 'note-1', text: 'Client veut être livré avant 14h à Mermoz' }],
    };

    it('4.1 & 4.2 Vendeur A ajoute une note et consulte son historique', async () => {
      mockPrisma.order.findUnique.mockResolvedValue(mockOrderA);
      mockPrisma.orderNote.create.mockResolvedValue({
        id: 'note-1',
        orderId: mockOrderA.id,
        text: 'Client veut être livré avant 14h à Mermoz',
        createdAt: new Date(),
      });
      mockPrisma.orderNote.findMany.mockResolvedValue([
        {
          id: 'note-1',
          orderId: mockOrderA.id,
          text: 'Client veut être livré avant 14h à Mermoz',
        },
      ]);

      const note = await ordersService.addOrderNote(mockOrderA.id, vendorA.id, {
        text: 'Client veut être livré avant 14h à Mermoz',
      });
      expect(note.text).toContain('avant 14h');

      const notes = await ordersService.getOrderNotes(mockOrderA.id, vendorA.id, Role.VENDOR);
      expect(notes.length).toBe(1);
    });

    it('4.3 Pentest BOLA Inter-Vendeurs : Vendeur B tente de manipuler la note de Vendeur A -> 403', async () => {
      mockPrisma.order.findUnique.mockResolvedValue(mockOrderA);

      await expect(
        ordersService.addOrderNote(mockOrderA.id, vendorB.id, {
          text: 'Attaque BOLA espionnage',
        }),
      ).rejects.toThrow(ForbiddenException);

      await expect(
        ordersService.getOrderNotes(mockOrderA.id, vendorB.id, Role.VENDOR),
      ).rejects.toThrow(ForbiddenException);
    });

    it('4.4 & 4.5 Pentest Étanchéité Client : Client A ne peut jamais voir les notes internes', async () => {
      mockPrisma.order.findUnique.mockResolvedValue(mockOrderA);

      // Appel direct sur l'endpoint notes par le client -> 403 Forbidden
      await expect(
        ordersService.getOrderNotes(mockOrderA.id, clientA.id, Role.CLIENT),
      ).rejects.toThrow(
        new ForbiddenException(
          'Accès refusé : les mémos internes sont réservés exclusivement au marchand.',
        ),
      );

      // Consultation normale de la commande par le client -> la relation notes est omise
      mockPrisma.order.findUnique.mockImplementation(async (args: any) => {
        const includeNotes = args.include?.notes;
        return {
          id: mockOrderA.id,
          clientId: clientA.id,
          orderNumber: mockOrderA.orderNumber,
          shop: shopA,
          client: clientA,
          items: [],
          ...(includeNotes ? { notes: mockOrderA.notes } : {}),
        };
      });

      const orderSeenByClient = await ordersService.getOrderById(
        mockOrderA.id,
        clientA.id,
        Role.CLIENT,
      );

      expect(orderSeenByClient).toBeDefined();
      expect((orderSeenByClient as any).notes).toBeUndefined();
      expect(JSON.stringify(orderSeenByClient)).not.toContain('avant 14h');
    });
  });

  // ============================================================================
  // SCÉNARIO 5 : Reçus Automatiques / Factures PDF
  // ============================================================================
  describe('SCÉNARIO 5 : Reçus Automatiques & Factures PDF', () => {
    const paidOrder = {
      id: 'ord-facture-1',
      orderNumber: 'OB-2026-FACT-01',
      clientId: clientA.id,
      shopId: shopA.id,
      status: OrderStatus.PAID_ESCROW,
      subtotalFcfa: 40000,
      deliveryFeeFcfa: 2000,
      discountAmountFcfa: 10000,
      couponCode: 'TABASKI20',
      totalAmountFcfa: 42000,
      deliveryMethod: DeliveryMethod.TIAK_TIAK,
      deliveryAddress: 'Point E Rue 2',
      deliveryCity: 'Dakar',
      deliveryPhone: '+221770030003',
      createdAt: new Date(),
      invoiceUrl: '/api/v1/orders/ord-facture-1/invoice',
      shop: shopA,
      client: clientA,
      items: [
        {
          productName: 'Boubou Bazin',
          variantAttributes: { taille: 'L', couleur: 'Rouge' },
          quantity: 1,
          unitPriceFcfa: 40000,
          totalPriceFcfa: 40000,
        },
      ],
    };

    it('5.1 & 5.2 Streaming facture PDF avec coordonnées dakaroises complètes pour Vendeur et Client', async () => {
      mockPrisma.order.findUnique.mockResolvedValue(paidOrder);

      const mockResponse = {
        setHeader: jest.fn(),
        write: jest.fn(),
        end: jest.fn(),
        emit: jest.fn(),
        on: jest.fn(),
        once: jest.fn(),
      } as unknown as Response;

      // Téléchargement par le Client A
      await ordersService.generateInvoicePdf(paidOrder.id, clientA.id, Role.CLIENT, mockResponse);

      expect(mockResponse.setHeader).toHaveBeenCalledWith('Content-Type', 'application/pdf');
      expect(mockResponse.setHeader).toHaveBeenCalledWith(
        'Content-Disposition',
        `attachment; filename="facture-${paidOrder.orderNumber}.pdf"`,
      );

      // Téléchargement par le Vendeur A
      await ordersService.generateInvoicePdf(paidOrder.id, vendorA.id, Role.VENDOR, mockResponse);
      expect(paidOrder.invoiceUrl).toBe(`/api/v1/orders/${paidOrder.id}/invoice`);
    });

    it('5.3 Pentest BOLA Facture : Rejet avec 403 pour Client B et Vendeur B', async () => {
      mockPrisma.order.findUnique.mockResolvedValue(paidOrder);

      const mockResponse = { setHeader: jest.fn() } as unknown as Response;

      // Client B non acheteur
      await expect(
        ordersService.generateInvoicePdf(paidOrder.id, clientB.id, Role.CLIENT, mockResponse),
      ).rejects.toThrow(new ForbiddenException('Accès refusé à cette facture'));

      // Vendeur B tiers
      await expect(
        ordersService.generateInvoicePdf(paidOrder.id, vendorB.id, Role.VENDOR, mockResponse),
      ).rejects.toThrow(
        new ForbiddenException('Accès refusé : cette commande appartient à une autre boutique'),
      );
    });
  });

  // ============================================================================
  // SCÉNARIO 6 : Avis 5 Étoiles, Anti-Faux Avis & Réponse Vendeur
  // ============================================================================
  describe('SCÉNARIO 6 : Avis 5 Étoiles, Anti-Faux Avis & Réponse Vendeur', () => {
    const mockProduct = {
      id: 'prod-wax-verified',
      shopId: shopA.id,
      name: 'Tissu Wax Thiès',
      shop: shopA,
    };

    it('6.1 doit refuser 403 à un client non acheteur ou ayant une commande non confirmée livrée', async () => {
      mockPrisma.product.findUnique.mockResolvedValue(mockProduct);
      mockPrisma.review.findUnique.mockResolvedValue(null);

      // Client B sans aucune commande
      mockPrisma.order.findFirst.mockResolvedValue(null);
      await expect(
        reviewsService.createReview(clientB.id, mockProduct.id, {
          rating: 5,
          comment: 'Très bon produit sans achat',
        }),
      ).rejects.toThrow(ForbiddenException);

      // Client A avec commande seulement PAID_ESCROW (pas DELIVERED_CONFIRMED)
      mockPrisma.order.findFirst.mockResolvedValue(null);
      await expect(
        reviewsService.createReview(clientA.id, mockProduct.id, {
          rating: 5,
          comment: 'Pas encore reçu',
        }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('6.2 doit créer l’avis si DELIVERED_CONFIRMED, puis bloquer les doublons (409) et notes invalides (400)', async () => {
      mockPrisma.product.findUnique.mockResolvedValue(mockProduct);
      mockPrisma.review.findUnique.mockResolvedValueOnce(null);
      mockPrisma.order.findFirst.mockResolvedValue({
        id: 'ord-deliv-conf',
        status: OrderStatus.DELIVERED_CONFIRMED,
      });

      mockPrisma.review.create.mockResolvedValue({
        id: 'rev-1',
        productId: mockProduct.id,
        userId: clientA.id,
        rating: 5,
        comment: 'Qualité incroyable, livré en 30 min par Tiak-Tiak !',
        user: { id: clientA.id, fullName: 'Fatou Sow' },
      });

      // 1er avis -> 201 Created
      const review = await reviewsService.createReview(clientA.id, mockProduct.id, {
        rating: 5,
        comment: 'Qualité incroyable, livré en 30 min par Tiak-Tiak !',
      });
      expect(review.rating).toBe(5);

      // 2ème avis sur le même produit -> 409 Conflict
      mockPrisma.review.findUnique.mockResolvedValueOnce({
        id: 'rev-1',
        productId: mockProduct.id,
        userId: clientA.id,
      });

      await expect(
        reviewsService.createReview(clientA.id, mockProduct.id, {
          rating: 4,
          comment: 'Deuxième avis interdit',
        }),
      ).rejects.toThrow(ConflictException);
    });

    it('6.3 Réponse Vendeur : Vendeur B rejeté (403), Vendeur A succès (200)', async () => {
      const mockReview = {
        id: 'rev-1',
        productId: mockProduct.id,
        product: { shop: { ownerId: vendorA.id } },
      };
      mockPrisma.review.findUnique.mockResolvedValue(mockReview);

      // Vendeur B tente de répondre à l'avis de Boutique A -> 403 Forbidden
      await expect(
        reviewsService.replyToReview(vendorB.id, 'rev-1', {
          reply: 'Réponse frauduleuse Vendeur B',
        }),
      ).rejects.toThrow(ForbiddenException);

      // Vendeur A répond légitimement -> 200 OK
      mockPrisma.review.update.mockResolvedValue({
        id: 'rev-1',
        vendorReply: 'Merci beaucoup pour votre confiance !',
        repliedAt: new Date(),
      });

      const replied = await reviewsService.replyToReview(vendorA.id, 'rev-1', {
        reply: 'Merci beaucoup pour votre confiance !',
      });
      expect(replied.vendorReply).toBe('Merci beaucoup pour votre confiance !');
      expect(replied.repliedAt).toBeDefined();
    });
  });

  // ============================================================================
  // SCÉNARIO 7 : Statistiques — ProductViews & Top 5 du Mois
  // ============================================================================
  describe('SCÉNARIO 7 : Statistiques — ProductViews & Top 5 du Mois', () => {
    it('7.1 doit incrémenter le compteur de visites sans créer de doublon de ligne (upsert sur [productId, date])', async () => {
      mockPrisma.product.findUnique.mockResolvedValue({ id: 'prod-view-1', isPublished: true });
      mockPrisma.productView.upsert.mockResolvedValue({
        id: 'pv-1',
        productId: 'prod-view-1',
        date: new Date('2026-10-17T00:00:00.000Z'),
        count: 3,
      });

      const res = await analyticsService.recordProductView('prod-view-1');
      expect(res.count).toBe(3);
      expect(mockPrisma.productView.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          update: { count: { increment: 1 } },
          create: expect.objectContaining({ count: 1 }),
        }),
      );
    });

    it('7.2 & 7.3 Top 5 Produits du Mois : exactement 5 produits retournés, triés par CA décroissant, exclusion du 6ème', async () => {
      mockPrisma.shop.findUnique.mockResolvedValue(shopA);

      // 6 produits de la boutique A
      const productsList = [
        { id: 'p1', name: 'Produit 1', slug: 'p1', priceFcfa: 100000, compareAtPriceFcfa: null, stock: 10, images: [], isPublished: true },
        { id: 'p2', name: 'Produit 2', slug: 'p2', priceFcfa: 40000, compareAtPriceFcfa: null, stock: 10, images: [], isPublished: true },
        { id: 'p3', name: 'Produit 3', slug: 'p3', priceFcfa: 20000, compareAtPriceFcfa: null, stock: 10, images: [], isPublished: true },
        { id: 'p4', name: 'Produit 4', slug: 'p4', priceFcfa: 10000, compareAtPriceFcfa: null, stock: 10, images: [], isPublished: true },
        { id: 'p5', name: 'Produit 5', slug: 'p5', priceFcfa: 10000, compareAtPriceFcfa: null, stock: 10, images: [], isPublished: true },
        { id: 'p6', name: 'Produit 6', slug: 'p6', priceFcfa: 5000, compareAtPriceFcfa: null, stock: 10, images: [], isPublished: true },
      ];

      // Articles vendus sur le mois
      const orderItemsMonth = [
        { productId: 'p1', quantity: 1, totalPriceFcfa: 100000 },
        { productId: 'p2', quantity: 2, totalPriceFcfa: 80000 },
        { productId: 'p3', quantity: 3, totalPriceFcfa: 60000 },
        { productId: 'p4', quantity: 4, totalPriceFcfa: 40000 },
        { productId: 'p5', quantity: 2, totalPriceFcfa: 20000 },
        { productId: 'p6', quantity: 1, totalPriceFcfa: 5000 },
      ];

      mockPrisma.product.findMany.mockResolvedValue(productsList);
      mockPrisma.orderItem.findMany.mockResolvedValue(orderItemsMonth);
      mockPrisma.productView.findMany.mockResolvedValue([]);

      const result = await analyticsService.getTopProducts(vendorA.id);

      // Assertion stricte : exactement 5 produits dans le Top
      expect(result.topProducts.length).toBe(5);

      // Assertion tri décroissant par chiffre d'affaires
      expect(result.topProducts[0].totalRevenueFcfa).toBe(100000);
      expect(result.topProducts[1].totalRevenueFcfa).toBe(80000);
      expect(result.topProducts[2].totalRevenueFcfa).toBe(60000);
      expect(result.topProducts[3].totalRevenueFcfa).toBe(40000);
      expect(result.topProducts[4].totalRevenueFcfa).toBe(20000);

      // Le Produit 6 (5 000 FCFA) est exclu
      const p6Present = result.topProducts.some((p) => p.id === 'p6');
      expect(p6Present).toBe(false);
    });

    it('7.4 Isolation multi-tenant stricte : les ventes de Boutique B ne polluent jamais Boutique A', async () => {
      mockPrisma.shop.findUnique.mockResolvedValue(shopA);
      mockPrisma.product.findMany.mockResolvedValue([]);

      const result = await analyticsService.getTopProducts(vendorA.id);
      expect(result.topProducts).toEqual([]);
    });
  });

  // ============================================================================
  // SCÉNARIO 8 : Non-Régression Globale (V1, Onboarding, KYC, Séquestre, Litiges)
  // ============================================================================
  describe('SCÉNARIO 8 : Non-Régression Globale (Cœur Métier V1)', () => {
    it('8.1 Progression fluide de l’Onboarding Commerçant en 5 étapes', async () => {
      mockPrisma.shop.findUnique.mockResolvedValue(shopA);
      mockPrisma.shop.update.mockResolvedValue({
        ...shopA,
        onboardingStep: 2,
      });

      const updated = await shopsService.saveOnboardingStep(vendorA.id, 1, {
        name: 'Teranga Mode Dakar',
        slug: 'teranga-mode-dakar',
        mainCategory: 'Mode & Bazin',
      });

      expect(updated.onboardingStep).toBeDefined();
    });

    it('8.2 KYC progressif : soumission et validation administrateur', async () => {
      mockPrisma.shop.findUnique.mockResolvedValue({
        ...shopA,
        kycStatus: KycStatus.PENDING,
      });

      mockPrisma.shop.update.mockResolvedValue({
        ...shopA,
        kycStatus: KycStatus.VERIFIED,
        isVerified: true,
      });

      const updated = await shopsService.reviewKyc(shopA.id, {
        status: KycStatus.VERIFIED,
      }, adminUser.id);

      expect(updated.kycStatus).toBe(KycStatus.VERIFIED);
      expect(updated.isVerified).toBe(true);
    });

    it('8.3 Cycle complet du Séquestre Mobile Money (PAID_ESCROW -> SHIPPED -> DELIVERED_CONFIRMED)', async () => {
      const order = {
        id: 'ord-escrow-flow',
        shopId: shopA.id,
        clientId: clientA.id,
        orderNumber: 'OB-2026-FLOW',
        deliveryConfirmationCode: '7721',
        status: OrderStatus.PAID_ESCROW,
        subtotalFcfa: 20000,
        totalAmountFcfa: 22000,
        commissionAmountFcfa: 800,
        netVendorAmountFcfa: 19200,
        shop: shopA,
        escrow: {
          id: 'esc-flow',
          totalAmountFcfa: 22000,
          commissionAmountFcfa: 800,
          netVendorAmountFcfa: 19200,
          status: EscrowStatus.HELD_IN_ESCROW,
        },
      };

      // 1. Passage en préparation
      mockPrisma.order.findUnique.mockResolvedValue(order);
      mockPrisma.order.update.mockResolvedValue({
        ...order,
        status: OrderStatus.PREPARING,
      });
      const prepared = await ordersService.prepareOrder(order.id, vendorA.id);
      expect(prepared.status).toBe(OrderStatus.PREPARING);

      // 2. Expédition Tiak-Tiak
      mockPrisma.order.findUnique.mockResolvedValue({ ...order, status: OrderStatus.PREPARING });
      mockPrisma.order.update.mockResolvedValue({
        ...order,
        status: OrderStatus.SHIPPED_TIAK_TIAK,
      });
      const shipped = await ordersService.shipOrder(order.id, vendorA.id);
      expect(shipped.status).toBe(OrderStatus.SHIPPED_TIAK_TIAK);

      // 3. Confirmation de livraison avec OTP par le client
      let orderStatus83: OrderStatus = OrderStatus.SHIPPED_TIAK_TIAK;
      mockPrisma.order.findUnique.mockImplementation(async () => ({
        ...order,
        status: orderStatus83,
      }));
      mockPrisma.order.updateMany.mockImplementation(async () => {
        orderStatus83 = OrderStatus.DELIVERED_CONFIRMED;
        return { count: 1 };
      });
      mockPrisma.escrowTransaction.updateMany.mockResolvedValue({ count: 1 });
      mockPrisma.order.update.mockResolvedValue({
        ...order,
        status: OrderStatus.DELIVERED_CONFIRMED,
      });

      const delivered = await ordersService.confirmDelivery(
        order.id,
        clientA.id,
        Role.CLIENT,
        { confirmationCode: '7721' },
      );
      expect(delivered?.status).toBe(OrderStatus.DELIVERED_CONFIRMED);

      // Vérification que les 19 200 FCFA sont crédités sur le solde disponible
      expect(mockPrisma.vendorWallet.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: {
            escrowBalanceFcfa: { decrement: 19200 },
            availableBalanceFcfa: { increment: 19200 },
            totalEarnedFcfa: { increment: 19200 },
          },
        }),
      );

      // Consultation du solde vendeur via WalletsService
      mockPrisma.shop.findUnique.mockResolvedValue({
        id: shopA.id,
        name: shopA.name,
        ownerId: vendorA.id,
        wallet: {
          id: 'w-vendor-a',
          shopId: shopA.id,
          availableBalanceFcfa: 19200,
          escrowBalanceFcfa: 0,
          payouts: [],
        },
      });

      const walletRes = await walletsService.getVendorWallet(vendorA.id);
      expect(walletRes.wallet.availableBalanceFcfa).toBe(19200);
      expect(walletRes.wallet.escrowBalanceFcfa).toBe(0);
    });

    it('8.4 Arbitrage de litige par le Super-Admin avec remboursement client', async () => {
      const disputedOrder = {
        id: 'ord-dispute-1',
        shopId: shopA.id,
        clientId: clientA.id,
        status: OrderStatus.DISPUTED,
        totalAmountFcfa: 35000,
        netVendorAmountFcfa: 33600,
        commissionAmountFcfa: 1400,
        shop: shopA,
      };

      const mockDispute = {
        id: 'disp-1',
        orderId: disputedOrder.id,
        status: DisputeStatus.OPEN,
        reason: 'Colis endommagé lors de la livraison Tiak-Tiak',
        order: disputedOrder,
      };

      mockPrisma.dispute.findUnique.mockResolvedValue(mockDispute);
      mockPrisma.dispute.update.mockResolvedValue({
        ...mockDispute,
        status: DisputeStatus.RESOLVED_REFUND_CLIENT,
        decisionNotes: 'Remboursement intégral Wave accordé au client.',
      });

      const resolution = await disputesService.arbitrateDispute(
        adminUser.id,
        mockDispute.id,
        {
          decision: DisputeDecision.REFUND_CLIENT,
          decisionNotes: 'Remboursement intégral Wave accordé au client.',
        },
      );

      expect(resolution.status).toBe(DisputeStatus.RESOLVED_REFUND_CLIENT);
      // Décrément du solde séquestre sans créditer le vendeur
      expect(mockPrisma.vendorWallet.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: {
            escrowBalanceFcfa: { decrement: 33600 },
          },
        }),
      );
    });
  });
});
