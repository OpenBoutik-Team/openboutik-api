import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import helmet from 'helmet';
import * as fs from 'fs';
import * as path from 'path';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';
import { JwtService } from '@nestjs/jwt';
import { ChatGateway } from '../src/messages/chat.gateway';
import { TransformInterceptor, AllExceptionsFilter } from '../src/common';
import {
  Role,
  SubscriptionPlan,
  OrderStatus,
  EscrowStatus,
  PaymentProvider,
  PaymentTxStatus,
  DeliveryMethod,
} from '../src/generated/prisma/client';

describe('OpenBoutik API — Certification E2E Roadmap Espace Acheteur V2 (Torture Matrix)', () => {
  let app: INestApplication;
  let jwtService: JwtService;
  let chatGateway: ChatGateway;

  let tokenClientA: string;
  let tokenClientB: string;
  let tokenVendorA: string;
  let tokenVendorB: string;
  let tokenSuperAdmin: string;

  const clientAId = 'usr-client-a-buyer';
  const clientBId = 'usr-client-b-buyer';
  const vendorAId = 'usr-vendor-a-buyer';
  const vendorBId = 'usr-vendor-b-buyer';
  const adminId = 'usr-admin-buyer';

  const shopAId = 'shop-buyer-uuid';
  const shopBId = 'shop-other-uuid';
  const categoryModeId = 'cat-mode-uuid';

  const productAId = 'prod-buyer-boubou';
  const productBId = 'prod-tws-bluetooth';
  const productCId = 'prod-costume-dakar';

  const orderAId = 'order-buyer-001';
  const orderBId = 'order-buyer-002';

  // Base de données simulée en mémoire
  let dbUsers: any[];
  let dbShops: any[];
  let dbWallets: any[];
  let dbCategories: any[];
  let dbProducts: any[];
  let dbOrders: any[];
  let dbEscrow: any[];
  let dbOrderTrackings: any[];
  let dbPaymentTransactions: any[];
  let dbWishlists: any[];
  let dbMessages: any[];

  function populateOrder(o: any) {
    if (!o) return null;
    const shop = dbShops.find((s) => s.id === o.shopId);
    const wallet = shop ? dbWallets.find((w) => w.shopId === shop.id) : null;
    const escrow = dbEscrow.find((e) => e.orderId === o.id);
    const trackingHistory = dbOrderTrackings
      .filter((t) => t.orderId === o.id)
      .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
    const paymentTransactions = dbPaymentTransactions.filter((p) => p.orderId === o.id);

    return {
      ...o,
      shop: shop ? { ...shop, wallet } : null,
      escrow,
      trackingHistory,
      paymentTransactions,
      items: [],
      client: dbUsers.find((u) => u.id === o.clientId),
      notes: [],
    };
  }

  function resetDatabase() {
    dbUsers = [
      {
        id: clientAId,
        fullName: 'Fatou Ndiaye',
        phone: '+221765432109',
        role: Role.CLIENT,
        isActive: true,
      },
      {
        id: clientBId,
        fullName: 'Awa Diop',
        phone: '+221778901234',
        role: Role.CLIENT,
        isActive: true,
      },
      {
        id: vendorAId,
        fullName: 'Moussa Diop',
        phone: '+221770010001',
        role: Role.VENDOR,
        isActive: true,
      },
      {
        id: vendorBId,
        fullName: 'Ibrahima Fall',
        phone: '+221770020002',
        role: Role.VENDOR,
        isActive: true,
      },
      {
        id: adminId,
        fullName: 'Super Admin OpenBoutik',
        phone: '+221770000001',
        role: Role.SUPER_ADMIN,
        isActive: true,
      },
    ];

    dbWallets = [
      {
        id: 'wallet-a-buyer',
        shopId: shopAId,
        escrowBalanceFcfa: 0,
        availableBalanceFcfa: 10000,
        totalEarnedFcfa: 10000,
      },
      {
        id: 'wallet-b-buyer',
        shopId: shopBId,
        escrowBalanceFcfa: 0,
        availableBalanceFcfa: 5000,
        totalEarnedFcfa: 5000,
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
        freeMoneyNumber: '+221761234567',
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
        freeMoneyNumber: '+221769876543',
        subscriptionPlan: SubscriptionPlan.FREE,
        isVerified: true,
        isActive: true,
      },
    ];

    dbCategories = [
      {
        id: categoryModeId,
        shopId: shopAId,
        name: 'Mode & Tradition',
        slug: 'mode-tradition',
        imageUrl: 'https://openboutik.sn/mode.jpg',
      },
    ];

    dbProducts = [
      {
        id: productAId,
        shopId: shopAId,
        categoryId: categoryModeId,
        name: 'Boubou Bazin Sénégalais Riche',
        slug: 'boubou-bazin-senegalais-riche',
        description: 'Boubou traditionnel brodé main de haute qualité',
        priceFcfa: 25000,
        compareAtPriceFcfa: 30000, // En promotion
        stock: 15,
        lowStockThreshold: 3,
        images: ['https://openboutik.sn/boubou.jpg'],
        isPublished: true,
        createdAt: new Date('2026-10-01T10:00:00Z'),
        variants: [],
        reviews: [],
        shop: dbShops[0],
        category: dbCategories[0],
      },
      {
        id: productBId,
        shopId: shopAId,
        categoryId: null,
        name: 'Écouteurs TWS Bluetooth',
        slug: 'ecouteurs-tws-bluetooth',
        description: 'Écouteurs sans fil avec réduction de bruit active',
        priceFcfa: 15000,
        compareAtPriceFcfa: null, // Pas en promotion
        stock: 0, // Rupture de stock
        lowStockThreshold: 1,
        images: ['https://openboutik.sn/tws.jpg'],
        isPublished: true,
        createdAt: new Date('2026-10-05T10:00:00Z'),
        variants: [],
        reviews: [],
        shop: dbShops[0],
        category: null,
      },
      {
        id: productCId,
        shopId: shopAId,
        categoryId: categoryModeId,
        name: 'Costume Traditionnel Dakar',
        slug: 'costume-traditionnel-dakar',
        description: 'Ensemble 3 pièces en coton bazin',
        priceFcfa: 45000,
        compareAtPriceFcfa: 55000, // En promotion
        stock: 8,
        lowStockThreshold: 2,
        images: ['https://openboutik.sn/costume.jpg'],
        isPublished: true,
        createdAt: new Date('2026-10-10T10:00:00Z'),
        variants: [],
        reviews: [],
        shop: dbShops[0],
        category: dbCategories[0],
      },
    ];

    dbOrders = [
      {
        id: orderAId,
        orderNumber: 'OB-2026-9999',
        clientId: clientAId,
        shopId: shopAId,
        subtotalFcfa: 25000,
        deliveryFeeFcfa: 2000,
        discountAmountFcfa: 0,
        totalAmountFcfa: 27000,
        commissionRate: 3,
        commissionAmountFcfa: 750,
        netVendorAmountFcfa: 24250,
        deliveryMethod: DeliveryMethod.TIAK_TIAK,
        deliveryAddress: 'Mermoz Pyrotechnie',
        deliveryCity: 'Dakar',
        deliveryPhone: '+221765432109',
        deliveryConfirmationCode: '654321',
        status: OrderStatus.PENDING_PAYMENT,
        createdAt: new Date('2026-10-18T00:00:00Z'),
      },
      {
        id: orderBId,
        orderNumber: 'OB-2026-8888',
        clientId: clientBId,
        shopId: shopBId,
        subtotalFcfa: 15000,
        deliveryFeeFcfa: 2000,
        discountAmountFcfa: 0,
        totalAmountFcfa: 17000,
        commissionRate: 4,
        commissionAmountFcfa: 600,
        netVendorAmountFcfa: 14400,
        deliveryMethod: DeliveryMethod.TIAK_TIAK,
        deliveryAddress: 'Almadies',
        deliveryCity: 'Dakar',
        deliveryPhone: '+221778901234',
        deliveryConfirmationCode: '123456',
        status: OrderStatus.PENDING_PAYMENT,
        createdAt: new Date('2026-10-18T00:30:00Z'),
      },
    ];

    dbEscrow = [];
    dbOrderTrackings = [
      {
        id: 'track-init-1',
        orderId: orderAId,
        statusStep: OrderStatus.PENDING_PAYMENT,
        title: 'Commande enregistrée en attente de paiement',
        comment: 'Paiement Mobile Money Free Money en attente',
        timestamp: new Date('2026-10-18T00:00:00Z'),
      },
      {
        id: 'track-init-2',
        orderId: orderBId,
        statusStep: OrderStatus.PENDING_PAYMENT,
        title: 'Commande enregistrée en attente de paiement',
        comment: 'Paiement en attente',
        timestamp: new Date('2026-10-18T00:30:00Z'),
      },
    ];
    dbPaymentTransactions = [];
    dbWishlists = [];
    dbMessages = [];
  }

  beforeAll(async () => {
    resetDatabase();

    const mockPrismaService: any = {
      user: {
        findUnique: jest.fn(async ({ where }) =>
          dbUsers.find((u) => u.id === where.id || u.phone === where.phone) || null,
        ),
        findMany: jest.fn(async () => dbUsers),
      },
      shop: {
        findUnique: jest.fn(async ({ where }) =>
          dbShops.find(
            (s) => s.id === where.id || s.ownerId === where.ownerId || s.slug === where.slug,
          ) || null,
        ),
        findMany: jest.fn(async () => dbShops),
      },
      category: {
        findUnique: jest.fn(async ({ where }) =>
          dbCategories.find((c) => c.id === where.id || c.slug === where.slug) || null,
        ),
        findMany: jest.fn(async () => dbCategories),
      },
      product: {
        findUnique: jest.fn(async ({ where }) => {
          const p = dbProducts.find((prod) => prod.id === where.id);
          return p ? { ...p, shop: dbShops.find((s) => s.id === p.shopId) } : null;
        }),
        findMany: jest.fn(async ({ where, skip = 0, take = 50, orderBy }: any = {}) => {
          let results = [...dbProducts];

          if (where?.isPublished !== undefined) {
            results = results.filter((p) => p.isPublished === where.isPublished);
          }
          if (where?.categoryId) {
            results = results.filter((p) => p.categoryId === where.categoryId);
          }
          if (where?.inStockOnly || where?.stock?.gt !== undefined) {
            results = results.filter((p) => p.stock > 0);
          }
          if (where?.compareAtPriceFcfa?.gt !== undefined) {
            results = results.filter((p) => p.compareAtPriceFcfa && p.compareAtPriceFcfa > 0);
          }
          if (where?.priceFcfa?.gte !== undefined) {
            results = results.filter((p) => p.priceFcfa >= where.priceFcfa.gte);
          }
          if (where?.priceFcfa?.lte !== undefined) {
            results = results.filter((p) => p.priceFcfa <= where.priceFcfa.lte);
          }
          if (where?.OR) {
            results = results.filter((p) =>
              where.OR.some((cond: any) => {
                if (cond.name?.contains) {
                  return p.name.toLowerCase().includes(cond.name.contains.toLowerCase());
                }
                if (cond.description?.contains) {
                  return (
                    p.description &&
                    p.description.toLowerCase().includes(cond.description.contains.toLowerCase())
                  );
                }
                return false;
              }),
            );
          }

          if (orderBy?.priceFcfa === 'asc') {
            results.sort((a, b) => a.priceFcfa - b.priceFcfa);
          } else if (orderBy?.priceFcfa === 'desc') {
            results.sort((a, b) => b.priceFcfa - a.priceFcfa);
          } else {
            results.sort(
              (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
            );
          }

          const paginated = results.slice(skip, skip + take);
          return paginated.map((p) => ({
            ...p,
            shop: dbShops.find((s) => s.id === p.shopId),
            category: dbCategories.find((c) => c.id === p.categoryId),
          }));
        }),
        count: jest.fn(async ({ where }: any = {}) => {
          let results = [...dbProducts];
          if (where?.isPublished !== undefined) {
            results = results.filter((p) => p.isPublished === where.isPublished);
          }
          if (where?.stock?.gt !== undefined) {
            results = results.filter((p) => p.stock > 0);
          }
          if (where?.compareAtPriceFcfa?.gt !== undefined) {
            results = results.filter((p) => p.compareAtPriceFcfa && p.compareAtPriceFcfa > 0);
          }
          if (where?.priceFcfa?.gte !== undefined) {
            results = results.filter((p) => p.priceFcfa >= where.priceFcfa.gte);
          }
          if (where?.priceFcfa?.lte !== undefined) {
            results = results.filter((p) => p.priceFcfa <= where.priceFcfa.lte);
          }
          if (where?.OR) {
            results = results.filter((p) =>
              where.OR.some((cond: any) =>
                cond.name?.contains
                  ? p.name.toLowerCase().includes(cond.name.contains.toLowerCase())
                  : false,
              ),
            );
          }
          return results.length;
        }),
      },
      order: {
        findUnique: jest.fn(async ({ where }) => {
          const o = dbOrders.find((ord) => ord.id === where.id);
          return populateOrder(o);
        }),
        findMany: jest.fn(async ({ where }: any = {}) => {
          return dbOrders
            .filter(
              (o) =>
                (!where.clientId || o.clientId === where.clientId) &&
                (!where.shopId || o.shopId === where.shopId),
            )
            .map(populateOrder);
        }),
        update: jest.fn(async ({ where, data }) => {
          const o = dbOrders.find((ord) => ord.id === where.id);
          if (o) Object.assign(o, data);
          return populateOrder(o);
        }),
        updateMany: jest.fn(async ({ where, data }) => {
          const targets = dbOrders.filter((o) => o.id === where.id);
          targets.forEach((t) => Object.assign(t, data));
          return { count: targets.length };
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
            if (data.escrowBalanceFcfa?.decrement) {
              w.escrowBalanceFcfa -= data.escrowBalanceFcfa.decrement;
            }
            if (data.availableBalanceFcfa?.increment) {
              w.availableBalanceFcfa += data.availableBalanceFcfa.increment;
            }
            if (data.totalEarnedFcfa?.increment) {
              w.totalEarnedFcfa += data.totalEarnedFcfa.increment;
            }
          }
          return w;
        }),
      },
      escrowTransaction: {
        findUnique: jest.fn(async ({ where }) =>
          dbEscrow.find((e) => e.orderId === where.orderId || e.id === where.id) || null,
        ),
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
        updateMany: jest.fn(async ({ where, data }) => {
          const targets = dbEscrow.filter((e) => e.orderId === where.orderId);
          targets.forEach((t) => Object.assign(t, data));
          return { count: targets.length };
        }),
      },
      paymentTransaction: {
        create: jest.fn(async ({ data }) => {
          // Simulation contrainte unique sur externalTxId
          if (data.externalTxId) {
            const exists = dbPaymentTransactions.some(
              (p) => p.externalTxId === data.externalTxId && p.status === PaymentTxStatus.SUCCESS,
            );
            if (exists) {
              const p2002Error: any = new Error(
                'Unique constraint failed on the fields: (`externalTxId`)',
              );
              p2002Error.code = 'P2002';
              throw p2002Error;
            }
          }
          const tx = {
            id: `ptx-${Date.now()}-${Math.random()}`,
            createdAt: new Date(),
            updatedAt: new Date(),
            ...data,
          };
          dbPaymentTransactions.push(tx);
          return tx;
        }),
        findUnique: jest.fn(async ({ where }) => {
          if (where.externalTxId) {
            return dbPaymentTransactions.find((p) => p.externalTxId === where.externalTxId) || null;
          }
          if (where.id) {
            return dbPaymentTransactions.find((p) => p.id === where.id) || null;
          }
          return null;
        }),
        findMany: jest.fn(async ({ where }: any = {}) => {
          return dbPaymentTransactions.filter(
            (p) => !where.orderId || p.orderId === where.orderId,
          );
        }),
      },
      wishlist: {
        create: jest.fn(async ({ data }) => {
          const item = {
            id: `wish-${Date.now()}`,
            userId: data.userId,
            productId: data.productId,
            createdAt: new Date(),
            product: dbProducts.find((p) => p.id === data.productId),
          };
          dbWishlists.push(item);
          return item;
        }),
        findUnique: jest.fn(async ({ where }) => {
          return (
            dbWishlists.find(
              (w) =>
                w.userId === where.userId_productId.userId &&
                w.productId === where.userId_productId.productId,
            ) || null
          );
        }),
        findMany: jest.fn(async ({ where }) => {
          return dbWishlists
            .filter((w) => w.userId === where.userId)
            .map((w) => ({
              ...w,
              product: dbProducts.find((p) => p.id === w.productId),
            }));
        }),
        delete: jest.fn(async ({ where }) => {
          const idx = dbWishlists.findIndex(
            (w) =>
              w.userId === where.userId_productId.userId &&
              w.productId === where.userId_productId.productId,
          );
          if (idx !== -1) {
            const removed = dbWishlists.splice(idx, 1)[0];
            return removed;
          }
          return null;
        }),
      },
      message: {
        create: jest.fn(async ({ data }) => {
          const msg = {
            id: `msg-${Date.now()}`,
            createdAt: new Date(),
            isRead: false,
            readAt: null,
            ...data,
            sender: dbUsers.find((u) => u.id === data.senderId),
            receiver: dbUsers.find((u) => u.id === data.receiverId),
            product: data.productId ? dbProducts.find((p) => p.id === data.productId) : null,
          };
          dbMessages.push(msg);
          return msg;
        }),
        findMany: jest.fn(async ({ where }) => {
          let list = [...dbMessages];
          if (where.orderId) {
            list = list.filter((m) => m.orderId === where.orderId);
          } else if (where.OR) {
            list = list.filter((m) =>
              where.OR.some((cond: any) => {
                const matchSender =
                  !cond.senderId || cond.senderId === m.senderId;
                const matchReceiver =
                  !cond.receiverId || cond.receiverId === m.receiverId;
                return matchSender && matchReceiver;
              }),
            );
          }
          return list;
        }),
        updateMany: jest.fn(async ({ where, data }) => {
          const targets = dbMessages.filter(
            (m) =>
              m.receiverId === where.receiverId &&
              m.senderId === where.senderId &&
              m.isRead === false,
          );
          targets.forEach((t) => Object.assign(t, data));
          return { count: targets.length };
        }),
      },
      orderTracking: {
        create: jest.fn(async ({ data }) => {
          const t = { id: `track-${Date.now()}`, timestamp: new Date(), ...data };
          dbOrderTrackings.push(t);
          return t;
        }),
        findMany: jest.fn(async ({ where }) => {
          return dbOrderTrackings.filter((t) => t.orderId === where.orderId);
        }),
      },
      auditLog: {
        create: jest.fn(async ({ data }) => data),
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

    chatGateway = moduleFixture.get<ChatGateway>(ChatGateway);
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
  // SCÉNARIO 1 : PAIEMENTS MOBILE MONEY (FREE_MONEY), PAYMENTTRANSACTION & WEBHOOK
  // ============================================================================
  describe('SCÉNARIO 1 : Paiements Mobile Money (FREE_MONEY), Table PaymentTransaction & Sécurité Webhook', () => {
    it('1.1 Initiation Free Money : Un acheteur crée une transaction PaymentTransaction en statut INITIATED (201)', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/payments/initiate')
        .set('Authorization', `Bearer ${tokenClientA}`)
        .send({
          orderId: orderAId,
          provider: PaymentProvider.FREE_MONEY,
          phone: '+221761234567',
        })
        .expect(201);

      expect(res.body.success).toBe(true);
      expect(res.body.data.orderId).toBe(orderAId);
      expect(res.body.data.provider).toBe('FREE_MONEY');
      expect(res.body.data.status).toBe(PaymentTxStatus.INITIATED);
      expect(res.body.data.instructions).toContain('#150#');
      expect(res.body.data.instructions).toContain('+221761234567');

      const tx = dbPaymentTransactions.find((p) => p.orderId === orderAId);
      expect(tx).toBeDefined();
      expect(tx.status).toBe(PaymentTxStatus.INITIATED);
      expect(tx.provider).toBe(PaymentProvider.FREE_MONEY);
    });

    it('1.2 Attaque Webhook Falsifié : Appel sans secret ou avec mauvais secret -> Rejeté immédiatement (401)', async () => {
      // 1. Appel sans header de secret
      const resMissing = await request(app.getHttpServer())
        .post('/api/v1/payments/webhook/FREE_MONEY')
        .send({
          orderId: orderAId,
          externalTxId: 'FAKE-ATTACK-001',
          amountFcfa: 27000,
          status: 'SUCCESS',
        })
        .expect(401);

      expect(resMissing.body.success).toBe(false);

      // 2. Appel avec mauvais secret
      const resWrong = await request(app.getHttpServer())
        .post('/api/v1/payments/webhook/FREE_MONEY')
        .set('x-webhook-secret', 'bad_secret_hacker_key')
        .send({
          orderId: orderAId,
          externalTxId: 'FAKE-ATTACK-002',
          amountFcfa: 27000,
          status: 'SUCCESS',
        })
        .expect(401);

      expect(resWrong.body.success).toBe(false);

      // Vérification que la commande est toujours en PENDING_PAYMENT
      const order = dbOrders.find((o) => o.id === orderAId);
      expect(order.status).toBe(OrderStatus.PENDING_PAYMENT);
    });

    it('1.3 Webhook Légitime & Transaction ACID : Validation FREE-TX-998877, PAID_ESCROW et crédit séquestre', async () => {
      const legitSecret =
        process.env.FREE_MONEY_WEBHOOK_SECRET ||
        process.env.PAYMENT_WEBHOOK_SECRET ||
        'whsec_openboutik_dev_secret';

      const initialWallet = dbWallets.find((w) => w.shopId === shopAId);
      const initialEscrow = initialWallet.escrowBalanceFcfa;

      const res = await request(app.getHttpServer())
        .post('/api/v1/payments/webhook/FREE_MONEY')
        .set('x-webhook-secret', legitSecret)
        .send({
          orderId: orderAId,
          externalTxId: 'FREE-TX-998877',
          amountFcfa: 27000,
          status: 'SUCCESS',
        })
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.status).toBe(OrderStatus.PAID_ESCROW);

      // Vérifications ACID dans les tables
      const order = dbOrders.find((o) => o.id === orderAId);
      expect(order.status).toBe(OrderStatus.PAID_ESCROW);

      const wallet = dbWallets.find((w) => w.shopId === shopAId);
      expect(wallet.escrowBalanceFcfa).toBe(initialEscrow + order.netVendorAmountFcfa);

      const trackingEntry = dbOrderTrackings.find(
        (t) => t.orderId === orderAId && t.statusStep === OrderStatus.PAID_ESCROW,
      );
      expect(trackingEntry).toBeDefined();
      expect(trackingEntry.comment).toContain('FREE-TX-998877');
    });

    it('1.4 Attaque Rejeu / Double Webhook (Promise.all 5x) : 1 seul traitement, aucun double crédit séquestre', async () => {
      const legitSecret =
        process.env.FREE_MONEY_WEBHOOK_SECRET ||
        process.env.PAYMENT_WEBHOOK_SECRET ||
        'whsec_openboutik_dev_secret';

      const walletBefore = dbWallets.find((w) => w.shopId === shopAId);
      const balanceBefore = walletBefore.escrowBalanceFcfa;

      // 5 appels simultanés avec le même externalTxId
      const calls = Array.from({ length: 5 }, () =>
        request(app.getHttpServer())
          .post('/api/v1/payments/webhook/FREE_MONEY')
          .set('x-webhook-secret', legitSecret)
          .send({
            orderId: orderAId,
            externalTxId: 'FREE-TX-998877',
            amountFcfa: 27000,
            status: 'SUCCESS',
          }),
      );

      const responses = await Promise.all(calls);

      for (const res of responses) {
        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
      }

      // Preuve mathématique : Le solde séquestre n'a pas bougé
      const walletAfter = dbWallets.find((w) => w.shopId === shopAId);
      expect(walletAfter.escrowBalanceFcfa).toBe(balanceBefore);

      // Vérification qu'il n'y a qu'une seule entrée de tracking PAID_ESCROW
      const paidTrackings = dbOrderTrackings.filter(
        (t) => t.orderId === orderAId && t.statusStep === OrderStatus.PAID_ESCROW,
      );
      expect(paidTrackings.length).toBe(1);
    });
  });

  // ============================================================================
  // SCÉNARIO 2 : SYSTÈME DE FAVORIS (WISHLIST) & ISOLATION BOLA
  // ============================================================================
  describe('SCÉNARIO 2 : Système de Favoris (Wishlist) & Isolation BOLA', () => {
    it('2.1 Acheteur A ajoute un produit en favori (POST /wishlist/:productId) -> 201 Created', async () => {
      const res = await request(app.getHttpServer())
        .post(`/api/v1/wishlist/${productAId}`)
        .set('Authorization', `Bearer ${tokenClientA}`)
        .expect(201);

      expect(res.body.success).toBe(true);
      expect(res.body.data.item.productId).toBe(productAId);
      expect(res.body.data.item.userId).toBe(clientAId);
    });

    it('2.2 Acheteur A renvoie POST /wishlist/:productId une 2ème fois -> 409 Conflict propre', async () => {
      const res = await request(app.getHttpServer())
        .post(`/api/v1/wishlist/${productAId}`)
        .set('Authorization', `Bearer ${tokenClientA}`)
        .expect(409);

      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('figure déjà dans vos favoris');
    });

    it('2.3 Acheteur A appelle GET /wishlist -> Détails, prix FCFA et boutique retournés (200 OK)', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/wishlist')
        .set('Authorization', `Bearer ${tokenClientA}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.total).toBe(1);
      expect(res.body.data.items[0].product.id).toBe(productAId);
      expect(res.body.data.items[0].product.priceFcfa).toBe(25000);
      expect(res.body.data.items[0].product.shop.id).toBe(shopAId);
    });

    it('2.4 Pentest BOLA : Acheteur B voit une wishlist vide et ne peut pas supprimer le favori de A', async () => {
      // 1. Liste de l'Acheteur B vide
      const resB = await request(app.getHttpServer())
        .get('/api/v1/wishlist')
        .set('Authorization', `Bearer ${tokenClientB}`)
        .expect(200);

      expect(resB.body.success).toBe(true);
      expect(resB.body.data.total).toBe(0);
      expect(resB.body.data.items.length).toBe(0);

      // 2. Tentative de suppression du favori de A par l'Acheteur B -> 404 (non trouvé dans la liste de B)
      const resDeleteFraud = await request(app.getHttpServer())
        .delete(`/api/v1/wishlist/${productAId}`)
        .set('Authorization', `Bearer ${tokenClientB}`)
        .expect(404);

      expect(resDeleteFraud.body.success).toBe(false);

      // 3. Vérification que le favori de l'Acheteur A est toujours intact
      const resACheck = await request(app.getHttpServer())
        .get('/api/v1/wishlist')
        .set('Authorization', `Bearer ${tokenClientA}`)
        .expect(200);

      expect(resACheck.body.data.total).toBe(1);
    });

    it('2.5 Acheteur A retire le produit (DELETE /wishlist/:productId) -> 200 OK, liste repasse à 0', async () => {
      const res = await request(app.getHttpServer())
        .delete(`/api/v1/wishlist/${productAId}`)
        .set('Authorization', `Bearer ${tokenClientA}`)
        .expect(200);

      expect(res.body.success).toBe(true);

      const resList = await request(app.getHttpServer())
        .get('/api/v1/wishlist')
        .set('Authorization', `Bearer ${tokenClientA}`)
        .expect(200);

      expect(resList.body.data.total).toBe(0);
    });
  });

  // ============================================================================
  // SCÉNARIO 3 : CHAT INTERNE ACHETEUR-VENDEUR (REST, SOCKET.IO & ANTI-FUITE)
  // ============================================================================
  describe('SCÉNARIO 3 : Chat Interne Acheteur-Vendeur (REST + Socket.io + Filtre Anti-Fuite WhatsApp + Litiges)', () => {
    it('3.1 Barrière Anti-Fuite avant Paiement : Numéros de téléphone masqués automatiquement', async () => {
      // Message avec numéros sénégalais sans commande payée
      const res = await request(app.getHttpServer())
        .post('/api/v1/messages')
        .set('Authorization', `Bearer ${tokenClientA}`)
        .send({
          receiverId: vendorAId,
          shopId: shopAId,
          orderId: orderBId, // orderBId est encore PENDING_PAYMENT
          content:
            'Appelle-moi vite sur WhatsApp au +221 77 456 78 90 ou 781112233 pour payer hors site',
        })
        .expect(201);

      expect(res.body.success).toBe(true);
      expect(res.body.data.content).toContain('[Numéro masqué par sécurité OpenBoutik');
      expect(res.body.data.content).not.toContain('+221 77 456 78 90');
      expect(res.body.data.content).not.toContain('781112233');

      // Vérification en base de données
      const savedMsg = dbMessages.find((m) => m.id === res.body.data.id);
      expect(savedMsg.content).toContain('[Numéro masqué par sécurité OpenBoutik');
    });

    it('3.2 Cycle de Conversation & Compteur Non-Lus : unreadCount=1 puis passage à 0 avec PATCH /messages/read', async () => {
      // 1. Le Vendeur A consulte ses conversations et voit unreadCount: 1
      const convRes = await request(app.getHttpServer())
        .get('/api/v1/messages/conversations')
        .set('Authorization', `Bearer ${tokenVendorA}`)
        .expect(200);

      expect(convRes.body.success).toBe(true);
      expect(convRes.body.data.length).toBeGreaterThanOrEqual(1);
      const convWithA = convRes.body.data.find(
        (c: any) => c.interlocutor.id === clientAId,
      );
      expect(convWithA).toBeDefined();
      expect(convWithA.unreadCount).toBe(1);

      // 2. Le Vendeur A marque les messages comme lus
      const readRes = await request(app.getHttpServer())
        .patch(`/api/v1/messages/read/${clientAId}`)
        .set('Authorization', `Bearer ${tokenVendorA}`)
        .expect(200);

      expect(readRes.body.success).toBe(true);
      expect(readRes.body.data.readCount).toBe(1);

      // 3. Le Vendeur A répond à l'Acheteur A
      await request(app.getHttpServer())
        .post('/api/v1/messages')
        .set('Authorization', `Bearer ${tokenVendorA}`)
        .send({
          receiverId: clientAId,
          shopId: shopAId,
          content: 'Bonjour, l’article est disponible en stock à Mermoz !',
        })
        .expect(201);

      // 4. L'Acheteur A consulte le fil de discussion
      const threadRes = await request(app.getHttpServer())
        .get(`/api/v1/messages/thread/${vendorAId}`)
        .set('Authorization', `Bearer ${tokenClientA}`)
        .expect(200);

      expect(threadRes.body.success).toBe(true);
      expect(threadRes.body.data.length).toBe(2);
      expect(threadRes.body.data[1].content).toContain(
        'Bonjour, l’article est disponible en stock à Mermoz !',
      );
    });

    it('3.3 Pentest BOLA Messagerie : Acheteur B ne peut pas lire le fil privé entre A et le Vendeur A', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/v1/messages/thread/${vendorAId}`)
        .set('Authorization', `Bearer ${tokenClientB}`)
        .expect(200);

      // La liste retournée pour B est strictement vide, aucun message de A n'a fuité
      expect(res.body.success).toBe(true);
      expect(res.body.data.length).toBe(0);
    });

    it('3.4 Preuve Officielle pour Arbitrage Super-Admin : CLIENT/VENDOR 403, SUPER_ADMIN 200 OK', async () => {
      // 1. Client A tente d'accéder au endpoint admin litiges -> 403 Forbidden
      await request(app.getHttpServer())
        .get(`/api/v1/admin/messages/order/${orderBId}`)
        .set('Authorization', `Bearer ${tokenClientA}`)
        .expect(403);

      // 2. Vendeur A tente d'accéder au endpoint admin litiges -> 403 Forbidden
      await request(app.getHttpServer())
        .get(`/api/v1/admin/messages/order/${orderBId}`)
        .set('Authorization', `Bearer ${tokenVendorA}`)
        .expect(403);

      // 3. Super Admin accède à l'historique complet pour arbitrage -> 200 OK
      const adminRes = await request(app.getHttpServer())
        .get(`/api/v1/admin/messages/order/${orderBId}`)
        .set('Authorization', `Bearer ${tokenSuperAdmin}`)
        .expect(200);

      expect(adminRes.body.success).toBe(true);
      expect(adminRes.body.data.orderId).toBe(orderBId);
      expect(adminRes.body.data.messages.length).toBeGreaterThanOrEqual(1);
    });

    it('3.5 Passerelle Temps Réel (ChatGateway Socket.io) : Rejet sans token et routage temps réel', async () => {
      expect(chatGateway).toBeDefined();

      // Mock client sans token -> rejet immédiat
      const fakeClientNoToken: any = {
        id: 'sock-unauth-1',
        handshake: { auth: {}, headers: {} },
        disconnect: jest.fn(),
      };
      await chatGateway.handleConnection(fakeClientNoToken);
      expect(fakeClientNoToken.disconnect).toHaveBeenCalled();

      // Mock client avec token valide Client A -> jointure dans sa room
      const fakeClientAuth: any = {
        id: 'sock-auth-client-a',
        handshake: { auth: { token: tokenClientA }, headers: {} },
        data: {},
        join: jest.fn(async () => {}),
        disconnect: jest.fn(),
      };
      await chatGateway.handleConnection(fakeClientAuth);
      expect(fakeClientAuth.data.userId).toBe(clientAId);
      expect(fakeClientAuth.join).toHaveBeenCalledWith(`user_${clientAId}`);
    });
  });

  // ============================================================================
  // SCÉNARIO 4 : SUIVI DE LIVRAISON HISTORISÉ (ORDERTRACKING TIMELINE)
  // ============================================================================
  describe('SCÉNARIO 4 : Suivi de Livraison Historisé (OrderTracking Timeline)', () => {
    it('4.1 Cycle de commande complet : 5 étapes distinctes dans trackingHistory (timestamp ASC)', async () => {
      // 1. Passage en PREPARING par le Vendeur A
      await request(app.getHttpServer())
        .patch(`/api/v1/orders/${orderAId}/prepare`)
        .set('Authorization', `Bearer ${tokenVendorA}`)
        .expect(200);

      // 2. Passage en SHIPPED_TIAK_TIAK par le Vendeur A
      await request(app.getHttpServer())
        .patch(`/api/v1/orders/${orderAId}/ship`)
        .set('Authorization', `Bearer ${tokenVendorA}`)
        .expect(200);

      // 3. Confirmation de livraison par le Vendeur avec OTP
      await request(app.getHttpServer())
        .post(`/api/v1/orders/${orderAId}/confirm-delivery`)
        .set('Authorization', `Bearer ${tokenVendorA}`)
        .send({ confirmationCode: '654321' })
        .expect(200);

      // 4. Consultation du suivi de livraison par l'Acheteur A
      const res = await request(app.getHttpServer())
        .get(`/api/v1/orders/${orderAId}/tracking`)
        .set('Authorization', `Bearer ${tokenClientA}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.orderId).toBe(orderAId);
      expect(res.body.data.status).toBe(OrderStatus.DELIVERED_CONFIRMED);

      const trackingSteps = res.body.data.tracking.map((t: any) => t.statusStep);
      expect(trackingSteps).toContain(OrderStatus.PENDING_PAYMENT);
      expect(trackingSteps).toContain(OrderStatus.PAID_ESCROW);
      expect(trackingSteps).toContain(OrderStatus.PREPARING);
      expect(trackingSteps).toContain(OrderStatus.SHIPPED_TIAK_TIAK);
      expect(trackingSteps).toContain(OrderStatus.DELIVERED_CONFIRMED);

      // Vérification que les 5 étapes sont exactement présentes
      expect(trackingSteps.length).toBe(5);

      // 5. Consultation directe de la commande (GET /orders/:id)
      const resOrder = await request(app.getHttpServer())
        .get(`/api/v1/orders/${orderAId}`)
        .set('Authorization', `Bearer ${tokenClientA}`)
        .expect(200);

      expect(resOrder.body.data.trackingHistory.length).toBe(5);
    });

    it('4.2 Pentest BOLA Tracking : Acheteur B et Vendeur B bloqués (403 Forbidden)', async () => {
      // Acheteur B tente d'accéder au suivi de la commande de A
      const resBuyerB = await request(app.getHttpServer())
        .get(`/api/v1/orders/${orderAId}/tracking`)
        .set('Authorization', `Bearer ${tokenClientB}`)
        .expect(403);

      expect(resBuyerB.body.success).toBe(false);

      // Vendeur B tente d'accéder au suivi de la commande de la boutique A
      const resVendorB = await request(app.getHttpServer())
        .get(`/api/v1/orders/${orderAId}/tracking`)
        .set('Authorization', `Bearer ${tokenVendorB}`)
        .expect(403);

      expect(resVendorB.body.success).toBe(false);
    });
  });

  // ============================================================================
  // SCÉNARIO 5 : RECHERCHE AVANCÉE, FILTRES COMBINÉS & INDEX B-TREE
  // ============================================================================
  describe('SCÉNARIO 5 : Recherche Avancée, Filtres Combinés & Index B-Tree (GET /products)', () => {
    it('5.1 Vérification de l’existence des index B-Tree dans prisma/schema.prisma', () => {
      const schemaPath = path.resolve(process.cwd(), 'prisma/schema.prisma');
      const schemaContent = fs.readFileSync(schemaPath, 'utf-8');

      expect(schemaContent).toContain('@@index([categoryId])');
      expect(schemaContent).toContain('@@index([name])');
      expect(schemaContent).toContain('@@index([shopId, isPublished, priceFcfa])');
    });

    it('5.2 GET /products avec filtres combinés et tri price_asc / price_desc', async () => {
      // 1. Filtre combiné : en promotion, en stock, fourchette de prix
      const resFiltered = await request(app.getHttpServer())
        .get('/api/v1/products')
        .query({
          minPrice: 20000,
          maxPrice: 50000,
          onSaleOnly: true,
          inStockOnly: true,
          sortBy: 'price_asc',
        })
        .expect(200);

      expect(resFiltered.body.success).toBe(true);
      expect(Array.isArray(resFiltered.body.data)).toBe(true);

      // Doit inclure Boubou (25000) et Costume (45000) mais PAS TWS (hors stock et pas en promo)
      expect(resFiltered.body.data.length).toBe(2);
      expect(resFiltered.body.data[0].priceFcfa).toBe(25000);
      expect(resFiltered.body.data[1].priceFcfa).toBe(45000);

      // 2. Même requête avec tri inverse price_desc
      const resDesc = await request(app.getHttpServer())
        .get('/api/v1/products')
        .query({
          minPrice: 20000,
          maxPrice: 50000,
          onSaleOnly: true,
          inStockOnly: true,
          sortBy: 'price_desc',
        })
        .expect(200);

      expect(resDesc.body.data[0].priceFcfa).toBe(45000);
      expect(resDesc.body.data[1].priceFcfa).toBe(25000);

      // 3. Filtre par mot-clé search
      const resSearch = await request(app.getHttpServer())
        .get('/api/v1/products')
        .query({
          search: 'Sénégalais',
        })
        .expect(200);

      expect(resSearch.body.data.length).toBe(1);
      expect(resSearch.body.data[0].name).toContain('Boubou Bazin Sénégalais Riche');
    });
  });
});
