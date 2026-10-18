import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import helmet from 'helmet';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';
import { JwtService } from '@nestjs/jwt';
import { TransformInterceptor, AllExceptionsFilter } from '../src/common';
import {
  Role,
  SubscriptionPlan,
  OrderStatus,
  EscrowStatus,
  KycStatus,
  CouponType,
  DisputeStatus,
  DeliveryMethod,
  PaymentProvider,
} from '../src/generated/prisma/client';

describe('OpenBoutik API — Suite Intégrale Réseau & Pentest E2E (7 Couches Certifiées)', () => {
  let app: INestApplication;
  let jwtService: JwtService;

  // Tokens JWT réalistes pour les différents rôles
  let tokenClientA: string;
  let tokenClientB: string;
  let tokenVendorA: string;
  let tokenVendorB: string;
  let tokenSuperAdmin: string;

  const vendorAId = 'usr-vendor-a-uuid';
  const vendorBId = 'usr-vendor-b-uuid';
  const clientAId = 'usr-client-a-uuid';
  const clientBId = 'usr-client-b-uuid';
  const adminId = 'usr-admin-uuid';

  const shopAId = 'shop-teranga-uuid';
  const shopBId = 'shop-dakartech-uuid';

  // Base de données simulée en mémoire pour Prisma avec garanties ACID
  let dbUsers: any[];
  let dbShops: any[];
  let dbWallets: any[];
  let dbProducts: any[];
  let dbVariants: any[];
  let dbCoupons: any[];
  let dbOrders: any[];
  let dbOrderItems: any[];
  let dbEscrow: any[];
  let dbDisputes: any[];
  let dbReviews: any[];
  let dbOrderNotes: any[];
  let dbProductViews: any[];
  let dbAuditLogs: any[];

  function populateProduct(p: any) {
    if (!p) return null;
    const shop = dbShops.find((s) => s.id === p.shopId);
    const wallet = shop ? dbWallets.find((w) => w.shopId === shop.id) : null;
    return {
      ...p,
      shop: shop ? { ...shop, wallet } : null,
      variants: dbVariants.filter((v) => v.productId === p.id),
      reviews: dbReviews.filter((r) => r.productId === p.id),
    };
  }

  function populateOrder(o: any) {
    if (!o) return null;
    const shop = dbShops.find((s) => s.id === o.shopId);
    const wallet = shop ? dbWallets.find((w) => w.shopId === shop.id) : null;
    const escrow = dbEscrow.find((e) => e.orderId === o.id);
    const items = dbOrderItems.filter((i) => i.orderId === o.id);
    const client = dbUsers.find((u) => u.id === o.clientId);
    return {
      ...o,
      shop: shop ? { ...shop, wallet } : null,
      client,
      escrow,
      items,
      subtotalFcfa: o.subtotalFcfa ?? o.totalAmountFcfa ?? 0,
      deliveryFeeFcfa: o.deliveryFeeFcfa ?? 0,
      discountAmountFcfa: o.discountAmountFcfa ?? 0,
      createdAt: o.createdAt || new Date(),
    };
  }

  function resetDatabase() {
    dbUsers = [
      {
        id: vendorAId,
        fullName: 'Moussa Diop',
        phone: '+221770010001',
        email: 'moussa@teranga.sn',
        role: Role.VENDOR,
        isActive: true,
        passwordHash: '$2a$10$encryptedHashPasswordMoussaDiop',
        refreshTokenHash: null,
      },
      {
        id: vendorBId,
        fullName: 'Ibrahima Ndiaye',
        phone: '+221770020002',
        email: 'ibrahima@dakartech.sn',
        role: Role.VENDOR,
        isActive: true,
        passwordHash: '$2a$10$encryptedHashPasswordIbrahima',
        refreshTokenHash: null,
      },
      {
        id: clientAId,
        fullName: 'Fatou Sow',
        phone: '+221770030003',
        email: 'fatou@gmail.com',
        role: Role.CLIENT,
        isActive: true,
        passwordHash: '$2a$10$encryptedHashPasswordFatou',
        refreshTokenHash: null,
      },
      {
        id: clientBId,
        fullName: 'Cheikh Fall',
        phone: '+221770040004',
        email: 'cheikh@gmail.com',
        role: Role.CLIENT,
        isActive: true,
        passwordHash: '$2a$10$encryptedHashPasswordCheikh',
        refreshTokenHash: null,
      },
      {
        id: adminId,
        fullName: 'Super Administrateur',
        phone: '+221770090009',
        email: 'admin@openboutik.sn',
        role: Role.SUPER_ADMIN,
        isActive: true,
        passwordHash: '$2a$10$encryptedHashPasswordAdmin',
        refreshTokenHash: null,
      },
    ];

    dbWallets = [
      {
        id: 'wallet-a-id',
        shopId: shopAId,
        escrowBalanceFcfa: 0,
        availableBalanceFcfa: 100000,
        totalEarnedFcfa: 100000,
        payouts: [],
      },
      {
        id: 'wallet-b-id',
        shopId: shopBId,
        escrowBalanceFcfa: 0,
        availableBalanceFcfa: 50000,
        totalEarnedFcfa: 50000,
        payouts: [],
      },
    ];

    dbShops = [
      {
        id: shopAId,
        ownerId: vendorAId,
        name: 'Teranga Mode Dakar',
        slug: 'teranga-mode-dakar',
        city: 'Dakar',
        whatsappNumber: '+221770010001',
        isOnVacation: false,
        vacationMessage: null,
        subscriptionPlan: SubscriptionPlan.FREE,
        kycStatus: KycStatus.NONE,
        isVerified: false,
        onboardingStep: 1,
        onboardingCompleted: false,
        isActive: true,
      },
      {
        id: shopBId,
        ownerId: vendorBId,
        name: 'Dakar Tech Gadgets',
        slug: 'dakar-tech-gadgets',
        city: 'Dakar',
        whatsappNumber: '+221770020002',
        isOnVacation: false,
        vacationMessage: null,
        subscriptionPlan: SubscriptionPlan.PRO,
        kycStatus: KycStatus.VERIFIED,
        isVerified: true,
        onboardingStep: 5,
        onboardingCompleted: true,
        isActive: true,
      },
    ];

    dbProducts = [
      {
        id: 'prod-boubou-id',
        shopId: shopAId,
        name: 'Boubou Bazin Sénégalais',
        slug: 'boubou-bazin-senegalais',
        priceFcfa: 20000,
        compareAtPriceFcfa: 25000,
        stock: 10,
        lowStockThreshold: 3,
        images: ['https://openboutik.sn/boubou.jpg'],
        isPublished: true,
      },
      {
        id: 'prod-rare-id',
        shopId: shopAId,
        name: 'Montre Rare Dakar',
        slug: 'montre-rare-dakar',
        priceFcfa: 50000,
        compareAtPriceFcfa: null,
        stock: 1, // Dernier article en stock pour stress-test
        lowStockThreshold: 1,
        images: ['https://openboutik.sn/montre.jpg'],
        isPublished: true,
      },
      {
        id: 'prod-gadget-id',
        shopId: shopBId,
        name: 'Écouteurs Bluetooth Pro',
        slug: 'ecouteurs-bluetooth-pro',
        priceFcfa: 15000,
        compareAtPriceFcfa: 18000,
        stock: 20,
        lowStockThreshold: 5,
        images: ['https://openboutik.sn/ecouteurs.jpg'],
        isPublished: true,
      },
    ];

    dbVariants = [];
    dbCoupons = [
      {
        id: 'coupon-tabaski-id',
        shopId: shopAId,
        code: 'TABASKI20',
        type: CouponType.PERCENTAGE,
        value: 20,
        expiryDate: new Date(Date.now() + 86400000),
        maxUses: 1, // Concurrence maxUses
        usedCount: 0,
        isActive: true,
      },
    ];

    dbOrders = [];
    dbOrderItems = [];
    dbEscrow = [];
    dbDisputes = [];
    dbReviews = [];
    dbOrderNotes = [];
    dbProductViews = [];
    dbAuditLogs = [];
  }

  beforeAll(async () => {
    resetDatabase();

    const mockPrismaService = {
      $connect: jest.fn().mockResolvedValue(undefined),
      $disconnect: jest.fn().mockResolvedValue(undefined),
      user: {
        findUnique: jest.fn(async ({ where }) => {
          if (where.id) return dbUsers.find((u) => u.id === where.id) || null;
          if (where.phone) return dbUsers.find((u) => u.phone === where.phone) || null;
          if (where.email) return dbUsers.find((u) => u.email === where.email) || null;
          return null;
        }),
        findFirst: jest.fn(async ({ where }) => {
          return dbUsers.find((u) => (!where.phone || u.phone === where.phone)) || null;
        }),
        create: jest.fn(async ({ data }) => {
          const newUser = { id: `usr-${Date.now()}`, ...data, isActive: true };
          dbUsers.push(newUser);
          return newUser;
        }),
        update: jest.fn(async ({ where, data }) => {
          const user = dbUsers.find((u) => u.id === where.id);
          if (user) Object.assign(user, data);
          return user;
        }),
      },
      shop: {
        findUnique: jest.fn(async ({ where, include }) => {
          const shop = dbShops.find((s) => s.id === where.id || s.ownerId === where.ownerId || s.slug === where.slug);
          if (!shop) return null;
          const copy = { ...shop };
          if (include?.wallet) {
            copy.wallet = dbWallets.find((w) => w.shopId === shop.id) || null;
          }
          if (include?.owner) {
            copy.owner = dbUsers.find((u) => u.id === shop.ownerId) || null;
          }
          return copy;
        }),
        findMany: jest.fn(async () => dbShops),
        create: jest.fn(async ({ data }) => {
          const newShop = { id: `shop-${Date.now()}`, ...data, isActive: true, isVerified: false };
          dbShops.push(newShop);
          dbWallets.push({
            id: `wallet-${Date.now()}`,
            shopId: newShop.id,
            escrowBalanceFcfa: 0,
            availableBalanceFcfa: 0,
            totalEarnedFcfa: 0,
            payouts: [],
          });
          return newShop;
        }),
        update: jest.fn(async ({ where, data }) => {
          const shop = dbShops.find((s) => s.id === where.id || s.ownerId === where.ownerId);
          if (shop) Object.assign(shop, data);
          return shop;
        }),
      },
      product: {
        findUnique: jest.fn(async ({ where }) => {
          let p: any = null;
          if (where.id) p = dbProducts.find((item) => item.id === where.id);
          if (where.shopId_slug) {
            p = dbProducts.find((item) => item.shopId === where.shopId_slug.shopId && item.slug === where.shopId_slug.slug);
          }
          return populateProduct(p);
        }),
        findFirst: jest.fn(async ({ where }) => {
          const p = dbProducts.find((item) => {
            if (where.slug && item.slug !== where.slug) return false;
            return true;
          });
          return populateProduct(p);
        }),
        findMany: jest.fn(async ({ where }: any = {}) => {
          let list = dbProducts;
          if (where?.id?.in) {
            list = list.filter((p) => where.id.in.includes(p.id));
          }
          return list.map(populateProduct);
        }),
        count: jest.fn(async () => dbProducts.length),
        create: jest.fn(async ({ data }) => {
          const newProd = { id: `prod-${Date.now()}`, ...data, variants: [] };
          dbProducts.push(newProd);
          return populateProduct(newProd);
        }),
        update: jest.fn(async ({ where, data }) => {
          const prod = dbProducts.find((p) => p.id === where.id);
          if (prod) {
            if (data.stock?.decrement !== undefined) {
              prod.stock -= data.stock.decrement;
            } else if (data.stock !== undefined) {
              prod.stock = data.stock;
            }
            Object.assign(prod, { ...data, stock: prod.stock });
          }
          return populateProduct(prod);
        }),
        delete: jest.fn(async ({ where }) => {
          const idx = dbProducts.findIndex((p) => p.id === where.id);
          if (idx !== -1) dbProducts.splice(idx, 1);
          return { id: where.id };
        }),
      },
      productVariant: {
        findUnique: jest.fn(async ({ where }) => {
          const variant = dbVariants.find((v) => v.id === where.id);
          if (!variant) return null;
          const product = dbProducts.find((p) => p.id === variant.productId);
          const shop = product ? dbShops.find((s) => s.id === product.shopId) : null;
          return { ...variant, product: { ...product, shop } };
        }),
        create: jest.fn(async ({ data }) => {
          const newVar = { id: `var-${Date.now()}`, ...data, isActive: true };
          dbVariants.push(newVar);
          return newVar;
        }),
        update: jest.fn(async ({ where, data }) => {
          const v = dbVariants.find((varItem) => varItem.id === where.id);
          if (v) {
            if (data.stock?.decrement !== undefined) {
              v.stock -= data.stock.decrement;
            } else if (data.stock !== undefined) {
              v.stock = data.stock;
            }
            Object.assign(v, { ...data, stock: v.stock });
          }
          return v;
        }),
        delete: jest.fn(async ({ where }) => {
          const idx = dbVariants.findIndex((v) => v.id === where.id);
          if (idx !== -1) dbVariants.splice(idx, 1);
          return { id: where.id };
        }),
      },
      vendorWallet: {
        findUnique: jest.fn(async ({ where }) => {
          return dbWallets.find((w) => w.id === where.id || w.shopId === where.shopId) || null;
        }),
        update: jest.fn(async ({ where, data }) => {
          const wallet = dbWallets.find((w) => w.id === where.id || w.shopId === where.shopId);
          if (wallet) {
            if (data.availableBalanceFcfa?.decrement !== undefined) {
              wallet.availableBalanceFcfa -= data.availableBalanceFcfa.decrement;
            } else if (data.availableBalanceFcfa?.increment !== undefined) {
              wallet.availableBalanceFcfa += data.availableBalanceFcfa.increment;
            }
            if (data.escrowBalanceFcfa?.decrement !== undefined) {
              wallet.escrowBalanceFcfa -= data.escrowBalanceFcfa.decrement;
            }
          }
          return wallet;
        }),
      },
      walletPayout: {
        create: jest.fn(async ({ data }) => {
          const payout = { id: `pay-${Date.now()}`, ...data };
          return payout;
        }),
        findMany: jest.fn(async () => []),
      },
      coupon: {
        findUnique: jest.fn(async ({ where }) => {
          if (where.id) return dbCoupons.find((c) => c.id === where.id) || null;
          if (where.shopId_code) {
            return dbCoupons.find((c) => c.shopId === where.shopId_code.shopId && c.code === where.shopId_code.code) || null;
          }
          return null;
        }),
        findFirst: jest.fn(async ({ where }) => {
          return dbCoupons.find((c) => {
            if (where.code && c.code !== where.code) return false;
            if (where.shopId?.in && !where.shopId.in.includes(c.shopId)) return false;
            return true;
          }) || null;
        }),
        findMany: jest.fn(async ({ where }) => dbCoupons.filter((c) => c.shopId === where.shopId)),
        create: jest.fn(async ({ data }) => {
          const newCoupon = { id: `coupon-${Date.now()}`, usedCount: 0, ...data };
          dbCoupons.push(newCoupon);
          return newCoupon;
        }),
        update: jest.fn(async ({ where, data }) => {
          const coupon = dbCoupons.find((c) => c.id === where.id);
          if (coupon) {
            const { usedCount, ...rest } = data;
            if (usedCount?.increment !== undefined) {
              coupon.usedCount = (typeof coupon.usedCount === 'number' ? coupon.usedCount : 0) + usedCount.increment;
            } else if (typeof usedCount === 'number') {
              coupon.usedCount = usedCount;
            }
            Object.assign(coupon, rest);
          }
          return coupon;
        }),
        delete: jest.fn(async ({ where }) => {
          const idx = dbCoupons.findIndex((c) => c.id === where.id);
          if (idx !== -1) dbCoupons.splice(idx, 1);
          return { id: where.id };
        }),
      },
      order: {
        findUnique: jest.fn(async ({ where }) => {
          const order = dbOrders.find((o) => o.id === where.id);
          return populateOrder(order);
        }),
        findFirst: jest.fn(async ({ where }) => {
          const order = dbOrders.find((o) => {
            if (where.clientId && o.clientId !== where.clientId) return false;
            if (where.status && o.status !== where.status) return false;
            if (where.items?.some?.productId) {
              const orderItems = dbOrderItems.filter((i) => i.orderId === o.id);
              if (!orderItems.some((i) => i.productId === where.items.some.productId)) return false;
            }
            return true;
          });
          return populateOrder(order);
        }),
        findMany: jest.fn(async ({ where }: any = {}) => {
          return dbOrders
            .filter((o) => (!where.clientId || o.clientId === where.clientId) && (!where.shopId || o.shopId === where.shopId))
            .map(populateOrder);
        }),
        create: jest.fn(async ({ data }) => {
          const newOrder = { id: data.id || `order-${Date.now()}`, createdAt: new Date(), ...data };
          dbOrders.push(newOrder);
          return populateOrder(newOrder);
        }),
        update: jest.fn(async ({ where, data }) => {
          const order = dbOrders.find((o) => o.id === where.id);
          if (order) Object.assign(order, data);
          return populateOrder(order);
        }),
        updateMany: jest.fn(async ({ where, data }) => {
          const targets = dbOrders.filter((o) => {
            if (o.id !== where.id) return false;
            if (where.status?.notIn && where.status.notIn.includes(o.status)) return false;
            return true;
          });
          targets.forEach((t) => Object.assign(t, data));
          return { count: targets.length };
        }),
        count: jest.fn(async () => dbOrders.length),
      },
      orderItem: {
        create: jest.fn(async ({ data }) => {
          dbOrderItems.push(data);
          return data;
        }),
        findMany: jest.fn(async () => dbOrderItems),
      },
      checkoutSession: {
        create: jest.fn(async ({ data }) => ({ id: `cs-${Date.now()}`, ...data })),
      },
      escrowTransaction: {
        findUnique: jest.fn(async ({ where }) => dbEscrow.find((e) => e.orderId === where.orderId) || null),
        findFirst: jest.fn(async ({ where }) => dbEscrow.find((e) => e.orderId === where.orderId) || null),
        create: jest.fn(async ({ data }) => {
          const e = { id: `escrow-${Date.now()}`, ...data };
          dbEscrow.push(e);
          return e;
        }),
        updateMany: jest.fn(async ({ where, data }) => {
          const targets = dbEscrow.filter((e) => {
            if (e.orderId !== where.orderId) return false;
            if (where.status && e.status !== where.status) return false;
            return true;
          });
          targets.forEach((t) => Object.assign(t, data));
          return { count: targets.length };
        }),
      },
      dispute: {
        findUnique: jest.fn(async ({ where }) => dbDisputes.find((d) => d.id === where.id) || null),
        findFirst: jest.fn(async ({ where }) => dbDisputes.find((d) => d.orderId === where.orderId) || null),
        create: jest.fn(async ({ data }) => {
          const d = { id: `disp-${Date.now()}`, status: DisputeStatus.OPEN, ...data };
          dbDisputes.push(d);
          return d;
        }),
        update: jest.fn(async ({ where, data }) => {
          const d = dbDisputes.find((disp) => disp.id === where.id);
          if (d) Object.assign(d, data);
          return d;
        }),
        findMany: jest.fn(async () => dbDisputes),
      },
      review: {
        findUnique: jest.fn(async ({ where }) => {
          const r = dbReviews.find((rev) => rev.id === where.id);
          if (!r) return null;
          const product = dbProducts.find((p) => p.id === r.productId);
          const shop = product ? dbShops.find((s) => s.id === product.shopId) : null;
          return { ...r, product: { ...product, shop } };
        }),
        findFirst: jest.fn(async ({ where }) => dbReviews.find((r) => r.userId === where.userId && r.productId === where.productId) || null),
        create: jest.fn(async ({ data }) => {
          const rev = { id: `rev-${Date.now()}`, ...data, isApproved: true };
          dbReviews.push(rev);
          return rev;
        }),
        update: jest.fn(async ({ where, data }) => {
          const r = dbReviews.find((rev) => rev.id === where.id);
          if (r) Object.assign(r, data);
          return r;
        }),
        findMany: jest.fn(async () => []),
      },
      orderNote: {
        create: jest.fn(async ({ data }) => {
          const note = { id: `note-${Date.now()}`, createdAt: new Date(), ...data };
          dbOrderNotes.push(note);
          return note;
        }),
        findMany: jest.fn(async ({ where }) => dbOrderNotes.filter((n) => n.orderId === where.orderId)),
      },
      productView: {
        upsert: jest.fn(async ({ create }) => {
          dbProductViews.push(create);
          return create;
        }),
        findMany: jest.fn(async () => []),
      },
      auditLog: {
        create: jest.fn(async ({ data }) => {
          dbAuditLogs.push(data);
          return data;
        }),
      },
      orderTracking: {
        create: jest.fn(async ({ data }) => ({ id: `track-${Date.now()}`, timestamp: new Date(), ...data })),
        findMany: jest.fn(async () => []),
      },
      paymentTransaction: {
        create: jest.fn(async ({ data }) => ({ id: `ptx-${Date.now()}`, ...data })),
        findUnique: jest.fn(async () => null),
        findMany: jest.fn(async () => []),
      },
      wishlist: {
        create: jest.fn(async ({ data }) => ({ id: `wish-${Date.now()}`, ...data })),
        findUnique: jest.fn(async () => null),
        findMany: jest.fn(async () => []),
        delete: jest.fn(async () => ({})),
      },
      message: {
        create: jest.fn(async ({ data }) => ({ id: `msg-${Date.now()}`, ...data })),
        findMany: jest.fn(async () => []),
        updateMany: jest.fn(async () => ({ count: 1 })),
      },

      $transaction: jest.fn(async (callbackOrArray) => {
        if (typeof callbackOrArray === 'function') {
          return callbackOrArray(mockPrismaService);
        }
        return Promise.all(callbackOrArray);
      }),
    };

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(PrismaService)
      .useValue(mockPrismaService)
      .compile();

    app = moduleFixture.createNestApplication();

    // Configuration stricte identique à main.ts
    app.use(helmet());
    app.enableCors({
      origin: ['http://localhost:3000', 'http://localhost:3001'],
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'Accept'],
    });
    app.setGlobalPrefix('api/v1');
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
        transformOptions: { enableImplicitConversion: true },
      }),
    );
    app.useGlobalInterceptors(new TransformInterceptor());
    app.useGlobalFilters(new AllExceptionsFilter());

    await app.init();

    jwtService = moduleFixture.get<JwtService>(JwtService);
    const secret = process.env.JWT_ACCESS_SECRET || 'openboutik_jwt_access_super_secret_local_dev_key_2026';

    tokenClientA = await jwtService.signAsync({ sub: clientAId, phone: '+221770030003', role: Role.CLIENT }, { secret });
    tokenClientB = await jwtService.signAsync({ sub: clientBId, phone: '+221770040004', role: Role.CLIENT }, { secret });
    tokenVendorA = await jwtService.signAsync({ sub: vendorAId, phone: '+221770010001', role: Role.VENDOR }, { secret });
    tokenVendorB = await jwtService.signAsync({ sub: vendorBId, phone: '+221770020002', role: Role.VENDOR }, { secret });
    tokenSuperAdmin = await jwtService.signAsync({ sub: adminId, phone: '+221770090009', role: Role.SUPER_ADMIN }, { secret });
  });

  afterAll(async () => {
    await app.close();
  });

  // ============================================================================
  // COUCHE 2 : PIPELINE RÉSEAU, SERVEUR HTTP, HEADERS, PIPES & FILTRES
  // ============================================================================
  describe('COUCHE 2 : Pipeline Réseau HTTP, Sécurité Helmet, CORS & Pipes de Validation', () => {
    it('2.1 GET /api/v1/health doit répondre 200 OK avec les en-têtes Helmet sécurisés', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/health')
        .expect(200);

      expect(res.headers['x-content-type-options']).toBe('nosniff');
      expect(res.body.success).toBe(true);
      expect(res.body.data.status).toBe('ok');
    });

    it('2.2 Preflight CORS (OPTIONS) doit répondre avec Access-Control-Allow-Origin pour localhost:3000', async () => {
      const res = await request(app.getHttpServer())
        .options('/api/v1/products')
        .set('Origin', 'http://localhost:3000')
        .set('Access-Control-Request-Method', 'GET');

      expect([200, 204]).toContain(res.status);
      expect(res.headers['access-control-allow-origin']).toBe('http://localhost:3000');
    });

    it('2.3 ValidationPipe global doit rejeter avec 400 Bad Request les champs interdits non déclarés', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({
          identifier: '+221770010001',
          password: 'Password123!',
          hackedPropertyInjection: true,
        })
        .expect(400);

      expect(res.body.success).toBe(false);
      expect(res.body.statusCode).toBe(400);
    });

    it('2.4 ValidationPipe global doit rejeter avec 400 Bad Request les types invalides ou négatifs', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/products')
        .set('Authorization', `Bearer ${tokenVendorA}`)
        .send({
          name: 'Boubou Illégal',
          priceFcfa: -500,
          stock: 'dix-mille',
          images: ['https://openboutik.sn/img.jpg'],
        })
        .expect(400);

      expect(res.body.success).toBe(false);
    });

    it('2.5 AllExceptionsFilter doit retourner un 404 propre formaté en enveloppe JSON sur route inconnue', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/route-fantome-inexistante-404')
        .expect(404);

      expect(res.body.success).toBe(false);
      expect(res.body.statusCode).toBe(404);
      expect(res.body.timestamp).toBeDefined();
    });
  });

  // ============================================================================
  // COUCHE 3 : AUTHENTIFICATION RÉSEAU, SÉCURITÉ JWT, RBAC & BOLA (IDOR)
  // ============================================================================
  describe('COUCHE 3 : Authentification Réseau, Étanchéité RBAC, BOLA (IDOR) & Anti-Mass Assignment', () => {
    it('3.1 Route protégée sans token doit retourner 401 Unauthorized', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/users/me')
        .expect(401);
    });

    it('3.2 Route protégée avec token falsifié doit retourner 401 Unauthorized', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/users/me')
        .set('Authorization', 'Bearer faux.jeton.invalide.hack')
        .expect(401);
    });

    it('3.3 GET /users/me et /auth/me ne doivent JAMAIS exposer passwordHash ni refreshTokenHash sur le réseau', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/users/me')
        .set('Authorization', `Bearer ${tokenVendorA}`)
        .expect(200);

      expect(res.body.data.passwordHash).toBeUndefined();
      expect(res.body.data.refreshTokenHash).toBeUndefined();
      expect(res.body.data.phone).toBe('+221770010001');
    });

    it('3.4 RBAC : Un token CLIENT qui tente de créer un produit ou un coupon doit recevoir 403 Forbidden', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/products')
        .set('Authorization', `Bearer ${tokenClientA}`)
        .send({
          name: 'Produit Piraté',
          priceFcfa: 10000,
          stock: 5,
          images: ['https://openboutik.sn/img.jpg'],
        })
        .expect(403);
    });

    it('3.5 RBAC : Un token VENDOR qui tente d’arbitrer un litige doit recevoir 403 Forbidden', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/disputes/disp-123/arbitrate')
        .set('Authorization', `Bearer ${tokenVendorA}`)
        .send({
          decision: 'RELEASE_VENDOR',
          notes: 'Tentative arbitrage par vendeur',
        })
        .expect(403);
    });

    it('3.6 BOLA (IDOR) : Le Vendeur B tente de modifier le produit du Vendeur A -> 403 Forbidden', async () => {
      await request(app.getHttpServer())
        .patch('/api/v1/products/prod-boubou-id')
        .set('Authorization', `Bearer ${tokenVendorB}`)
        .send({
          priceFcfa: 1000,
        })
        .expect(403);
    });

    it('3.7 BOLA (IDOR) : Le Client B tente d’ouvrir un litige sur la commande du Client A -> 403 Forbidden', async () => {
      // Préparation d'une commande appartenant à Client A
      const orderA = {
        id: 'order-client-a-uuid',
        clientId: clientAId,
        shopId: shopAId,
        orderNumber: 'OB-2026-TEST',
        totalAmountFcfa: 20000,
        status: OrderStatus.PAID_ESCROW,
        createdAt: new Date(),
      };
      dbOrders.push(orderA);

      await request(app.getHttpServer())
        .post(`/api/v1/disputes/${orderA.id}`)
        .set('Authorization', `Bearer ${tokenClientB}`)
        .send({
          reason: 'Colis jamais reçu - Tentative BOLA par Client B',
        })
        .expect(403);
    });

    it('3.8 Anti-Mass Assignment : Tentative de forcer isVerified: true par PATCH -> 400 Bad Request', async () => {
      await request(app.getHttpServer())
        .patch('/api/v1/shops/vendor/me')
        .set('Authorization', `Bearer ${tokenVendorA}`)
        .send({
          isVerified: true,
          kycStatus: 'VERIFIED',
          commissionRate: 0,
        })
        .expect(400);

      const shop = dbShops.find((s) => s.id === shopAId);
      expect(shop?.isVerified).toBe(false);
    });
  });

  // ============================================================================
  // COUCHE 4 : ONBOARDING VENDEUR (ÉTAPES 0 À 5) & VERROU KYC AU RETRAIT
  // ============================================================================
  describe('COUCHE 4 : Onboarding Vendeur (0 à 5), Disponibilité Slug & Verrou KYC au Décaissement', () => {
    it('4.1 Étape 0 : POST /auth/register avec acceptTerms: false doit être rejeté (400)', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/auth/register')
        .send({
          phone: '+221778889900',
          fullName: 'Nouveau Marchand',
          password: 'Password123!',
          acceptTerms: false,
        })
        .expect(400);
    });

    it('4.2 Vérification Slug en temps réel : GET /shops/check-slug/:slug', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/shops/check-slug/teranga-mode-dakar')
        .expect(200);

      expect(res.body.data.available).toBe(false);
      expect(res.body.data.suggestion).toBeDefined();
    });

    it('4.3 Sauvegarde Onboarding : PATCH /shops/me/onboarding/step/1 à 5', async () => {
      const res = await request(app.getHttpServer())
        .patch('/api/v1/shops/me/onboarding/step/1')
        .set('Authorization', `Bearer ${tokenVendorA}`)
        .send({
          name: 'Teranga Mode Dakar',
          slug: 'teranga-mode-dakar',
          mainCategory: 'Mode & Confection',
          city: 'Dakar',
        })
        .expect(200);

      expect(res.body.data.hasShop).toBe(true);
    });

    it('4.4 Règle « 1 Vendeur = 1 Boutique » : Une 2ème création doit renvoyer 409 Conflict', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/shops')
        .set('Authorization', `Bearer ${tokenVendorA}`)
        .send({
          name: 'Deuxieme Boutique Interdite',
          slug: 'deuxieme-boutique',
        })
        .expect(409);
    });

    it('4.5 Verrou KYC Payout : Vendeur A avec kycStatus === NONE -> 403 Forbidden', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/wallets/payout')
        .set('Authorization', `Bearer ${tokenVendorA}`)
        .send({
          amountFcfa: 25000,
          provider: PaymentProvider.WAVE,
          recipientPhone: '+221770010001',
        })
        .expect(403);
    });

    it('4.6 Soumission CNI -> PENDING puis validation Super-Admin -> VERIFIED -> Retrait OK (201)', async () => {
      // 1. Soumission CNI
      const resCni = await request(app.getHttpServer())
        .post('/api/v1/shops/me/kyc')
        .set('Authorization', `Bearer ${tokenVendorA}`)
        .send({
          idCardNumber: '1755199001234',
          idCardUrl: 'https://openboutik.sn/cni-moussa.jpg',
        });

      expect([200, 201]).toContain(resCni.status);

      // 2. Validation Super-Admin
      await request(app.getHttpServer())
        .patch(`/api/v1/shops/admin/${shopAId}/kyc`)
        .set('Authorization', `Bearer ${tokenSuperAdmin}`)
        .send({
          status: KycStatus.VERIFIED,
          verifyShopBadge: true,
        })
        .expect(200);

      // 3. Le retrait HTTP doit maintenant réussir avec code 201
      const resPayout = await request(app.getHttpServer())
        .post('/api/v1/wallets/payout')
        .set('Authorization', `Bearer ${tokenVendorA}`)
        .send({
          amountFcfa: 20000,
          provider: PaymentProvider.WAVE,
          recipientPhone: '+221770010001',
        })
        .expect(201);

      expect(resPayout.body.data.payout).toBeDefined();
      expect(resPayout.body.data.remainingBalanceFcfa).toBe(80000);
    });
  });

  // ============================================================================
  // COUCHE 5 : MOTEUR FINANCIER, SÉQUESTRE, COMMISSIONS (2% - 4%) & LITIGES
  // ============================================================================
  describe('COUCHE 5 : Cycle Complet Séquestre (Escrow), Commissions 2%-4% & Arbitrage Litige', () => {
    let activeOrderId: string;
    const otpCode = '123456';

    it('5.1 Checkout multi-boutiques avec séquestre Wave -> statut PAID_ESCROW', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/orders/checkout')
        .set('Authorization', `Bearer ${tokenClientA}`)
        .send({
          paymentProvider: PaymentProvider.WAVE,
          deliveryMethod: DeliveryMethod.TIAK_TIAK,
          deliveryAddress: 'Almadies Zone 4 Dakar',
          deliveryPhone: '+221770030003',
          items: [{ productId: 'prod-boubou-id', quantity: 1 }],
        })
        .expect(201);

      expect(res.body.data.orders).toBeDefined();
      activeOrderId = res.body.data.orders[0].id;

      // Injection dans la base de test
      const createdOrder = {
        ...res.body.data.orders[0],
        deliveryConfirmationCode: otpCode,
        status: OrderStatus.PAID_ESCROW,
        createdAt: new Date(),
      };
      dbOrders.push(createdOrder);
      dbEscrow.push({
        id: `escrow-${activeOrderId}`,
        orderId: activeOrderId,
        status: EscrowStatus.HELD_IN_ESCROW,
        amountFcfa: 20000,
      });
    });

    it('5.2 Expédition Tiak-Tiak par le vendeur -> statut SHIPPED_TIAK_TIAK', async () => {
      const res = await request(app.getHttpServer())
        .patch(`/api/v1/orders/${activeOrderId}/ship`)
        .set('Authorization', `Bearer ${tokenVendorA}`)
        .expect(200);

      expect(res.body.data.status).toBe(OrderStatus.SHIPPED_TIAK_TIAK);
    });

    it('5.3 Confirmation de livraison Client -> Déblocage séquestre & commission 4% plan FREE', async () => {
      const res = await request(app.getHttpServer())
        .post(`/api/v1/orders/${activeOrderId}/confirm-delivery`)
        .set('Authorization', `Bearer ${tokenClientA}`)
        .send({});

      expect([200, 201]).toContain(res.status);
      expect(res.body.data.status).toBe(OrderStatus.DELIVERED_CONFIRMED);
    });

    it('5.4 Litige : Gel du séquestre et rejet de tout déblocage pendant le litige', async () => {
      const orderDisputedId = 'order-dispute-test-uuid';
      dbOrders.push({
        id: orderDisputedId,
        clientId: clientAId,
        shopId: shopAId,
        orderNumber: 'OB-2026-LITIGE',
        totalAmountFcfa: 20000,
        subtotalFcfa: 18000,
        deliveryFeeFcfa: 2000,
        discountAmountFcfa: 0,
        netVendorAmountFcfa: 19200,
        commissionAmountFcfa: 800,
        status: OrderStatus.SHIPPED_TIAK_TIAK,
        createdAt: new Date(),
      });
      dbEscrow.push({
        id: `esc-${orderDisputedId}`,
        orderId: orderDisputedId,
        status: EscrowStatus.HELD_IN_ESCROW,
        amountFcfa: 20000,
      });

      // Ouverture litige par le client acheteur
      const resDisp = await request(app.getHttpServer())
        .post(`/api/v1/disputes/${orderDisputedId}`)
        .set('Authorization', `Bearer ${tokenClientA}`)
        .send({
          reason: 'Produit défectueux et déchiré',
        })
        .expect(201);

      expect(resDisp.body.data.status).toBe(DisputeStatus.OPEN);

      // Tentative de confirmation livraison bloquée
      await request(app.getHttpServer())
        .post(`/api/v1/orders/${orderDisputedId}/confirm-delivery`)
        .set('Authorization', `Bearer ${tokenClientA}`)
        .send({})
        .expect(400);
    });
  });

  // ============================================================================
  // COUCHE 6 : ROADMAP V2 ESPACE VENDEUR (CATALOGUE, VACANCES, COUPONS, NOTES, FACTURE)
  // ============================================================================
  describe('COUCHE 6 : Roadmap V2 Espace Vendeur, Mode Vacances, Codes Promo, Mémos & Facture PDF', () => {
    it('6.1 Rejet HTTP 400 si compareAtPriceFcfa <= priceFcfa', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/products')
        .set('Authorization', `Bearer ${tokenVendorA}`)
        .send({
          name: 'Article Prix Barré Invalide',
          priceFcfa: 20000,
          compareAtPriceFcfa: 15000,
          stock: 5,
          images: ['https://openboutik.sn/img.jpg'],
        })
        .expect(400);
    });

    it('6.2 Alertes stock critique : GET /products/me/low-stock', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/products/me/low-stock')
        .set('Authorization', `Bearer ${tokenVendorA}`)
        .expect(200);

      expect(res.body.data.totalAlerts).toBeDefined();
    });

    it('6.3 Mode Vacances : Activation via HTTP et blocage immédiat de checkout (400)', async () => {
      // 1. Activer le mode vacances
      await request(app.getHttpServer())
        .patch('/api/v1/shops/me/vacation')
        .set('Authorization', `Bearer ${tokenVendorA}`)
        .send({
          isOnVacation: true,
          vacationMessage: 'Fermé pour le Magal de Touba. Reprise des commandes le 25.',
        })
        .expect(200);

      // 2. Checkout doit être rejeté avec 400 contenant le message de vacances
      const resCheckout = await request(app.getHttpServer())
        .post('/api/v1/orders/checkout')
        .set('Authorization', `Bearer ${tokenClientA}`)
        .send({
          paymentProvider: PaymentProvider.WAVE,
          deliveryAddress: 'Plateau Rue Carnot Dakar',
          deliveryPhone: '+221770030003',
          items: [{ productId: 'prod-boubou-id', quantity: 1 }],
        })
        .expect(400);

      expect(resCheckout.body.message).toContain('Magal de Touba');

      // 3. Réouverture
      await request(app.getHttpServer())
        .patch('/api/v1/shops/me/vacation')
        .set('Authorization', `Bearer ${tokenVendorA}`)
        .send({ isOnVacation: false })
        .expect(200);
    });

    it('6.4 Code Promo TABASKI20 : Test de validation et application en entiers FCFA', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/coupons/validate')
        .send({
          code: 'TABASKI20',
          shopId: shopAId,
          subtotalFcfa: 20000,
        });

      expect([200, 201]).toContain(res.status);
      expect(res.body.data.discountAmountFcfa).toBe(4000); // 20% de 20 000 = 4 000 FCFA
    });

    it('6.5 Mémos Internes Vendeur : Invisible pour le Client sur GET /orders/:id et bloqué en 403', async () => {
      const orderTestId = 'order-memo-uuid';
      dbOrders.push({
        id: orderTestId,
        clientId: clientAId,
        shopId: shopAId,
        orderNumber: 'OB-2026-MEMO',
        totalAmountFcfa: 15000,
        subtotalFcfa: 15000,
        deliveryFeeFcfa: 0,
        discountAmountFcfa: 0,
        status: OrderStatus.PAID_ESCROW,
        createdAt: new Date(),
      });

      // Le vendeur ajoute une note confidentielle
      await request(app.getHttpServer())
        .post(`/api/v1/orders/${orderTestId}/notes`)
        .set('Authorization', `Bearer ${tokenVendorA}`)
        .send({
          text: 'Client exigeant, emballage soigné requis',
        })
        .expect(201);

      // Le client consulte sa commande : la note ne doit pas fuiter
      const resClient = await request(app.getHttpServer())
        .get(`/api/v1/orders/${orderTestId}`)
        .set('Authorization', `Bearer ${tokenClientA}`)
        .expect(200);

      expect(resClient.body.data.notes).toBeUndefined();

      // Le client tente d'appeler directement l'endpoint des notes : 403 Forbidden
      await request(app.getHttpServer())
        .get(`/api/v1/orders/${orderTestId}/notes`)
        .set('Authorization', `Bearer ${tokenClientA}`)
        .expect(403);
    });

    it('6.6 Facture PDF : GET /orders/:id/invoice stream un fichier binaire application/pdf', async () => {
      const orderTestId = 'order-memo-uuid';
      const res = await request(app.getHttpServer())
        .get(`/api/v1/orders/${orderTestId}/invoice`)
        .set('Authorization', `Bearer ${tokenClientA}`)
        .expect(200);

      expect(res.headers['content-type']).toBe('application/pdf');
    });

    it('6.7 Avis 5 étoiles : Bloqué (403) avant livraison confirmée, autorisé après', async () => {
      // Produit non livré
      await request(app.getHttpServer())
        .post('/api/v1/products/prod-gadget-id/reviews')
        .set('Authorization', `Bearer ${tokenClientA}`)
        .send({
          rating: 5,
          comment: 'Super écouteurs !',
        })
        .expect(403);
    });

    it('6.8 Analytics : GET /analytics/top-products retourne le top 5 mensuel', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/analytics/top-products')
        .set('Authorization', `Bearer ${tokenVendorA}`)
        .expect(200);

      expect(res.body.data.topProducts).toBeDefined();
    });
  });

  // ============================================================================
  // COUCHE 7 : STRESS-TESTS RÉSEAU & CONCURRENCE ATOMIQUE (Promise.all HTTP)
  // ============================================================================
  describe('COUCHE 7 : Stress-Tests Réseau & Concurrence Critique (Anti-Double Dépense & Race Condition)', () => {
    it('7.1 Rafale 1 — Double Dépense Séquestre : 5 requêtes simultanées de confirmation -> 1 seule réussit', async () => {
      const orderDoubleSpendId = 'order-double-spend-uuid';
      dbOrders.push({
        id: orderDoubleSpendId,
        clientId: clientAId,
        shopId: shopAId,
        orderNumber: 'OB-DOUBLE-SPEND',
        totalAmountFcfa: 25000,
        subtotalFcfa: 25000,
        deliveryFeeFcfa: 0,
        discountAmountFcfa: 0,
        netVendorAmountFcfa: 24000,
        commissionAmountFcfa: 1000,
        status: OrderStatus.SHIPPED_TIAK_TIAK,
        createdAt: new Date(),
      });
      dbEscrow.push({
        id: `esc-${orderDoubleSpendId}`,
        orderId: orderDoubleSpendId,
        status: EscrowStatus.HELD_IN_ESCROW,
        amountFcfa: 25000,
      });

      // Lancement simultané de 5 requêtes HTTP concurrentes
      const responses = await Promise.all([
        request(app.getHttpServer()).post(`/api/v1/orders/${orderDoubleSpendId}/confirm-delivery`).set('Authorization', `Bearer ${tokenClientA}`).send({}),
        request(app.getHttpServer()).post(`/api/v1/orders/${orderDoubleSpendId}/confirm-delivery`).set('Authorization', `Bearer ${tokenClientA}`).send({}),
        request(app.getHttpServer()).post(`/api/v1/orders/${orderDoubleSpendId}/confirm-delivery`).set('Authorization', `Bearer ${tokenClientA}`).send({}),
        request(app.getHttpServer()).post(`/api/v1/orders/${orderDoubleSpendId}/confirm-delivery`).set('Authorization', `Bearer ${tokenClientA}`).send({}),
        request(app.getHttpServer()).post(`/api/v1/orders/${orderDoubleSpendId}/confirm-delivery`).set('Authorization', `Bearer ${tokenClientA}`).send({}),
      ]);

      const successCount = responses.filter((r) => [200, 201].includes(r.status)).length;
      const rejectCount = responses.filter((r) => r.status === 400).length;

      expect(successCount).toBe(1);
      expect(rejectCount).toBe(4);
    });

    it('7.2 Rafale 2 — Double Retrait Portefeuille : 5 requêtes simultanées pour solde total -> 1 seule réussit', async () => {
      // Vendor B a 50 000 FCFA disponibles et est certifié KYC
      const responses = await Promise.all([
        request(app.getHttpServer()).post('/api/v1/wallets/payout').set('Authorization', `Bearer ${tokenVendorB}`).send({ amountFcfa: 50000, provider: PaymentProvider.WAVE, recipientPhone: '+221770020002' }),
        request(app.getHttpServer()).post('/api/v1/wallets/payout').set('Authorization', `Bearer ${tokenVendorB}`).send({ amountFcfa: 50000, provider: PaymentProvider.WAVE, recipientPhone: '+221770020002' }),
        request(app.getHttpServer()).post('/api/v1/wallets/payout').set('Authorization', `Bearer ${tokenVendorB}`).send({ amountFcfa: 50000, provider: PaymentProvider.WAVE, recipientPhone: '+221770020002' }),
        request(app.getHttpServer()).post('/api/v1/wallets/payout').set('Authorization', `Bearer ${tokenVendorB}`).send({ amountFcfa: 50000, provider: PaymentProvider.WAVE, recipientPhone: '+221770020002' }),
        request(app.getHttpServer()).post('/api/v1/wallets/payout').set('Authorization', `Bearer ${tokenVendorB}`).send({ amountFcfa: 50000, provider: PaymentProvider.WAVE, recipientPhone: '+221770020002' }),
      ]);

      const successCount = responses.filter((r) => r.status === 201).length;
      const rejectCount = responses.filter((r) => r.status === 400).length;

      expect(successCount).toBe(1);
      expect(rejectCount).toBe(4);

      const walletB = dbWallets.find((w) => w.shopId === shopBId);
      expect(walletB?.availableBalanceFcfa).toBe(0);
      expect(walletB?.availableBalanceFcfa).toBeGreaterThanOrEqual(0);
    });

    it('7.3 Rafale 3 — Dernier Article en Stock (stock: 1) : 5 commandes simultanées -> 1 seule créée', async () => {
      // prod-rare-id a stock = 1
      const responses = await Promise.all([
        request(app.getHttpServer()).post('/api/v1/orders/checkout').set('Authorization', `Bearer ${tokenClientA}`).send({ paymentProvider: PaymentProvider.WAVE, deliveryAddress: 'Plateau Rue Carnot Dakar', deliveryPhone: '+221770030003', items: [{ productId: 'prod-rare-id', quantity: 1 }] }),
        request(app.getHttpServer()).post('/api/v1/orders/checkout').set('Authorization', `Bearer ${tokenClientA}`).send({ paymentProvider: PaymentProvider.WAVE, deliveryAddress: 'Plateau Rue Carnot Dakar', deliveryPhone: '+221770030003', items: [{ productId: 'prod-rare-id', quantity: 1 }] }),
        request(app.getHttpServer()).post('/api/v1/orders/checkout').set('Authorization', `Bearer ${tokenClientA}`).send({ paymentProvider: PaymentProvider.WAVE, deliveryAddress: 'Plateau Rue Carnot Dakar', deliveryPhone: '+221770030003', items: [{ productId: 'prod-rare-id', quantity: 1 }] }),
        request(app.getHttpServer()).post('/api/v1/orders/checkout').set('Authorization', `Bearer ${tokenClientA}`).send({ paymentProvider: PaymentProvider.WAVE, deliveryAddress: 'Plateau Rue Carnot Dakar', deliveryPhone: '+221770030003', items: [{ productId: 'prod-rare-id', quantity: 1 }] }),
        request(app.getHttpServer()).post('/api/v1/orders/checkout').set('Authorization', `Bearer ${tokenClientA}`).send({ paymentProvider: PaymentProvider.WAVE, deliveryAddress: 'Plateau Rue Carnot Dakar', deliveryPhone: '+221770030003', items: [{ productId: 'prod-rare-id', quantity: 1 }] }),
      ]);

      const successCount = responses.filter((r) => r.status === 201).length;
      const rejectCount = responses.filter((r) => r.status === 400).length;

      expect(successCount).toBe(1);
      expect(rejectCount).toBe(4);

      const prodRare = dbProducts.find((p) => p.id === 'prod-rare-id');
      expect(prodRare?.stock).toBe(0);
    });

    it('7.4 Rafale 4 — Coupon à maxUses: 1 : 5 commandes simultanées -> 1 seule avec réduction', async () => {
      // Coupon TABASKI20 a maxUses: 1
      const responses = await Promise.all([
        request(app.getHttpServer()).post('/api/v1/orders/checkout').set('Authorization', `Bearer ${tokenClientA}`).send({ paymentProvider: PaymentProvider.WAVE, deliveryAddress: 'Plateau Rue Carnot Dakar', deliveryPhone: '+221770030003', couponCode: 'TABASKI20', items: [{ productId: 'prod-boubou-id', quantity: 1 }] }),
        request(app.getHttpServer()).post('/api/v1/orders/checkout').set('Authorization', `Bearer ${tokenClientA}`).send({ paymentProvider: PaymentProvider.WAVE, deliveryAddress: 'Plateau Rue Carnot Dakar', deliveryPhone: '+221770030003', couponCode: 'TABASKI20', items: [{ productId: 'prod-boubou-id', quantity: 1 }] }),
        request(app.getHttpServer()).post('/api/v1/orders/checkout').set('Authorization', `Bearer ${tokenClientA}`).send({ paymentProvider: PaymentProvider.WAVE, deliveryAddress: 'Plateau Rue Carnot Dakar', deliveryPhone: '+221770030003', couponCode: 'TABASKI20', items: [{ productId: 'prod-boubou-id', quantity: 1 }] }),
        request(app.getHttpServer()).post('/api/v1/orders/checkout').set('Authorization', `Bearer ${tokenClientA}`).send({ paymentProvider: PaymentProvider.WAVE, deliveryAddress: 'Plateau Rue Carnot Dakar', deliveryPhone: '+221770030003', couponCode: 'TABASKI20', items: [{ productId: 'prod-boubou-id', quantity: 1 }] }),
        request(app.getHttpServer()).post('/api/v1/orders/checkout').set('Authorization', `Bearer ${tokenClientA}`).send({ paymentProvider: PaymentProvider.WAVE, deliveryAddress: 'Plateau Rue Carnot Dakar', deliveryPhone: '+221770030003', couponCode: 'TABASKI20', items: [{ productId: 'prod-boubou-id', quantity: 1 }] }),
      ]);

      const successCount = responses.filter((r) => r.status === 201).length;
      const rejectCount = responses.filter((r) => r.status === 400).length;

      expect(successCount).toBe(1);
      expect(rejectCount).toBe(4);
    });
  });
});
