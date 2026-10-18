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
  PaymentProvider,
  PaymentTxStatus,
  DeliveryMethod,
} from '../src/generated/prisma/client';

describe('OpenBoutik API — Certification E2E Roadmap Espace Acheteur V2', () => {
  let app: INestApplication;
  let jwtService: JwtService;

  let tokenClientA: string;
  let tokenClientB: string;
  let tokenVendorA: string;
  let tokenSuperAdmin: string;

  const clientAId = 'usr-client-a-buyer';
  const clientBId = 'usr-client-b-buyer';
  const vendorAId = 'usr-vendor-a-buyer';
  const adminId = 'usr-admin-buyer';

  const shopAId = 'shop-buyer-uuid';
  const productAId = 'prod-buyer-boubou';
  const orderAId = 'order-buyer-001';

  // Base en mémoire réactive
  let dbUsers: any[];
  let dbShops: any[];
  let dbWallets: any[];
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
    ];

    dbProducts = [
      {
        id: productAId,
        shopId: shopAId,
        name: 'Boubou Bazin Sénégalais Riche',
        slug: 'boubou-bazin-senegalais-riche',
        priceFcfa: 25000,
        compareAtPriceFcfa: 30000, // En promotion
        stock: 15,
        lowStockThreshold: 3,
        images: ['https://openboutik.sn/boubou.jpg'],
        isPublished: true,
        createdAt: new Date(),
        variants: [],
        reviews: [],
        shop: dbShops[0],
      },
      {
        id: 'prod-tws-bluetooth',
        shopId: shopAId,
        name: 'Écouteurs TWS Bluetooth',
        slug: 'ecouteurs-tws-bluetooth',
        priceFcfa: 15000,
        compareAtPriceFcfa: null, // Pas en promotion
        stock: 5,
        lowStockThreshold: 1,
        images: ['https://openboutik.sn/tws.jpg'],
        isPublished: true,
        createdAt: new Date(),
        variants: [],
        reviews: [],
        shop: dbShops[0],
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
        createdAt: new Date(),
      },
    ];

    dbEscrow = [];
    dbOrderTrackings = [
      {
        id: 'track-init-1',
        orderId: orderAId,
        statusStep: OrderStatus.PENDING_PAYMENT,
        title: 'Commande enregistrée en attente de paiement',
        comment: 'Paiement Mobile Money en attente',
        timestamp: new Date(Date.now() - 3600000),
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
        findUnique: jest.fn(async ({ where }) => dbUsers.find((u) => u.id === where.id || u.phone === where.phone) || null),
        findMany: jest.fn(async () => dbUsers),
      },
      shop: {
        findUnique: jest.fn(async ({ where }) => dbShops.find((s) => s.id === where.id || s.ownerId === where.ownerId || s.slug === where.slug) || null),
        findMany: jest.fn(async () => dbShops),
      },
      product: {
        findUnique: jest.fn(async ({ where }) => {
          const p = dbProducts.find((prod) => prod.id === where.id);
          return p ? { ...p, shop: dbShops.find((s) => s.id === p.shopId) } : null;
        }),
        findMany: jest.fn(async ({ where }) => {
          let results = [...dbProducts];
          if (where?.isPublished !== undefined) {
            results = results.filter((p) => p.isPublished === where.isPublished);
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
          return results.map((p) => ({ ...p, shop: dbShops.find((s) => s.id === p.shopId) }));
        }),
        count: jest.fn(async () => dbProducts.length),
      },
      order: {
        findUnique: jest.fn(async ({ where }) => {
          const o = dbOrders.find((ord) => ord.id === where.id);
          return populateOrder(o);
        }),
        findMany: jest.fn(async ({ where }: any = {}) => {
          return dbOrders
            .filter((o) => (!where.clientId || o.clientId === where.clientId) && (!where.shopId || o.shopId === where.shopId))
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
        findUnique: jest.fn(async ({ where }) => dbWallets.find((w) => w.shopId === where.shopId) || null),
        update: jest.fn(async ({ where, data }) => {
          const w = dbWallets.find((wallet) => wallet.id === where.id || wallet.shopId === where.shopId);
          if (w) {
            if (data.escrowBalanceFcfa?.increment) w.escrowBalanceFcfa += data.escrowBalanceFcfa.increment;
            if (data.escrowBalanceFcfa?.decrement) w.escrowBalanceFcfa -= data.escrowBalanceFcfa.decrement;
            if (data.availableBalanceFcfa?.increment) w.availableBalanceFcfa += data.availableBalanceFcfa.increment;
            if (data.totalEarnedFcfa?.increment) w.totalEarnedFcfa += data.totalEarnedFcfa.increment;
          }
          return w;
        }),
      },
      escrowTransaction: {
        findUnique: jest.fn(async ({ where }) => dbEscrow.find((e) => e.orderId === where.orderId) || null),
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
          const tx = { id: `ptx-${Date.now()}`, createdAt: new Date(), updatedAt: new Date(), ...data };
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
          return dbPaymentTransactions.filter((p) => !where.orderId || p.orderId === where.orderId);
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
              where.OR.some(
                (cond: any) =>
                  (cond.senderId === m.senderId && cond.receiverId === m.receiverId) ||
                  (cond.senderId === m.receiverId && cond.receiverId === m.senderId) ||
                  cond.senderId === m.senderId ||
                  cond.receiverId === m.receiverId,
              ),
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
    tokenSuperAdmin = await jwtService.signAsync(
      { sub: adminId, phone: '+221770000001', role: Role.SUPER_ADMIN },
      { secret },
    );
  });

  afterAll(async () => {
    await app.close();
  });

  // ============================================================================
  // MODULE 1 : PAIEMENT FREE MONEY & WEBHOOK IDEMPOTENT
  // ============================================================================
  describe('MODULE 1 : Paiements Mobile Money (Free Money) & Webhook Idempotent', () => {
    it('1.1 POST /api/v1/payments/initiate doit initier un paiement Free Money avec statut INITIATED', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/payments/initiate')
        .set('Authorization', `Bearer ${tokenClientA}`)
        .send({
          orderId: orderAId,
          provider: PaymentProvider.FREE_MONEY,
          phone: '+221765432109',
        })
        .expect(201);

      expect(res.body.success).toBe(true);
      expect(res.body.data.provider).toBe(PaymentProvider.FREE_MONEY);
      expect(res.body.data.status).toBe(PaymentTxStatus.INITIATED);
      expect(res.body.data.instructions).toContain('#150#');
    });

    it('1.2 POST /api/v1/payments/webhook/FREE_MONEY valide le paiement et passe la commande en PAID_ESCROW', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/payments/webhook/FREE_MONEY')
        .set('x-webhook-secret', 'whsec_openboutik_dev_secret')
        .send({
          externalTxId: 'free_money_txn_123456',
          orderId: orderAId,
          amountFcfa: 27000,
          status: 'SUCCESS',
        })
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.status).toBe(OrderStatus.PAID_ESCROW);

      // Vérification du crédit du solde séquestre du vendeur
      const wallet = dbWallets.find((w) => w.shopId === shopAId);
      expect(wallet.escrowBalanceFcfa).toBe(24250);

      // Vérification de l'ajout automatique dans OrderTracking
      const tracking = dbOrderTrackings.find(
        (t) => t.orderId === orderAId && t.statusStep === OrderStatus.PAID_ESCROW,
      );
      expect(tracking).toBeDefined();
      expect(tracking.title).toContain('séquestre');
    });

    it('1.3 Idempotence : un second webhook identique doit être accepté sans doublon', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/payments/webhook/FREE_MONEY')
        .set('x-webhook-secret', 'whsec_openboutik_dev_secret')
        .send({
          externalTxId: 'free_money_txn_123456',
          orderId: orderAId,
          amountFcfa: 27000,
          status: 'SUCCESS',
        })
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.idempotent).toBe(true);
      expect(res.body.data.externalTxId).toBe('free_money_txn_123456');
    });
  });

  // ============================================================================
  // MODULE 2 : SYSTÈME DE FAVORIS (WISHLIST)
  // ============================================================================
  describe('MODULE 2 : Système de Favoris (Wishlist)', () => {
    it('2.1 POST /api/v1/wishlist/:productId ajoute le produit aux favoris de l’acheteur A', async () => {
      const res = await request(app.getHttpServer())
        .post(`/api/v1/wishlist/${productAId}`)
        .set('Authorization', `Bearer ${tokenClientA}`)
        .expect(201);

      expect(res.body.success).toBe(true);
      expect(res.body.data.item.productId).toBe(productAId);
    });

    it('2.2 Tentative d’ajout doublon retourne 409 Conflict', async () => {
      const res = await request(app.getHttpServer())
        .post(`/api/v1/wishlist/${productAId}`)
        .set('Authorization', `Bearer ${tokenClientA}`)
        .expect(409);

      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('figure déjà dans vos favoris');
    });

    it('2.3 GET /api/v1/wishlist liste les favoris de l’acheteur connecté', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/wishlist')
        .set('Authorization', `Bearer ${tokenClientA}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.total).toBe(1);
      expect(res.body.data.items[0].productId).toBe(productAId);
    });

    it('2.4 Isolation BOLA : l’acheteur B a une wishlist vide', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/wishlist')
        .set('Authorization', `Bearer ${tokenClientB}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.total).toBe(0);
    });

    it('2.5 DELETE /api/v1/wishlist/:productId retire le produit des favoris', async () => {
      const res = await request(app.getHttpServer())
        .delete(`/api/v1/wishlist/${productAId}`)
        .set('Authorization', `Bearer ${tokenClientA}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.productId).toBe(productAId);
    });
  });

  // ============================================================================
  // MODULE 3 : CHAT DIRECT ACHETEUR-VENDEUR (REST + ANTI-FUITE + BOLA)
  // ============================================================================
  describe('MODULE 3 : Messagerie Interne Conversationnelle & Anti-Fuite Séquestre', () => {
    it('3.1 L’acheteur A envoie un message avec numéro sénégalais hors commande payée -> numéro masqué', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/messages')
        .set('Authorization', `Bearer ${tokenClientA}`)
        .send({
          receiverId: vendorAId,
          content: 'Bonjour Moussa, appelle-moi au 77 123 45 67 ou au +221761234567 stp',
          productId: productAId,
        })
        .expect(201);

      expect(res.body.success).toBe(true);
      expect(res.body.data.content).not.toContain('77 123 45 67');
      expect(res.body.data.content).not.toContain('+221761234567');
      expect(res.body.data.content).toContain('Numéro masqué par sécurité OpenBoutik');
    });

    it('3.2 GET /api/v1/messages/conversations liste les échanges du vendeur avec un unreadCount à 1', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/messages/conversations')
        .set('Authorization', `Bearer ${tokenVendorA}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.length).toBeGreaterThan(0);
      const conv = res.body.data.find((c: any) => c.interlocutor.id === clientAId);
      expect(conv).toBeDefined();
      expect(conv.unreadCount).toBe(1);
    });

    it('3.3 PATCH /api/v1/messages/read/:otherUserId acquitte la lecture des messages', async () => {
      const res = await request(app.getHttpServer())
        .patch(`/api/v1/messages/read/${clientAId}`)
        .set('Authorization', `Bearer ${tokenVendorA}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.readCount).toBe(1);

      // Re-vérification unreadCount
      const convRes = await request(app.getHttpServer())
        .get('/api/v1/messages/conversations')
        .set('Authorization', `Bearer ${tokenVendorA}`)
        .expect(200);

      const conv = convRes.body.data.find((c: any) => c.interlocutor.id === clientAId);
      expect(conv.unreadCount).toBe(0);
    });

    it('3.4 GET /api/v1/admin/messages/order/:orderId permet au Super-Admin d’arbitrer un litige', async () => {
      // Ajout d'un message rattaché à la commande
      dbMessages.push({
        id: 'msg-dispute-1',
        senderId: clientAId,
        receiverId: vendorAId,
        orderId: orderAId,
        content: 'Le colis reçu a été endommagé pendant le transport',
        isRead: true,
        createdAt: new Date(),
        sender: dbUsers[0],
        receiver: dbUsers[2],
      });

      const res = await request(app.getHttpServer())
        .get(`/api/v1/admin/messages/order/${orderAId}`)
        .set('Authorization', `Bearer ${tokenSuperAdmin}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.orderId).toBe(orderAId);
      expect(res.body.data.totalMessages).toBeGreaterThan(0);
    });
  });

  // ============================================================================
  // MODULE 4 : HISTORIQUE DU SUIVI DE COMMANDE (STEPPER TIMELINE)
  // ============================================================================
  describe('MODULE 4 : Suivi de Livraison Chronologique (OrderTracking Stepper)', () => {
    it('4.1 Progression de commande : PREPARING -> SHIPPED_TIAK_TIAK -> DELIVERED_CONFIRMED', async () => {
      // 1. Préparation
      await request(app.getHttpServer())
        .patch(`/api/v1/orders/${orderAId}/prepare`)
        .set('Authorization', `Bearer ${tokenVendorA}`)
        .expect(200);

      // 2. Expédition
      await request(app.getHttpServer())
        .patch(`/api/v1/orders/${orderAId}/ship`)
        .set('Authorization', `Bearer ${tokenVendorA}`)
        .expect(200);

      // 3. Confirmation de livraison
      await request(app.getHttpServer())
        .post(`/api/v1/orders/${orderAId}/confirm-delivery`)
        .set('Authorization', `Bearer ${tokenVendorA}`)
        .send({ confirmationCode: '654321' })
        .expect(200);

      // 4. Consultation du stepper timeline
      const res = await request(app.getHttpServer())
        .get(`/api/v1/orders/${orderAId}/tracking`)
        .set('Authorization', `Bearer ${tokenClientA}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.orderId).toBe(orderAId);
      expect(res.body.data.tracking.length).toBeGreaterThanOrEqual(4);

      // Vérification que les étapes chronologiques clés sont présentes
      const stepNames = res.body.data.tracking.map((t: any) => t.statusStep);
      expect(stepNames).toContain(OrderStatus.PENDING_PAYMENT);
      expect(stepNames).toContain(OrderStatus.PREPARING);
      expect(stepNames).toContain(OrderStatus.SHIPPED_TIAK_TIAK);
      expect(stepNames).toContain(OrderStatus.DELIVERED_CONFIRMED);
    });
  });

  // ============================================================================
  // MODULE 5 : RECHERCHE AVANCÉE & FILTRES CATALOGUE
  // ============================================================================
  describe('MODULE 5 : Recherche Avancée & Filtres Promotionnels', () => {
    it('5.1 GET /api/v1/products avec filtres onSaleOnly=true et fourchette de prix', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/products')
        .query({
          search: 'Boubou',
          minPrice: 20000,
          maxPrice: 30000,
          onSaleOnly: true,
          sortBy: 'newest',
        })
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data.length).toBe(1);
      expect(res.body.data[0].name).toContain('Boubou');
      expect(res.body.data[0].compareAtPriceFcfa).toBe(30000);


    });
  });
});
