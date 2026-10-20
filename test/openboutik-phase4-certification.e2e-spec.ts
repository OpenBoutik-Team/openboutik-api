import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import helmet from 'helmet';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';
import { JwtService } from '@nestjs/jwt';
import { StreamsGateway } from '../src/streams/streams.gateway';
import { BnplCronService } from '../src/bnpl/bnpl-cron.service';
import { TransformInterceptor, AllExceptionsFilter } from '../src/common';
import {
  Role,
  SubscriptionPlan,
  OrderStatus,
  KycStatus,
  CouponType,
  DeliveryMethod,
  NegotiationStatus,
  StreamType,
  StreamStatus,
  InstallmentPlanStatus,
  InstallmentPaymentStatus,
} from '../src/generated/prisma/client';

describe('OpenBoutik API — Certification E2E Phase 4 (Wakhale, Live Shopping, BNPL & Cron)', () => {
  let app: INestApplication;
  let jwtService: JwtService;
  let streamsGateway: StreamsGateway;
  let bnplCronService: BnplCronService;

  let tokenClientA: string;
  let tokenClientB: string;
  let tokenVendorA: string;
  let tokenVendorB: string;
  let tokenSuperAdmin: string;

  const clientAId = 'usr-client-a-phase4';
  const clientBId = 'usr-client-b-phase4';
  const vendorAId = 'usr-vendor-a-phase4';
  const vendorBId = 'usr-vendor-b-phase4';
  const adminId = 'usr-admin-phase4';

  const shopAId = 'shop-a-phase4';
  const shopBId = 'shop-b-phase4';

  const productA1Id = '11111111-1111-4111-8111-111111111111';
  const productA2Id = '22222222-2222-4222-8222-222222222222';
  const productB1Id = '33333333-3333-4333-8333-333333333333';

  const orderAId = '44444444-4444-4444-8444-444444444444';

  // Base en mémoire réactive
  let dbUsers: any[];
  let dbShops: any[];
  let dbWallets: any[];
  let dbProducts: any[];
  let dbCoupons: any[];
  let dbOrders: any[];
  let dbEscrow: any[];
  let dbOrderTrackings: any[];
  let dbPriceNegotiations: any[];
  let dbMediaStreams: any[];
  let dbStreamProducts: any[];
  let dbInstallmentPlans: any[];
  let dbInstallmentPayments: any[];

  function resetDatabase() {
    dbUsers = [
      {
        id: clientAId,
        fullName: 'Fatou Ndiaye',
        phone: '+221765432109',
        role: Role.CLIENT,
        kycStatus: KycStatus.NONE,
        idCardNumber: null,
        idCardUrl: null,
        isActive: true,
      },
      {
        id: clientBId,
        fullName: 'Awa Diop',
        phone: '+221778901234',
        role: Role.CLIENT,
        kycStatus: KycStatus.NONE,
        idCardNumber: null,
        idCardUrl: null,
        isActive: true,
      },
      {
        id: vendorAId,
        fullName: 'Moussa Diop',
        phone: '+221770010001',
        role: Role.VENDOR,
        kycStatus: KycStatus.VERIFIED,
        isActive: true,
      },
      {
        id: vendorBId,
        fullName: 'Ibrahima Fall',
        phone: '+221770020002',
        role: Role.VENDOR,
        kycStatus: KycStatus.VERIFIED,
        isActive: true,
      },
      {
        id: adminId,
        fullName: 'Super Admin OpenBoutik',
        phone: '+221770000001',
        role: Role.SUPER_ADMIN,
        kycStatus: KycStatus.VERIFIED,
        isActive: true,
      },
    ];

    dbWallets = [
      {
        id: 'wallet-a-p4',
        shopId: shopAId,
        escrowBalanceFcfa: 0,
        availableBalanceFcfa: 20000,
        totalEarnedFcfa: 20000,
      },
      {
        id: 'wallet-b-p4',
        shopId: shopBId,
        escrowBalanceFcfa: 0,
        availableBalanceFcfa: 15000,
        totalEarnedFcfa: 15000,
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
        subscriptionPlan: SubscriptionPlan.PRO,
        isVerified: true,
        isActive: true,
      },
      {
        id: shopBId,
        ownerId: vendorBId,
        name: 'Dakar High-Tech',
        slug: 'dakar-high-tech',
        city: 'Dakar',
        whatsappNumber: '+221770020002',
        subscriptionPlan: SubscriptionPlan.FREE,
        isVerified: true,
        isActive: true,
      },
    ];

    dbProducts = [
      {
        id: productA1Id,
        shopId: shopAId,
        name: 'Grand Boubou Bazin VIP',
        slug: 'grand-boubou-bazin-vip',
        priceFcfa: 50000,
        compareAtPriceFcfa: 60000,
        stock: 10,
        isPublished: true,
        createdAt: new Date(),
        shop: dbShops[0],
      },
      {
        id: productA2Id,
        shopId: shopAId,
        name: 'Chaussures Cuir Traditionnel',
        slug: 'chaussures-cuir-traditionnel',
        priceFcfa: 25000,
        compareAtPriceFcfa: null,
        stock: 5,
        isPublished: true,
        createdAt: new Date(),
        shop: dbShops[0],
      },
      {
        id: productB1Id,
        shopId: shopBId,
        name: 'Smartphone Dakar Pro',
        slug: 'smartphone-dakar-pro',
        priceFcfa: 120000,
        compareAtPriceFcfa: null,
        stock: 3,
        isPublished: true,
        createdAt: new Date(),
        shop: dbShops[1],
      },
    ];

    dbCoupons = [];

    dbOrders = [
      {
        id: orderAId,
        orderNumber: 'OB-2026-BNPL-01',
        clientId: clientAId,
        shopId: shopAId,
        subtotalFcfa: 100001,
        deliveryFeeFcfa: 0,
        discountAmountFcfa: 0,
        totalAmountFcfa: 100001,
        commissionRate: 3,
        commissionAmountFcfa: 3000,
        netVendorAmountFcfa: 97001,
        deliveryMethod: DeliveryMethod.TIAK_TIAK,
        deliveryAddress: 'Plateau Dakar',
        deliveryCity: 'Dakar',
        deliveryPhone: '+221765432109',
        deliveryConfirmationCode: '445566',
        status: OrderStatus.PENDING_PAYMENT,
        createdAt: new Date(),
        shop: dbShops[0],
      },
    ];

    dbEscrow = [];
    dbOrderTrackings = [];
    dbPriceNegotiations = [];
    dbMediaStreams = [];
    dbStreamProducts = [];
    dbInstallmentPlans = [];
    dbInstallmentPayments = [];
  }

  beforeAll(async () => {
    resetDatabase();

    const mockPrismaService: any = {
      user: {
        findUnique: jest.fn(async ({ where }) =>
          dbUsers.find((u) => u.id === where.id || u.phone === where.phone) || null,
        ),
        findMany: jest.fn(async () => dbUsers),
        update: jest.fn(async ({ where, data }) => {
          const user = dbUsers.find((u) => u.id === where.id);
          if (user) Object.assign(user, data);
          return user;
        }),
      },
      shop: {
        findUnique: jest.fn(async ({ where }) =>
          dbShops.find(
            (s) => s.id === where.id || s.ownerId === where.ownerId || s.slug === where.slug,
          ) || null,
        ),
        findMany: jest.fn(async () => dbShops),
      },
      product: {
        findUnique: jest.fn(async ({ where }) => {
          const p = dbProducts.find((prod) => prod.id === where.id);
          return p ? { ...p, shop: dbShops.find((s) => s.id === p.shopId) } : null;
        }),
        findMany: jest.fn(async () => dbProducts),
        count: jest.fn(async ({ where }: any = {}) => {
          let list = [...dbProducts];
          if (where?.id?.in) {
            list = list.filter((p) => where.id.in.includes(p.id));
          }
          if (where?.shopId) {
            list = list.filter((p) => p.shopId === where.shopId);
          }
          return list.length;
        }),
      },
      coupon: {
        create: jest.fn(async ({ data }) => {
          const c = { id: `cpn-${Date.now()}-${Math.random()}`, createdAt: new Date(), ...data };
          dbCoupons.push(c);
          return c;
        }),
        findUnique: jest.fn(async ({ where }) => {
          if (where.id) return dbCoupons.find((c) => c.id === where.id) || null;
          if (where.shopId_code) {
            return (
              dbCoupons.find(
                (c) =>
                  c.shopId === where.shopId_code.shopId && c.code === where.shopId_code.code,
              ) || null
            );
          }
          return null;
        }),
      },
      order: {
        findUnique: jest.fn(async ({ where }) => {
          const o = dbOrders.find((ord) => ord.id === where.id);
          if (!o) return null;
          const shop = dbShops.find((s) => s.id === o.shopId);
          const wallet = shop ? dbWallets.find((w) => w.shopId === shop.id) : null;
          const escrow = dbEscrow.find((e) => e.orderId === o.id);
          return {
            ...o,
            shop: shop ? { ...shop, wallet } : null,
            escrow,
          };
        }),
        update: jest.fn(async ({ where, data }) => {
          const o = dbOrders.find((ord) => ord.id === where.id);
          if (o) Object.assign(o, data);
          return o;
        }),
      },
      vendorWallet: {
        findUnique: jest.fn(async ({ where }) =>
          dbWallets.find((w) => w.shopId === where.shopId || w.id === where.id) || null,
        ),
        update: jest.fn(async ({ where, data }) => {
          const w = dbWallets.find(
            (wallet) => wallet.id === where.id || wallet.shopId === where.shopId,
          );
          if (w) {
            if (data.escrowBalanceFcfa?.increment) {
              w.escrowBalanceFcfa += data.escrowBalanceFcfa.increment;
            }
          }
          return w;
        }),
      },
      escrowTransaction: {
        create: jest.fn(async ({ data }) => {
          const e = { id: `escrow-${Date.now()}`, ...data };
          dbEscrow.push(e);
          return e;
        }),
        update: jest.fn(async ({ where, data }) => {
          const e = dbEscrow.find((esc) => esc.id === where.id || esc.orderId === where.orderId);
          if (e) Object.assign(e, data);
          return e;
        }),
      },
      orderTracking: {
        create: jest.fn(async ({ data }) => {
          const t = { id: `track-${Date.now()}`, timestamp: new Date(), ...data };
          dbOrderTrackings.push(t);
          return t;
        }),
      },
      priceNegotiation: {
        create: jest.fn(async ({ data }) => {
          const item = {
            id: `neg-${Date.now()}-${Math.random()}`,
            createdAt: new Date(),
            updatedAt: new Date(),
            ...data,
            product: dbProducts.find((p) => p.id === data.productId),
            shop: dbShops.find((s) => s.id === data.shopId),
          };
          dbPriceNegotiations.push(item);
          return item;
        }),
        findFirst: jest.fn(async ({ where }) => {
          return (
            dbPriceNegotiations.find(
              (n) =>
                n.productId === where.productId &&
                n.buyerId === where.buyerId &&
                (!where.status?.in || where.status.in.includes(n.status)),
            ) || null
          );
        }),
        findUnique: jest.fn(async ({ where }) => {
          const n = dbPriceNegotiations.find((neg) => neg.id === where.id);
          if (!n) return null;
          return {
            ...n,
            product: dbProducts.find((p) => p.id === n.productId),
            shop: dbShops.find((s) => s.id === n.shopId),
            buyer: dbUsers.find((u) => u.id === n.buyerId),
            generatedCoupon: dbCoupons.find((c) => c.id === n.generatedCouponId) || null,
          };
        }),
        findMany: jest.fn(async ({ where }: any = {}) => {
          return dbPriceNegotiations
            .filter(
              (n) =>
                (!where.buyerId || n.buyerId === where.buyerId) &&
                (!where.shopId || n.shopId === where.shopId),
            )
            .map((n) => ({
              ...n,
              product: dbProducts.find((p) => p.id === n.productId),
              shop: dbShops.find((s) => s.id === n.shopId),
              buyer: dbUsers.find((u) => u.id === n.buyerId),
              generatedCoupon: dbCoupons.find((c) => c.id === n.generatedCouponId) || null,
            }));
        }),
        update: jest.fn(async ({ where, data }) => {
          const n = dbPriceNegotiations.find((neg) => neg.id === where.id);
          if (n) Object.assign(n, data);
          return {
            ...n,
            product: dbProducts.find((p) => p.id === n.productId),
            shop: dbShops.find((s) => s.id === n.shopId),
            generatedCoupon: dbCoupons.find((c) => c.id === n.generatedCouponId) || null,
          };
        }),
      },
      mediaStream: {
        create: jest.fn(async ({ data }) => {
          const id = `stream-${Date.now()}`;
          const stream = {
            id,
            createdAt: new Date(),
            updatedAt: new Date(),
            viewsCount: 0,
            peakViewers: 0,
            startedAt: null,
            endedAt: null,
            ...data,
          };
          delete stream.streamProducts;
          dbMediaStreams.push(stream);

          if (data.streamProducts?.create) {
            data.streamProducts.create.forEach((sp: any) => {
              dbStreamProducts.push({
                id: `sp-${Date.now()}-${Math.random()}`,
                streamId: id,
                productId: sp.productId,
                isPinned: sp.isPinned || false,
                product: dbProducts.find((p) => p.id === sp.productId),
              });
            });
          }

          return {
            ...stream,
            shop: dbShops.find((s) => s.id === stream.shopId),
            streamProducts: dbStreamProducts.filter((sp) => sp.streamId === id),
          };
        }),
        findUnique: jest.fn(async ({ where }) => {
          const s = dbMediaStreams.find((stream) => stream.id === where.id);
          if (!s) return null;
          return {
            ...s,
            shop: dbShops.find((shop) => shop.id === s.shopId),
            streamProducts: dbStreamProducts
              .filter((sp) => sp.streamId === s.id)
              .map((sp) => ({
                ...sp,
                product: dbProducts.find((p) => p.id === sp.productId),
              })),
          };
        }),
        findMany: jest.fn(async ({ where }: any = {}) => {
          return dbMediaStreams
            .filter(
              (s) =>
                (!where.type || s.type === where.type) &&
                (!where.status || s.status === where.status) &&
                (!where.shopId || s.shopId === where.shopId),
            )
            .map((s) => ({
              ...s,
              shop: dbShops.find((shop) => shop.id === s.shopId),
              streamProducts: dbStreamProducts
                .filter((sp) => sp.streamId === s.id)
                .map((sp) => ({
                  ...sp,
                  product: dbProducts.find((p) => p.id === sp.productId),
                })),
            }));
        }),
        count: jest.fn(async () => dbMediaStreams.length),
        update: jest.fn(async ({ where, data }) => {
          const s = dbMediaStreams.find((stream) => stream.id === where.id);
          if (s) {
            if (data.viewsCount?.increment) s.viewsCount += data.viewsCount.increment;
            else Object.assign(s, data);
          }
          return {
            ...s,
            shop: dbShops.find((shop) => shop.id === s.shopId),
            streamProducts: dbStreamProducts.filter((sp) => sp.streamId === s.id),
          };
        }),
        delete: jest.fn(async ({ where }) => {
          const idx = dbMediaStreams.findIndex((s) => s.id === where.id);
          if (idx !== -1) return dbMediaStreams.splice(idx, 1)[0];
          return null;
        }),
      },
      streamProduct: {
        updateMany: jest.fn(async ({ where, data }) => {
          const list = dbStreamProducts.filter((sp) => sp.streamId === where.streamId);
          list.forEach((sp) => Object.assign(sp, data));
          return { count: list.length };
        }),
        update: jest.fn(async ({ where, data }) => {
          const sp = dbStreamProducts.find(
            (item) =>
              item.streamId === where.streamId_productId.streamId &&
              item.productId === where.streamId_productId.productId,
          );
          if (sp) Object.assign(sp, data);
          return {
            ...sp,
            product: dbProducts.find((p) => p.id === sp.productId),
          };
        }),
      },
      installmentPlan: {
        create: jest.fn(async ({ data }) => {
          const id = `plan-${Date.now()}`;
          const plan = {
            id,
            createdAt: new Date(),
            updatedAt: new Date(),
            ...data,
          };
          delete plan.payments;
          dbInstallmentPlans.push(plan);

          if (data.payments?.create) {
            data.payments.create.forEach((p: any) => {
              dbInstallmentPayments.push({
                id: `pay-${Date.now()}-${Math.random()}`,
                planId: id,
                status: p.status || InstallmentPaymentStatus.PENDING,
                ...p,
              });
            });
          }

          return {
            ...plan,
            payments: dbInstallmentPayments.filter((p) => p.planId === id),
            order: dbOrders.find((o) => o.id === plan.orderId),
          };
        }),
        findUnique: jest.fn(async ({ where }) => {
          const p = dbInstallmentPlans.find(
            (plan) => plan.id === where.id || plan.orderId === where.orderId,
          );
          if (!p) return null;
          return {
            ...p,
            payments: dbInstallmentPayments.filter((pay) => pay.planId === p.id),
            order: dbOrders.find((o) => o.id === p.orderId),
            shop: dbShops.find((s) => s.id === p.shopId),
            user: dbUsers.find((u) => u.id === p.userId),
          };
        }),
        findFirst: jest.fn(async ({ where }) => {
          return (
            dbInstallmentPlans.find(
              (p) =>
                p.userId === where.userId &&
                (!where.status?.in || where.status.in.includes(p.status)),
            ) || null
          );
        }),
        findMany: jest.fn(async ({ where }: any = {}) => {
          return dbInstallmentPlans
            .filter((p) => !where.userId || p.userId === where.userId)
            .map((p) => ({
              ...p,
              payments: dbInstallmentPayments.filter((pay) => pay.planId === p.id),
              order: dbOrders.find((o) => o.id === p.orderId),
              shop: dbShops.find((s) => s.id === p.shopId),
            }));
        }),
        update: jest.fn(async ({ where, data }) => {
          const p = dbInstallmentPlans.find((plan) => plan.id === where.id);
          if (p) Object.assign(p, data);
          return {
            ...p,
            payments: dbInstallmentPayments.filter((pay) => pay.planId === p.id),
          };
        }),
      },
      installmentPayment: {
        findUnique: jest.fn(async ({ where }) => {
          const pay = dbInstallmentPayments.find((p) => p.id === where.id);
          if (!pay) return null;
          const plan = dbInstallmentPlans.find((pl) => pl.id === pay.planId);
          const order = plan ? dbOrders.find((o) => o.id === plan.orderId) : null;
          const shop = order ? dbShops.find((s) => s.id === order.shopId) : null;
          const wallet = shop ? dbWallets.find((w) => w.shopId === shop.id) : null;
          const escrow = order ? dbEscrow.find((e) => e.orderId === order.id) : null;

          return {
            ...pay,
            plan: {
              ...plan,
              order: {
                ...order,
                shop: shop ? { ...shop, wallet } : null,
                escrow,
              },
              payments: dbInstallmentPayments.filter((p) => p.planId === plan.id),
            },
          };
        }),
        findMany: jest.fn(async ({ where }: any = {}) => {
          return dbInstallmentPayments
            .filter((p) => {
              if (where.status && p.status !== where.status) return false;
              if (where.dueDate?.lt && !(new Date(p.dueDate) < where.dueDate.lt)) return false;
              return true;
            })
            .map((p) => ({
              ...p,
              plan: dbInstallmentPlans.find((pl) => pl.id === p.planId),
            }));
        }),
        update: jest.fn(async ({ where, data }) => {
          const pay = dbInstallmentPayments.find((p) => p.id === where.id);
          if (pay) Object.assign(pay, data);
          return pay;
        }),
      },
      $transaction: jest.fn(async (cb) => {
        if (typeof cb === 'function') {
          return cb(mockPrismaService);
        }
        return Promise.all(cb);
      }),
    };

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(PrismaService)
      .useValue(mockPrismaService)
      .compile();

    app = moduleFixture.createNestApplication();
    app.use(helmet());
    app.enableCors();
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

    streamsGateway = moduleFixture.get<StreamsGateway>(StreamsGateway);
    bnplCronService = moduleFixture.get<BnplCronService>(BnplCronService);
    jwtService = moduleFixture.get<JwtService>(JwtService);

    const secret =
      process.env.JWT_ACCESS_SECRET ||
      'openboutik_jwt_access_super_secret_local_dev_key_2026';

    tokenClientA = await jwtService.signAsync(
      { sub: clientAId, phone: '+221765432109', role: Role.CLIENT },
      { secret },
    );
    tokenClientB = await jwtService.signAsync(
      { sub: clientBId, phone: '+221778901234', role: Role.CLIENT },
      { secret },
    );
    tokenVendorA = await jwtService.signAsync(
      { sub: vendorAId, phone: '+221770010001', role: Role.VENDOR },
      { secret },
    );
    tokenVendorB = await jwtService.signAsync(
      { sub: vendorBId, phone: '+221770020002', role: Role.VENDOR },
      { secret },
    );
    tokenSuperAdmin = await jwtService.signAsync(
      { sub: adminId, phone: '+221770000001', role: Role.SUPER_ADMIN },
      { secret },
    );
  });

  afterAll(async () => {
    await app.close();
  });

  // ============================================================================
  // MODULE 1 : LE « WAKHALE » NUMÉRIQUE (PRIX, CONTRE-OFFRE & COUPON DYNAMIQUE)
  // ============================================================================
  describe('MODULE 1 : Le « Wakhale » numérique — Négociation de prix', () => {
    let negotiationId: string;
    let generatedCouponCode: string;

    it('1.1 Rejet (400) des offres abusives (< 50% ou >= prix catalogue)', async () => {
      // Offre >= prix initial (50 000 FCFA sur article à 50 000 FCFA)
      const resEqual = await request(app.getHttpServer())
        .post('/api/v1/negotiations')
        .set('Authorization', `Bearer ${tokenClientA}`)
        .send({
          productId: productA1Id,
          proposedPriceFcfa: 50000,
        })
        .expect(400);

      expect(resEqual.body.success).toBe(false);

      // Offre < 50% (10 000 FCFA sur article à 50 000 FCFA)
      const resAbusive = await request(app.getHttpServer())
        .post('/api/v1/negotiations')
        .set('Authorization', `Bearer ${tokenClientA}`)
        .send({
          productId: productA1Id,
          proposedPriceFcfa: 10000,
        })
        .expect(400);

      expect(resAbusive.body.success).toBe(false);
      expect(resAbusive.body.message).toContain('50% du prix initial');
    });

    it('1.2 Offre valide à 45 000 FCFA sur article à 50 000 FCFA -> Statut PENDING', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/negotiations')
        .set('Authorization', `Bearer ${tokenClientA}`)
        .send({
          productId: productA1Id,
          proposedPriceFcfa: 45000,
        })
        .expect(201);

      expect(res.body.success).toBe(true);
      expect(res.body.data.proposedPriceFcfa).toBe(45000);
      expect(res.body.data.status).toBe(NegotiationStatus.PENDING);
      expect(res.body.data.originalPriceFcfa).toBe(50000);

      negotiationId = res.body.data.id;
    });

    it('1.3 Pentest BOLA : Vendeur B tente de répondre à la négociation du Vendeur A -> 403 Forbidden', async () => {
      const res = await request(app.getHttpServer())
        .patch(`/api/v1/negotiations/${negotiationId}/respond`)
        .set('Authorization', `Bearer ${tokenVendorB}`)
        .send({
          action: 'ACCEPT',
        })
        .expect(403);

      expect(res.body.success).toBe(false);
    });

    it('1.4 Le Vendeur A fait une contre-offre à 47 000 FCFA -> Statut COUNTER_OFFERED', async () => {
      const res = await request(app.getHttpServer())
        .patch(`/api/v1/negotiations/${negotiationId}/respond`)
        .set('Authorization', `Bearer ${tokenVendorA}`)
        .send({
          action: 'COUNTER_OFFER',
          counterPriceFcfa: 47000,
        })
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.status).toBe(NegotiationStatus.COUNTER_OFFERED);
      expect(res.body.data.counterPriceFcfa).toBe(47000);
    });

    it('1.5 L’Acheteur A accepte la contre-offre -> Coupon dynamique WAKHALE généré atomiquement', async () => {
      const res = await request(app.getHttpServer())
        .patch(`/api/v1/negotiations/${negotiationId}/accept-counter`)
        .set('Authorization', `Bearer ${tokenClientA}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.status).toBe(NegotiationStatus.ACCEPTED);
      expect(res.body.data.generatedCoupon).toBeDefined();

      const coupon = res.body.data.generatedCoupon;
      expect(coupon.code).toContain('WAKHALE-');
      expect(coupon.type).toBe(CouponType.FIXED_FCFA);
      // Réduction = 50 000 - 47 000 = 3 000 FCFA
      expect(coupon.value).toBe(3000);
      expect(coupon.maxUses).toBe(1);

      generatedCouponCode = coupon.code;
      expect(generatedCouponCode).toBeDefined();
    });

    it('1.6 Pentest BOLA : Acheteur B tente d’accéder à la négociation de l’Acheteur A -> 403 Forbidden', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/v1/negotiations/${negotiationId}`)
        .set('Authorization', `Bearer ${tokenClientB}`)
        .expect(403);

      expect(res.body.success).toBe(false);
    });
  });

  // ============================================================================
  // MODULE 2 : LIVE SHOPPING & VIDÉOS COURTES (STREAMS & POP-UP PRODUIT)
  // ============================================================================
  describe('MODULE 2 : Live Shopping & Vidéos Courtes (Streams)', () => {
    let streamId: string;

    it('2.1 Création d’un Live avec produits de sa boutique (201) & Pentest BOLA sur produit tiers (403)', async () => {
      // 1. Tentative d'inclure le produit du Vendeur B (productB1Id) -> 403 Forbidden
      const resFraud = await request(app.getHttpServer())
        .post('/api/v1/streams')
        .set('Authorization', `Bearer ${tokenVendorA}`)
        .send({
          title: 'Live Bazin Exclusif',
          type: StreamType.LIVE_STREAM,
          mediaUrl: 'https://cdn.openboutik.sn/streams/teranga-live.m3u8',
          productIds: [productA1Id, productB1Id],
        })
        .expect(403);

      expect(resFraud.body.success).toBe(false);

      // 2. Création valide avec 2 produits appartenant à sa boutique
      const resLegit = await request(app.getHttpServer())
        .post('/api/v1/streams')
        .set('Authorization', `Bearer ${tokenVendorA}`)
        .send({
          title: 'Live Bazin Exclusif Teranga',
          description: 'Démonstration de nos modèles phares',
          type: StreamType.LIVE_STREAM,
          mediaUrl: 'https://cdn.openboutik.sn/streams/teranga-live.m3u8',
          productIds: [productA1Id, productA2Id],
        })
        .expect(201);

      expect(resLegit.body.success).toBe(true);
      expect(resLegit.body.data.streamProducts.length).toBe(2);
      expect(resLegit.body.data.status).toBe(StreamStatus.SCHEDULED);

      streamId = resLegit.body.data.id;
    });

    it('2.2 Démarrer le Live (statut LIVE) puis épingler un produit en direct (pin-product)', async () => {
      // 1. Passer le stream en LIVE
      const resLive = await request(app.getHttpServer())
        .patch(`/api/v1/streams/${streamId}/status`)
        .set('Authorization', `Bearer ${tokenVendorA}`)
        .send({ status: StreamStatus.LIVE })
        .expect(200);

      expect(resLive.body.data.status).toBe(StreamStatus.LIVE);

      // 2. Épingler le produit A1 (Grand Boubou)
      const resPin = await request(app.getHttpServer())
        .patch(`/api/v1/streams/${streamId}/pin-product/${productA1Id}`)
        .set('Authorization', `Bearer ${tokenVendorA}`)
        .expect(200);

      expect(resPin.body.success).toBe(true);
      expect(resPin.body.data.isPinned).toBe(true);
      expect(resPin.body.data.product.id).toBe(productA1Id);
    });

    it('2.3 Consultation publique du flux et test de la passerelle WebSocket StreamsGateway', async () => {
      // Consultation publique
      const resGet = await request(app.getHttpServer())
        .get(`/api/v1/streams/${streamId}`)
        .expect(200);

      expect(resGet.body.success).toBe(true);
      expect(resGet.body.data.id).toBe(streamId);

      // Vérification Passerelle WebSocket
      expect(streamsGateway).toBeDefined();

      const fakeSocket: any = {
        id: 'spectateur-live-01',
        data: {},
        join: jest.fn(async () => {}),
        leave: jest.fn(async () => {}),
      };

      const joinRes = await streamsGateway.handleJoinStream(fakeSocket, streamId);
      expect(joinRes.success).toBe(true);
      expect(fakeSocket.join).toHaveBeenCalledWith(`stream_${streamId}`);

      const chatRes = await streamsGateway.handleStreamChatMessage(fakeSocket, {
        streamId,
        message: 'Le boubou bleu est disponible en taille XL ?',
        senderName: 'Fatou',
      });
      expect(chatRes.success).toBe(true);
      expect(chatRes.chatData!.message).toContain('Le boubou bleu');
    });
  });

  // ============================================================================
  // MODULE 3 : PAIEMENT FRACTIONNÉ (BNPL 3X/4X), KYC ACHETEUR & CRON JOB
  // ============================================================================
  describe('MODULE 3 : Paiement Fractionné / BNPL en 3 ou 4 fois + KYC Acheteur & Cron', () => {
    let planId: string;
    let installment1Id: string;
    let installment2Id: string;

    it('3.1 Acheteur sans KYC vérifié tente un paiement en 4 fois -> 403 Forbidden', async () => {
      const res = await request(app.getHttpServer())
        .post(`/api/v1/bnpl/orders/${orderAId}/init`)
        .set('Authorization', `Bearer ${tokenClientA}`)
        .send({ installmentsCount: 4 })
        .expect(403);

      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('Vérification d’identité CNI requise');
    });

    it('3.2 Soumission KYC Acheteur (PENDING) puis validation par le Super-Admin (VERIFIED)', async () => {
      // 1. Soumission par l'Acheteur A
      const resSubmit = await request(app.getHttpServer())
        .post('/api/v1/bnpl/kyc')
        .set('Authorization', `Bearer ${tokenClientA}`)
        .send({
          idCardNumber: '1755199501234',
          idCardUrl: 'https://cdn.openboutik.sn/kyc/cni-fatou.jpg',
        })
        .expect(201);

      expect(resSubmit.body.data.kycStatus).toBe(KycStatus.PENDING);

      // 2. Validation par le Super-Admin
      const resReview = await request(app.getHttpServer())
        .patch(`/api/v1/bnpl/admin/kyc/${clientAId}`)
        .set('Authorization', `Bearer ${tokenSuperAdmin}`)
        .send({
          status: KycStatus.VERIFIED,
        })
        .expect(200);

      expect(resReview.body.data.kycStatus).toBe(KycStatus.VERIFIED);
    });

    it('3.3 Création plan 4x sur commande de 100 001 FCFA -> Arithmétique stricte (25001 + 25000 + 25000 + 25000 = 100001)', async () => {
      const res = await request(app.getHttpServer())
        .post(`/api/v1/bnpl/orders/${orderAId}/init`)
        .set('Authorization', `Bearer ${tokenClientA}`)
        .send({ installmentsCount: 4 })
        .expect(201);

      expect(res.body.success).toBe(true);
      const plan = res.body.data;
      expect(plan.installmentsCount).toBe(4);
      expect(plan.totalAmountFcfa).toBe(100001);
      expect(plan.payments.length).toBe(4);

      // Vérification arithmétique FCFA exacte :
      // 100 001 / 4 = 25 000 reste 1 FCFA.
      // Échéance 1 = 25 001 FCFA
      // Échéances 2, 3, 4 = 25 000 FCFA
      expect(plan.payments[0].amountFcfa).toBe(25001);
      expect(plan.payments[1].amountFcfa).toBe(25000);
      expect(plan.payments[2].amountFcfa).toBe(25000);
      expect(plan.payments[3].amountFcfa).toBe(25000);

      const sum = plan.payments.reduce((acc: number, p: any) => acc + p.amountFcfa, 0);
      expect(sum).toBe(100001);

      planId = plan.id;
      installment1Id = plan.payments[0].id;
      installment2Id = plan.payments[1].id;
    });

    it('3.4 Règlement de la 1ère échéance -> Commande en PAID_ESCROW et fonds séquestrés', async () => {
      const res = await request(app.getHttpServer())
        .post(`/api/v1/bnpl/installments/${installment1Id}/pay`)
        .set('Authorization', `Bearer ${tokenClientA}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.installment.status).toBe(InstallmentPaymentStatus.PAID);
      expect(res.body.data.plan.paidAmountFcfa).toBe(25001);
      expect(res.body.data.plan.remainingAmountFcfa).toBe(75000);

      // Vérifier que la commande associée est passée en PAID_ESCROW
      const order = dbOrders.find((o) => o.id === orderAId);
      expect(order.status).toBe(OrderStatus.PAID_ESCROW);

      // Vérifier que le solde séquestre du vendeur a été crédité
      const wallet = dbWallets.find((w) => w.shopId === shopAId);
      expect(wallet.escrowBalanceFcfa).toBeGreaterThan(0);
    });

    it('3.5 Simulation échéance impayée + Cron Job BnplCronService -> Passage en OVERDUE & verrouillage client', async () => {
      // Simuler que l'échéance 2 a dépassé sa date limite dans le passé
      const inst2 = dbInstallmentPayments.find((p) => p.id === installment2Id);
      inst2.dueDate = new Date(Date.now() - 48 * 3600 * 1000); // Il y a 2 jours

      // Exécution manuelle de la méthode de Cron Job
      const cronResult = await bnplCronService.handleOverdueInstallments();
      expect(cronResult.overduePaymentsCount).toBeGreaterThanOrEqual(1);

      // Vérifier que l'échéance et le plan sont maintenant en statut OVERDUE
      expect(inst2.status).toBe(InstallmentPaymentStatus.OVERDUE);
      const plan = dbInstallmentPlans.find((p) => p.id === planId);
      expect(plan.status).toBe(InstallmentPlanStatus.OVERDUE);

      // Vérifier que l'Acheteur A est désormais interdit d'ouvrir un autre plan BNPL
      const resBlocked = await request(app.getHttpServer())
        .post(`/api/v1/bnpl/orders/${orderAId}/init`)
        .set('Authorization', `Bearer ${tokenClientA}`)
        .send({ installmentsCount: 3 })
        .expect(403);

      expect(resBlocked.body.message).toContain('vous avez des échéances en retard de paiement');
    });
  });
});
