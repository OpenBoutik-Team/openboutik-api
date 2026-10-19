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
  SubscriptionStatus,
  EscrowStatus,
  PaymentProvider,
  DeliveryMethod,
  KycStatus,
  SalesChannel,
  BillingAttemptStatus,
} from '../src/generated/prisma/client';

describe('OpenBoutik API — Certification E2E Phase 5 (SaaS Multi-Tenant, Store Builder, Dunning & Dashboard 360)', () => {
  let app: INestApplication;
  let jwtService: JwtService;

  let tokenClient: string;
  let tokenVendorFree: string;
  let tokenVendorPro: string;
  let tokenSuperAdmin: string;

  const clientId = 'usr-client-phase5';
  const vendorFreeId = 'usr-vendor-free-phase5';
  const vendorProId = 'usr-vendor-pro-phase5';
  const adminId = 'usr-admin-phase5';

  const shopFreeId = 'shop-free-phase5';
  const shopProId = 'shop-pro-phase5';

  const productFreeId = 'prod-free-1111-1111-1111-111111111111';
  const productPro1Id = 'prod-pro1-2222-2222-2222-222222222222';
  const productPro2Id = 'prod-pro2-3333-3333-3333-333333333333';

  // Base en mémoire réactive
  let dbUsers: any[];
  let dbShops: any[];
  let dbWallets: any[];
  let dbProducts: any[];
  let dbOrders: any[];
  let dbEscrow: any[];
  let dbOrderTrackings: any[];
  let dbShopSponsors: any[];
  let dbBillingLogs: any[];
  let dbUsedTrials: any[];
  let dbAuditLogs: any[];

  function resetDatabase() {
    dbUsers = [
      {
        id: clientId,
        fullName: 'Fatou Ndiaye (Acheteuse)',
        phone: '+221771110001',
        role: Role.CLIENT,
        kycStatus: KycStatus.NONE,
        isActive: true,
      },
      {
        id: vendorFreeId,
        fullName: 'Modou Fall (Vendeur Free)',
        phone: '+221772220002',
        role: Role.VENDOR,
        kycStatus: KycStatus.VERIFIED,
        isActive: true,
      },
      {
        id: vendorProId,
        fullName: 'Aissatou Ba (Vendeuse Pro)',
        phone: '+221773330003',
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
        id: 'wallet-free-p5',
        shopId: shopFreeId,
        escrowBalanceFcfa: 0,
        availableBalanceFcfa: 0,
        totalEarnedFcfa: 0,
      },
      {
        id: 'wallet-pro-p5',
        shopId: shopProId,
        escrowBalanceFcfa: 0,
        availableBalanceFcfa: 25000,
        totalEarnedFcfa: 150000,
      },
    ];

    dbShops = [
      {
        id: shopFreeId,
        ownerId: vendorFreeId,
        name: 'Boutique Starter Dakar',
        slug: 'boutique-starter-dakar',
        subdomain: null,
        subdomainEnabled: false,
        customDomain: null,
        subscriptionPlan: SubscriptionPlan.FREE,
        subscriptionStatus: SubscriptionStatus.FREE,
        commissionRate: 3.0,
        totalCommissionSavedFcfa: 0,
        hasUsedFreeTrial: false,
        trialEndsAt: null,
        currentPeriodStart: null,
        currentPeriodEnd: null,
        billingRetryCount: 0,
        gracePeriodEndsAt: null,
        nextBillingRetryAt: null,
        themeConfig: null,
        faviconUrl: null,
        announcementBarText: null,
        city: 'Dakar',
        whatsappNumber: '+221772220002',
        waveNumber: '+221772220002',
        omNumber: null,
        idCardNumber: '1234567890123',
        isVerified: true,
        isActive: true,
        vacationMode: false,
      },
      {
        id: shopProId,
        ownerId: vendorProId,
        name: 'Dakar Chic Boutique',
        slug: 'dakar-chic',
        subdomain: 'dakar-chic',
        subdomainEnabled: true,
        customDomain: null,
        subscriptionPlan: SubscriptionPlan.PRO,
        subscriptionStatus: SubscriptionStatus.ACTIVE,
        commissionRate: 0.0,
        totalCommissionSavedFcfa: 12000,
        hasUsedFreeTrial: true,
        trialEndsAt: null,
        currentPeriodStart: new Date(Date.now() - 25 * 24 * 60 * 60 * 1000),
        currentPeriodEnd: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000),
        billingRetryCount: 0,
        gracePeriodEndsAt: null,
        nextBillingRetryAt: null,
        themeConfig: {
          primaryColor: '#059669',
          secondaryColor: '#0F172A',
        },
        faviconUrl: 'https://cdn.openboutik.sn/favicons/dakar-chic.png',
        announcementBarText: 'Bienvenue chez Dakar Chic !',
        city: 'Dakar',
        whatsappNumber: '+221773330003',
        waveNumber: '+221773330003',
        omNumber: '+221773330003',
        idCardNumber: '9876543210987',
        isVerified: true,
        isActive: true,
        vacationMode: false,
      },
    ];

    dbProducts = [
      {
        id: productFreeId,
        shopId: shopFreeId,
        name: 'T-Shirt Simple Coton',
        slug: 't-shirt-simple-coton',
        priceFcfa: 10000,
        compareAtPriceFcfa: null,
        stock: 20,
        lowStockThreshold: 3,
        displayOrder: 0,
        isFeatured: false,
        isPublished: true,
        createdAt: new Date(),
        variants: [],
      },
      {
        id: productPro1Id,
        shopId: shopProId,
        name: 'Grand Boubou Bazin Riche',
        slug: 'grand-boubou-bazin-riche',
        priceFcfa: 50000,
        compareAtPriceFcfa: 65000,
        stock: 10,
        lowStockThreshold: 2,
        displayOrder: 1,
        isFeatured: true,
        isPublished: true,
        createdAt: new Date(),
        variants: [],
      },
      {
        id: productPro2Id,
        shopId: shopProId,
        name: 'Chaussures Cuir Touba VIP',
        slug: 'chaussures-cuir-touba-vip',
        priceFcfa: 25000,
        compareAtPriceFcfa: null,
        stock: 5,
        lowStockThreshold: 2,
        displayOrder: 2,
        isFeatured: false,
        isPublished: true,
        createdAt: new Date(),
        variants: [],
      },
    ];

    dbOrders = [];
    dbEscrow = [];
    dbOrderTrackings = [];
    dbShopSponsors = [];
    dbBillingLogs = [];
    dbUsedTrials = [];
    dbAuditLogs = [];
  }

  beforeAll(async () => {
    resetDatabase();

    const mockPrismaService: any = {
      user: {
        findUnique: jest.fn(async ({ where }) => {
          return dbUsers.find((u) => u.id === where.id || u.phone === where.phone) || null;
        }),
        findMany: jest.fn(async () => dbUsers),
        update: jest.fn(async ({ where, data }) => {
          const u = dbUsers.find((user) => user.id === where.id);
          if (u) Object.assign(u, data);
          return u;
        }),
      },
      shop: {
        findUnique: jest.fn(async ({ where, include }) => {
          const s = dbShops.find(
            (shop) =>
              shop.id === where.id ||
              shop.ownerId === where.ownerId ||
              shop.slug === where.slug ||
              shop.subdomain === where.subdomain ||
              shop.customDomain === where.customDomain,
          );
          if (!s) return null;
          const result: any = { ...s };
          if (include?._count) {
            result._count = {
              sponsors: dbShopSponsors.filter((sp) => sp.shopId === s.id && sp.isActive).length,
            };
          }
          if (include?.wallet) {
            result.wallet = dbWallets.find((w) => w.shopId === s.id) || null;
          }
          if (include?.sponsors) {
            result.sponsors = dbShopSponsors.filter((sp) => sp.shopId === s.id && sp.isActive);
          }
          if (include?.products) {
            result.products = dbProducts.filter((p) => p.shopId === s.id && p.isPublished);
          }
          return result;
        }),
        findFirst: jest.fn(async ({ where, include }) => {
          const s = dbShops.find((shop) => {
            if (where?.id && shop.id !== where.id) return false;
            if (where?.slug && shop.slug !== where.slug) return false;
            if (where?.subdomain && shop.subdomain !== where.subdomain) return false;
            if (where?.customDomain && shop.customDomain !== where.customDomain) return false;
            if (where?.ownerId && shop.ownerId !== where.ownerId) return false;
            if (where?.OR) {
              const matched = where.OR.some((cond: any) => {
                if (cond.slug && shop.slug === cond.slug) return true;
                if (cond.subdomain && shop.subdomain === cond.subdomain) return true;
                if (cond.customDomain && shop.customDomain === cond.customDomain) return true;
                return false;
              });
              if (!matched) return false;
            }
            return true;
          });
          if (!s) return null;
          const result: any = { ...s };
          if (include?.wallet) {
            result.wallet = dbWallets.find((w) => w.shopId === s.id) || null;
          }
          return result;
        }),
        findMany: jest.fn(async ({ where, select }: any = {}) => {
          let list = dbShops.filter((shop) => {
            if (where?.subscriptionPlan?.in && !where.subscriptionPlan.in.includes(shop.subscriptionPlan)) {
              return false;
            }
            if (where?.subscriptionStatus?.in && !where.subscriptionStatus.in.includes(shop.subscriptionStatus)) {
              return false;
            }
            if (where?.subscriptionStatus && typeof where.subscriptionStatus === 'string' && shop.subscriptionStatus !== where.subscriptionStatus) {
              return false;
            }
            if (where?.billingRetryCount?.lt !== undefined && !(shop.billingRetryCount < where.billingRetryCount.lt)) {
              return false;
            }
            if (where?.OR) {
              const matchesOr = where.OR.some((cond: any) => {
                if (cond.currentPeriodEnd?.lte && shop.currentPeriodEnd) {
                  return new Date(shop.currentPeriodEnd) <= new Date(cond.currentPeriodEnd.lte);
                }
                if (cond.trialEndsAt?.lte && shop.trialEndsAt) {
                  return new Date(shop.trialEndsAt) <= new Date(cond.trialEndsAt.lte);
                }
                if (cond.nextBillingRetryAt?.lte && shop.nextBillingRetryAt) {
                  return new Date(shop.nextBillingRetryAt) <= new Date(cond.nextBillingRetryAt.lte);
                }
                if (cond.nextBillingRetryAt === null && shop.nextBillingRetryAt === null) {
                  return true;
                }
                if (cond.gracePeriodEndsAt?.lte && shop.gracePeriodEndsAt) {
                  return new Date(shop.gracePeriodEndsAt) <= new Date(cond.gracePeriodEndsAt.lte);
                }
                return false;
              });
              if (!matchesOr) return false;
            }
            return true;
          });

          if (select) {
            return list.map((s) => {
              const selected: any = {};
              for (const key of Object.keys(select)) {
                selected[key] = s[key];
              }
              return selected;
            });
          }

          return list.map((s) => ({
            ...s,
            wallet: dbWallets.find((w) => w.shopId === s.id),
          }));
        }),
        update: jest.fn(async ({ where, data }) => {
          const s = dbShops.find((shop) => shop.id === where.id || shop.ownerId === where.ownerId);
          if (!s) return null;
          if (data.totalCommissionSavedFcfa?.increment) {
            s.totalCommissionSavedFcfa += data.totalCommissionSavedFcfa.increment;
            delete data.totalCommissionSavedFcfa;
          }
          if (data.billingRetryCount?.increment) {
            s.billingRetryCount += data.billingRetryCount.increment;
            delete data.billingRetryCount;
          }
          Object.assign(s, data);
          return {
            ...s,
            wallet: dbWallets.find((w) => w.shopId === s.id),
          };
        }),
      },
      product: {
        findUnique: jest.fn(async ({ where, include }) => {
          const p = dbProducts.find((prod) => prod.id === where.id);
          if (!p) return null;
          const result: any = { ...p };
          if (include?.shop) {
            result.shop = dbShops.find((s) => s.id === p.shopId);
          }
          return result;
        }),
        findMany: jest.fn(async ({ where, include, select, orderBy }: any = {}) => {
          let list = dbProducts.filter((prod) => {
            if (where?.id?.in && !where.id.in.includes(prod.id)) return false;
            if (where?.shopId && prod.shopId !== where.shopId) return false;
            if (where?.isPublished !== undefined && prod.isPublished !== where.isPublished) return false;
            return true;
          });

          if (orderBy?.displayOrder === 'asc') {
            list = [...list].sort((a, b) => a.displayOrder - b.displayOrder);
          }

          if (select) {
            return list.map((p) => {
              const res: any = {};
              for (const k of Object.keys(select)) res[k] = p[k];
              return res;
            });
          }

          if (include?.shop) {
            return list.map((p) => ({
              ...p,
              shop: dbShops.find((s) => s.id === p.shopId),
            }));
          }

          return list;
        }),
        count: jest.fn(async ({ where }: any = {}) => {
          let list = dbProducts;
          if (where?.shopId) list = list.filter((p) => p.shopId === where.shopId);
          if (where?.stock === 0) list = list.filter((p) => p.stock === 0);
          if (where?.stock?.gt && where?.stock?.lte) {
            list = list.filter((p) => p.stock > where.stock.gt && p.stock <= where.stock.lte);
          }
          return list.length;
        }),
        update: jest.fn(async ({ where, data }) => {
          const p = dbProducts.find((prod) => prod.id === where.id);
          if (p) {
            if (data.stock?.decrement) {
              p.stock -= data.stock.decrement;
            }
            Object.assign(p, data);
          }
          return p;
        }),
      },
      vendorWallet: {
        findUnique: jest.fn(async ({ where }) => {
          return dbWallets.find((w) => w.shopId === where.shopId || w.id === where.id) || null;
        }),
        update: jest.fn(async ({ where, data }) => {
          const w = dbWallets.find((wallet) => wallet.shopId === where.shopId || wallet.id === where.id);
          if (w) {
            const copy = { ...data };
            if (copy.availableBalanceFcfa?.increment) {
              w.availableBalanceFcfa += copy.availableBalanceFcfa.increment;
              delete copy.availableBalanceFcfa;
            }
            if (copy.availableBalanceFcfa?.decrement) {
              w.availableBalanceFcfa -= copy.availableBalanceFcfa.decrement;
              delete copy.availableBalanceFcfa;
            }
            if (copy.escrowBalanceFcfa?.increment) {
              w.escrowBalanceFcfa += copy.escrowBalanceFcfa.increment;
              delete copy.escrowBalanceFcfa;
            }
            if (copy.escrowBalanceFcfa?.decrement) {
              w.escrowBalanceFcfa -= copy.escrowBalanceFcfa.decrement;
              delete copy.escrowBalanceFcfa;
            }
            if (copy.totalEarnedFcfa?.increment) {
              w.totalEarnedFcfa += copy.totalEarnedFcfa.increment;
              delete copy.totalEarnedFcfa;
            }
            Object.assign(w, copy);
          }
          return w;
        }),
      },
      walletTransaction: {
        create: jest.fn(async ({ data }) => {
          const tx = { id: `wtx-${Date.now()}-${Math.random()}`, createdAt: new Date(), ...data };
          return tx;
        }),
        findMany: jest.fn(async () => []),
      },
      order: {
        create: jest.fn(async ({ data }) => {
          const order = {
            id: `ord-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
            createdAt: new Date(),
            ...data,
          };
          if (data.escrow?.create) {
            const esc = {
              id: `esc-${Date.now()}-${Math.random()}`,
              orderId: order.id,
              status: EscrowStatus.HELD_IN_ESCROW,
              createdAt: new Date(),
              ...data.escrow.create,
            };
            dbEscrow.push(esc);
            order.escrow = esc;
          }
          dbOrders.push(order);
          return order;
        }),
        findUnique: jest.fn(async ({ where, include }) => {
          const ord = dbOrders.find((o) => o.id === where.id);
          if (!ord) return null;
          const result: any = { ...ord };
          if (include?.shop) {
            result.shop = dbShops.find((s) => s.id === ord.shopId);
          }
          if (include?.escrow) {
            result.escrow = dbEscrow.find((e) => e.orderId === ord.id);
          }
          return result;
        }),
        findMany: jest.fn(async ({ where, take }: any = {}) => {
          let list = dbOrders.filter((o) => {
            if (where?.shopId && o.shopId !== where.shopId) return false;
            if (where?.clientId && o.clientId !== where.clientId) return false;
            if (where?.status && o.status !== where.status) return false;
            return true;
          });

          if (take) {
            list = list.slice(0, take);
          }

          return list.map((o) => ({
            ...o,
            client: dbUsers.find((u) => u.id === o.clientId) || {
              fullName: 'Fatou Ndiaye',
              phone: '+221771110001',
            },
            items: [],
          }));
        }),
        update: jest.fn(async ({ where, data }) => {
          const ord = dbOrders.find((o) => o.id === where.id);
          if (ord) Object.assign(ord, data);
          return ord;
        }),
        updateMany: jest.fn(async ({ where, data }) => {
          let count = 0;
          for (const ord of dbOrders) {
            if (ord.id === where.id) {
              Object.assign(ord, data);
              count++;
            }
          }
          return { count };
        }),
        groupBy: jest.fn(async ({ where }: any = {}) => {
          const counts: Record<string, number> = {};
          for (const o of dbOrders) {
            if (where?.shopId && o.shopId !== where.shopId) continue;
            const key = o.status;
            counts[key] = (counts[key] || 0) + 1;
          }
          return Object.entries(counts).map(([status, count]) => ({
            status,
            _count: { id: count },
          }));
        }),
        aggregate: jest.fn(async ({ where }: any = {}) => {
          const list = dbOrders.filter((o) => {
            if (where?.shopId && o.shopId !== where.shopId) return false;
            if (where?.status && o.status !== where.status) return false;
            return true;
          });
          const sum = list.reduce((acc, o) => acc + (o.netVendorAmountFcfa || 0), 0);
          return {
            _sum: { netVendorAmountFcfa: sum },
          };
        }),
      },
      orderItem: {
        createMany: jest.fn(async ({ data }) => ({ count: data.length })),
        findMany: jest.fn(async () => []),
      },
      escrowTransaction: {
        create: jest.fn(async ({ data }) => {
          const esc = { id: `esc-${Date.now()}`, ...data };
          dbEscrow.push(esc);
          return esc;
        }),
        updateMany: jest.fn(async ({ where, data }) => {
          let count = 0;
          for (const e of dbEscrow) {
            if (e.orderId === where.orderId) {
              Object.assign(e, data);
              count++;
            }
          }
          return { count };
        }),
        findUnique: jest.fn(async ({ where }) => {
          return dbEscrow.find((e) => e.orderId === where.orderId || e.id === where.id) || null;
        }),
      },
      orderTracking: {
        create: jest.fn(async ({ data }) => {
          const trk = { id: `trk-${Date.now()}`, timestamp: new Date(), ...data };
          dbOrderTrackings.push(trk);
          return trk;
        }),
      },
      shopSponsor: {
        create: jest.fn(async ({ data }) => {
          const sp = { id: `sp-${Date.now()}-${Math.random()}`, createdAt: new Date(), ...data };
          dbShopSponsors.push(sp);
          return sp;
        }),
        findMany: jest.fn(async ({ where, orderBy }: any = {}) => {
          let list = dbShopSponsors.filter((s) => {
            if (where?.shopId && s.shopId !== where.shopId) return false;
            if (where?.isActive !== undefined && s.isActive !== where.isActive) return false;
            return true;
          });
          if (orderBy?.displayOrder === 'asc') {
            list = [...list].sort((a, b) => a.displayOrder - b.displayOrder);
          }
          return list;
        }),
        findUnique: jest.fn(async ({ where, include }: any = {}) => {
          const sp = dbShopSponsors.find((s) => s.id === where.id);
          if (!sp) return null;
          const result = { ...sp };
          if (include?.shop) {
            result.shop = dbShops.find((s) => s.id === sp.shopId) || null;
          }
          return result;
        }),
        count: jest.fn(async ({ where }: any = {}) => {
          let list = dbShopSponsors;
          if (where?.shopId) list = list.filter((s) => s.shopId === where.shopId);
          return list.length;
        }),
        update: jest.fn(async ({ where, data }) => {
          const sp = dbShopSponsors.find((s) => s.id === where.id);
          if (sp) Object.assign(sp, data);
          return sp;
        }),
        updateMany: jest.fn(async ({ where, data }) => {
          let count = 0;
          for (const sp of dbShopSponsors) {
            if (sp.shopId === where.shopId) {
              Object.assign(sp, data);
              count++;
            }
          }
          return { count };
        }),
        delete: jest.fn(async ({ where }) => {
          const idx = dbShopSponsors.findIndex((s) => s.id === where.id);
          if (idx !== -1) return dbShopSponsors.splice(idx, 1)[0];
          return null;
        }),
      },
      checkoutSession: {
        create: jest.fn(async ({ data }) => {
          const cs = { id: `cs-${Date.now()}`, createdAt: new Date(), ...data };
          return cs;
        }),
      },
      subscription: {
        create: jest.fn(async ({ data }) => {
          const sub = { id: `sub-${Date.now()}`, createdAt: new Date(), ...data };
          return sub;
        }),
      },
      mediaStream: {
        findFirst: jest.fn(async () => null),
        aggregate: jest.fn(async () => ({ _sum: { viewsCount: 0 } })),
      },
      priceNegotiation: {
        count: jest.fn(async () => 0),
      },
      productView: {
        aggregate: jest.fn(async () => ({ _sum: { count: 0 } })),
      },
      subscriptionBillingLog: {
        create: jest.fn(async ({ data }) => {
          const log = { id: `log-${Date.now()}`, createdAt: new Date(), ...data };
          dbBillingLogs.push(log);
          return log;
        }),
        findMany: jest.fn(async () => dbBillingLogs),
      },
      usedTrialRegistry: {
        create: jest.fn(async ({ data }) => {
          const reg = { id: `trial-${Date.now()}`, createdAt: new Date(), ...data };
          dbUsedTrials.push(reg);
          return reg;
        }),
        findFirst: jest.fn(async ({ where }) => {
          if (where?.OR) {
            for (const cond of where.OR) {
              const found = dbUsedTrials.find((t) => {
                if (cond.userId && t.userId === cond.userId) return true;
                if (cond.shopId && t.shopId === cond.shopId) return true;
                if (cond.phone && t.phone === cond.phone) return true;
                if (cond.waveNumber && t.waveNumber === cond.waveNumber) return true;
                if (cond.omNumber && t.omNumber === cond.omNumber) return true;
                if (cond.idCardNumber && t.idCardNumber === cond.idCardNumber) return true;
                return false;
              });
              if (found) return found;
            }
          }
          return null;
        }),
      },
      cart: {
        findUnique: jest.fn(async () => null),
        delete: jest.fn(async () => null),
      },
      cartItem: {
        findMany: jest.fn(async () => []),
        deleteMany: jest.fn(async () => ({ count: 0 })),
      },
      auditLog: {
        create: jest.fn(async ({ data }) => {
          const a = { id: `audit-${Date.now()}`, createdAt: new Date(), ...data };
          dbAuditLogs.push(a);
          return a;
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

    tokenClient = await jwtService.signAsync(
      { sub: clientId, phone: '+221771110001', role: Role.CLIENT },
      { secret },
    );
    tokenVendorFree = await jwtService.signAsync(
      { sub: vendorFreeId, phone: '+221772220002', role: Role.VENDOR },
      { secret },
    );
    tokenVendorPro = await jwtService.signAsync(
      { sub: vendorProId, phone: '+221773330003', role: Role.VENDOR },
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
  // SCÉNARIO 1 : Vérification des Slugs Réservés & Wildcard CORS
  // ============================================================================
  describe('SCÉNARIO 1 : Vérification des Slugs Réservés & Wildcard CORS', () => {
    it('1.1 Bloque les slugs réservés du système OpenBoutik (admin, checkout, login, etc.)', async () => {
      const resAdmin = await request(app.getHttpServer()).get('/api/v1/shops/check-slug/admin');
      expect(resAdmin.status).toBe(200);
      expect(resAdmin.body.data.available).toBe(false);
      expect(resAdmin.body.data.reason).toBe('RESERVED_SYSTEM_SLUG');

      const resCheckout = await request(app.getHttpServer()).get('/api/v1/shops/check-slug/checkout');
      expect(resCheckout.status).toBe(200);
      expect(resCheckout.body.data.available).toBe(false);

      const resBilling = await request(app.getHttpServer()).get('/api/v1/shops/check-slug/billing');
      expect(resBilling.status).toBe(200);
      expect(resBilling.body.data.available).toBe(false);
    });

    it('1.2 Valide les slugs marchands légitimes et disponibles', async () => {
      const resCustom = await request(app.getHttpServer()).get('/api/v1/shops/check-slug/touba-couture-vip');
      expect(resCustom.status).toBe(200);
      expect(resCustom.body.data.available).toBe(true);
      expect(resCustom.body.data.slug).toBe('touba-couture-vip');
    });

    it('1.3 Accepte les requêtes avec sous-domaines via les headers CORS', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/subscriptions/plans')
        .set('Origin', 'https://dakar-chic.openboutik.sn');

      expect(res.status).toBe(200);
      expect(res.body.data.length).toBeGreaterThanOrEqual(3);
    });
  });

  // ============================================================================
  // SCÉNARIO 2 : Forfait GRATUIT (FREE) — Isolation Marketplace & Pas de Sous-domaine
  // ============================================================================
  describe('SCÉNARIO 2 : Forfait GRATUIT (FREE) — Isolation Marketplace & 3 % de commission', () => {
    it('2.1 Rejette l’activation d’un sous-domaine par un marchand FREE (403 Forbidden)', async () => {
      const res = await request(app.getHttpServer())
        .patch('/api/v1/shops/me/customization')
        .set('Authorization', `Bearer ${tokenVendorFree}`)
        .send({
          subdomain: 'boutique-starter',
          subdomainEnabled: true,
        });

      expect(res.status).toBe(403);
      expect(res.body.message).toContain('réservé aux forfaits PRO et PREMIUM');
    });

    it('2.2 L’accès à la vitrine d’une boutique sans sous-domaine renvoie une indication de redirection', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/shops/storefront/boutique-starter-dakar');

      expect(res.status).toBe(200);
      expect(res.body.data.redirectToMarketplace).toBe(true);
      expect(res.body.data.marketplaceUrl).toContain('/boutique/boutique-starter-dakar');
    });

    it('2.3 Commande sur shop FREE : 3 % de commission vendeur + 1 % de frais de protection acheteur', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/orders/checkout')
        .set('Authorization', `Bearer ${tokenClient}`)
        .send({
          items: [{ productId: productFreeId, quantity: 1 }],
          deliveryAddress: 'Plateau Dakar, Immeuble Fahd',
          deliveryCity: 'Dakar',
          deliveryPhone: '+221771110001',
          deliveryMethod: DeliveryMethod.TIAK_TIAK,
          paymentProvider: PaymentProvider.WAVE,
        });

      expect(res.status).toBe(201);
      const orders = res.body.data.orders;
      expect(orders.length).toBe(1);
      const order = orders[0];
      expect(order.subtotalFcfa).toBe(10000);
      expect(order.buyerProtectionFeeFcfa).toBe(100); // 1 %
      expect(order.commissionRate).toBe(3.0);
      expect(order.commissionAmountFcfa).toBe(300); // 3 %
      expect(order.netVendorAmountFcfa).toBe(9700);
      expect(order.salesChannel).toBe(SalesChannel.MARKETPLACE);
    });
  });

  // ============================================================================
  // SCÉNARIO 3 : Essai Gratuit 30 Jours & Registre Anti-Abus (UsedTrialRegistry)
  // ============================================================================
  describe('SCÉNARIO 3 : Mois d’Essai Gratuit 30 Jours & Anti-Abus', () => {
    it('3.1 Le marchand FREE active son mois d’essai gratuit PRO (30 jours)', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/subscriptions/start-trial')
        .set('Authorization', `Bearer ${tokenVendorFree}`)
        .send({ plan: SubscriptionPlan.PRO });

      expect(res.status).toBe(200);
      expect(res.body.data.subscriptionPlan).toBe(SubscriptionPlan.PRO);
      expect(res.body.data.subscriptionStatus).toBe(SubscriptionStatus.TRIALING);
      expect(res.body.data.subdomainEnabled).toBe(true);
      expect(res.body.data.trialEndsAt).toBeDefined();

      // Vérifie l'empreinte dans dbUsedTrials
      expect(dbUsedTrials.length).toBe(1);
      expect(dbUsedTrials[0].userId).toBe(vendorFreeId);
    });

    it('3.2 Rejette une deuxième tentative d’essai gratuit pour le même marchand (403 Forbidden)', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/subscriptions/start-trial')
        .set('Authorization', `Bearer ${tokenVendorFree}`)
        .send({ plan: SubscriptionPlan.PREMIUM });

      expect(res.status).toBe(403);
      expect(res.body.message).toContain('déjà bénéficié de votre mois d’essai gratuit');
    });
  });

  // ============================================================================
  // SCÉNARIO 4 : Privilège 0 % de Commission & Économies Cumulées
  // ============================================================================
  describe('SCÉNARIO 4 : Privilège 0 % Commission PRO & Cumul des Économies', () => {
    let orderProId: string;
    let otpCode: string;

    it('4.1 Commande sur shop PRO : 0 % de commission, 1 % de protection acheteur', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/orders/checkout')
        .set('Authorization', `Bearer ${tokenClient}`)
        .send({
          items: [{ productId: productPro1Id, quantity: 1 }],
          deliveryAddress: 'Almadies, Dakar',
          deliveryCity: 'Dakar',
          deliveryPhone: '+221771110001',
          deliveryMethod: DeliveryMethod.TIAK_TIAK,
          paymentProvider: PaymentProvider.WAVE,
        });

      expect(res.status).toBe(201);
      const order = res.body.data.orders[0];
      orderProId = order.id;
      otpCode = order.deliveryConfirmationCode;

      expect(order.subtotalFcfa).toBe(50000);
      expect(order.buyerProtectionFeeFcfa).toBe(500); // 1 %
      expect(order.commissionRate).toBe(0.0); // Privilège 0 %
      expect(order.commissionAmountFcfa).toBe(0);
      expect(order.netVendorAmountFcfa).toBe(50000);
    });

    it('4.2 Confirmation de livraison OTP : Déblocage séquestre et cumul des 3 % d’économies', async () => {
      const shopBefore = dbShops.find((s) => s.id === shopProId);
      const initialSavings = shopBefore.totalCommissionSavedFcfa;

      const res = await request(app.getHttpServer())
        .post(`/api/v1/orders/${orderProId}/confirm-delivery`)
        .set('Authorization', `Bearer ${tokenClient}`)
        .send({ confirmationCode: otpCode });

      expect(res.status).toBe(200);

      // Économie de 3 % sur 50 000 FCFA = 1 500 FCFA cumulés
      const shopAfter = dbShops.find((s) => s.id === shopProId);
      expect(shopAfter.totalCommissionSavedFcfa).toBe(initialSavings + 1500);
    });
  });

  // ============================================================================
  // SCÉNARIO 5 : Store Builder, Réorganisation Produits & Sponsors CRUD
  // ============================================================================
  describe('SCÉNARIO 5 : Store Builder, Réorganisation Grille & Sponsors CRUD', () => {
    let sponsorId: string;

    it('5.1 Mise à jour de la personnalisation visuelle (Thème, Annonce, Favicon)', async () => {
      const res = await request(app.getHttpServer())
        .patch('/api/v1/shops/me/customization')
        .set('Authorization', `Bearer ${tokenVendorPro}`)
        .send({
          primaryColor: '#10B981',
          secondaryColor: '#1E293B',
          announcementBarText: 'Livraison express gratuite à Dakar ce week-end !',
        });

      expect(res.status).toBe(200);
      expect(res.body.data.themeConfig.primaryColor).toBe('#10B981');
      expect(res.body.data.announcementBarText).toContain('Livraison express');
    });

    it('5.2 Réorganisation de la grille de produits (displayOrder et isFeatured)', async () => {
      const res = await request(app.getHttpServer())
        .patch('/api/v1/products/me/layout')
        .set('Authorization', `Bearer ${tokenVendorPro}`)
        .send({
          items: [
            { productId: productPro2Id, displayOrder: 1, isFeatured: true },
            { productId: productPro1Id, displayOrder: 2, isFeatured: false },
          ],
        });

      expect(res.status).toBe(200);
      expect(res.body.data.updatedCount).toBe(2);

      const p2 = dbProducts.find((p) => p.id === productPro2Id);
      expect(p2.displayOrder).toBe(1);
      expect(p2.isFeatured).toBe(true);
    });

    it('5.3 Ajout d’un sponsor par le vendeur PRO', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/shops/me/sponsors')
        .set('Authorization', `Bearer ${tokenVendorPro}`)
        .send({
          name: 'Wave Sénégal',
          logoUrl: 'https://cdn.openboutik.sn/sponsors/wave.png',
          websiteUrl: 'https://wave.com',
          displayOrder: 1,
        });

      expect(res.status).toBe(201);
      expect(res.body.data.name).toBe('Wave Sénégal');
      sponsorId = res.body.data.id;
    });

    it('5.4 BOLA : Un autre vendeur ne peut pas modifier ni supprimer ce sponsor', async () => {
      const res = await request(app.getHttpServer())
        .patch(`/api/v1/shops/me/sponsors/${sponsorId}`)
        .set('Authorization', `Bearer ${tokenVendorFree}`)
        .send({ name: 'Hacker Sponsor' });

      expect(res.status).toBe(403);
    });

    it('5.5 Consultation de la vitrine publique du sous-domaine (Storefront)', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/shops/storefront/dakar-chic');

      expect(res.status).toBe(200);
      expect(res.body.data.shop.slug).toBe('dakar-chic');
      expect(res.body.data.themeConfig.primaryColor).toBe('#10B981');
      expect(res.body.data.sponsors.length).toBeGreaterThanOrEqual(1);
      expect(res.body.data.products[0].id).toBe(productPro2Id); // Vérifie le tri par displayOrder
    });
  });

  // ============================================================================
  // SCÉNARIO 6 : Cycle de Facturation Récurrent sur Portefeuille Marchand
  // ============================================================================
  describe('SCÉNARIO 6 : Cycle de Facturation Récurrent sur Portefeuille Marchand', () => {
    it('6.1 Prélèvement automatique de 5 000 FCFA avec solde suffisant', async () => {
      const walletBefore = dbWallets.find((w) => w.shopId === shopProId);
      const balanceBefore = walletBefore.availableBalanceFcfa;

      // Faire expirer la période pour forcer le prélèvement
      const shop = dbShops.find((s) => s.id === shopProId);
      shop.currentPeriodEnd = new Date(Date.now() - 1000);

      const res = await request(app.getHttpServer())
        .post('/api/v1/subscriptions/run-billing-cycle')
        .set('Authorization', `Bearer ${tokenSuperAdmin}`);

      expect(res.status).toBe(200);
      expect(res.body.data.successCount).toBeGreaterThanOrEqual(1);

      const walletAfter = dbWallets.find((w) => w.shopId === shopProId);
      expect(walletAfter.availableBalanceFcfa).toBe(balanceBefore - 5000);

      expect(shop.subscriptionStatus).toBe(SubscriptionStatus.ACTIVE);
      expect(shop.billingRetryCount).toBe(0);

      // Journal de facturation SUCCESS
      const successLog = dbBillingLogs.find(
        (l) => l.shopId === shopProId && l.status === BillingAttemptStatus.SUCCESS,
      );
      expect(successLog).toBeDefined();
    });
  });

  // ============================================================================
  // SCÉNARIO 7 : Moteur Dunning (Solde Insuffisant & Période de Grâce 72h)
  // ============================================================================
  describe('SCÉNARIO 7 : Moteur Dunning — Échecs & Maintien des Privilèges en Grâce', () => {
    it('7.1 Échec #1 : Solde à 0 FCFA -> Passage en PAST_DUE avec 72h de grâce et privilèges préservés', async () => {
      const wallet = dbWallets.find((w) => w.shopId === shopProId);
      wallet.availableBalanceFcfa = 0; // Solde épuisé

      const shop = dbShops.find((s) => s.id === shopProId);
      shop.currentPeriodEnd = new Date(Date.now() - 1000);

      const res = await request(app.getHttpServer())
        .post('/api/v1/subscriptions/run-billing-cycle')
        .set('Authorization', `Bearer ${tokenSuperAdmin}`);

      expect(res.status).toBe(200);

      expect(shop.subscriptionStatus).toBe(SubscriptionStatus.PAST_DUE);
      expect(shop.billingRetryCount).toBe(1);
      expect(shop.gracePeriodEndsAt).toBeDefined();

      // Privilèges intacts !
      expect(shop.subdomainEnabled).toBe(true);
      expect(shop.commissionRate).toBe(0.0);
    });

    it('7.2 Échecs consécutifs #2, #3, #4, #5 : Incrémentation du compteur et maintien de PAST_DUE', async () => {
      const shop = dbShops.find((s) => s.id === shopProId);

      for (let i = 2; i <= 5; i++) {
        shop.nextBillingRetryAt = new Date(Date.now() - 1000);
        await request(app.getHttpServer())
          .post('/api/v1/subscriptions/run-billing-cycle')
          .set('Authorization', `Bearer ${tokenSuperAdmin}`);

        expect(shop.billingRetryCount).toBe(i);
        expect(shop.subscriptionStatus).toBe(SubscriptionStatus.PAST_DUE);
        expect(shop.subdomainEnabled).toBe(true);
      }
    });
  });

  // ============================================================================
  // SCÉNARIO 8 : Rattrapage Automatique (Auto-Sweep sur Livraison de Commande)
  // ============================================================================
  describe('SCÉNARIO 8 : Rattrapage Automatique (Auto-Sweep sur Livraison)', () => {
    let sweepOrderId: string;
    let sweepOtp: string;

    it('8.1 Livraison d’une commande débloquant des fonds suffisants déclenche l’Auto-Sweep', async () => {
      const shop = dbShops.find((s) => s.id === shopProId);
      expect(shop.subscriptionStatus).toBe(SubscriptionStatus.PAST_DUE);

      // Client passe commande de 25 000 FCFA sur ce shop
      const checkoutRes = await request(app.getHttpServer())
        .post('/api/v1/orders/checkout')
        .set('Authorization', `Bearer ${tokenClient}`)
        .send({
          items: [{ productId: productPro2Id, quantity: 1 }],
          deliveryAddress: 'Point E, Dakar',
          deliveryCity: 'Dakar',
          deliveryPhone: '+221771110001',
          paymentProvider: PaymentProvider.WAVE,
        });

      expect(checkoutRes.status).toBe(201);
      const order = checkoutRes.body.data.orders[0];
      sweepOrderId = order.id;
      sweepOtp = order.deliveryConfirmationCode;

      // Le client confirme la réception
      const confirmRes = await request(app.getHttpServer())
        .post(`/api/v1/orders/${sweepOrderId}/confirm-delivery`)
        .set('Authorization', `Bearer ${tokenClient}`)
        .send({ confirmationCode: sweepOtp });

      expect(confirmRes.status).toBe(200);

      // Auto-Sweep a été exécuté : 25 000 FCFA encaissés - 5 000 FCFA d'arriéré = 20 000 FCFA restants
      const wallet = dbWallets.find((w) => w.shopId === shopProId);
      expect(wallet.availableBalanceFcfa).toBe(20000);

      // Statut restauré en ACTIVE avec compteur à 0
      expect(shop.subscriptionStatus).toBe(SubscriptionStatus.ACTIVE);
      expect(shop.billingRetryCount).toBe(0);
      expect(shop.gracePeriodEndsAt).toBeNull();
    });
  });

  // ============================================================================
  // SCÉNARIO 9 : 6ème Échec Dunning — Rétrogradation Totale & Réactivation Manuelle
  // ============================================================================
  describe('SCÉNARIO 9 : 6ème Échec Dunning — Rétrogradation & Réactivation Manuelle', () => {
    it('9.1 Au 6ème échec, la boutique est rétrogradée sur le plan FREE et le sous-domaine est désactivé', async () => {
      const shop = dbShops.find((s) => s.id === shopProId);
      const wallet = dbWallets.find((w) => w.shopId === shopProId);

      // Préparation : solde 0 FCFA, 5 échecs passés
      wallet.availableBalanceFcfa = 0;
      shop.subscriptionStatus = SubscriptionStatus.PAST_DUE;
      shop.billingRetryCount = 5;
      shop.nextBillingRetryAt = new Date(Date.now() - 1000);
      shop.currentPeriodEnd = new Date(Date.now() - 1000);

      const res = await request(app.getHttpServer())
        .post('/api/v1/subscriptions/run-billing-cycle')
        .set('Authorization', `Bearer ${tokenSuperAdmin}`);

      expect(res.status).toBe(200);

      // Rétrogradation confirmée
      expect(shop.subscriptionStatus).toBe(SubscriptionStatus.CANCELED_DOWNGRADED);
      expect(shop.subscriptionPlan).toBe(SubscriptionPlan.FREE);
      expect(shop.subdomainEnabled).toBe(false);
      expect(shop.commissionRate).toBe(3.0);

      // Le storefront renvoie maintenant redirectToMarketplace
      const sfRes = await request(app.getHttpServer()).get('/api/v1/shops/storefront/dakar-chic');
      expect(sfRes.status).toBe(200);
      expect(sfRes.body.data.redirectToMarketplace).toBe(true);
    });

    it('9.2 Le marchand recharge son portefeuille via Wave (Top-Up)', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/wallets/me/topup')
        .set('Authorization', `Bearer ${tokenVendorPro}`)
        .send({
          amountFcfa: 10000,
          provider: PaymentProvider.WAVE,
          phone: '+221773330003',
        });

      expect(res.status).toBe(201);
      expect(res.body.data.newAvailableBalanceFcfa).toBe(10000);
    });

    it('9.3 Le marchand réactive manuellement son abonnement PRO', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/subscriptions/reactivate')
        .set('Authorization', `Bearer ${tokenVendorPro}`)
        .send({ plan: SubscriptionPlan.PRO });

      expect(res.status).toBe(200);
      expect(res.body.data.subscriptionPlan).toBe(SubscriptionPlan.PRO);
      expect(res.body.data.subscriptionStatus).toBe(SubscriptionStatus.ACTIVE);
      expect(res.body.data.subdomainEnabled).toBe(true);

      const wallet = dbWallets.find((w) => w.shopId === shopProId);
      expect(wallet.availableBalanceFcfa).toBe(5000); // 10 000 - 5 000
    });
  });

  // ============================================================================
  // SCÉNARIO 10 : Tableau de Bord Vendeur 360° & Non-Régression
  // ============================================================================
  describe('SCÉNARIO 10 : Tableau de Bord Vendeur 360° & Non-Régression Globale', () => {
    it('10.1 Récupère la charge utile 360° complète avec tous ses sous-blocs', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/shops/me/dashboard-360')
        .set('Authorization', `Bearer ${tokenVendorPro}`);

      expect(res.status).toBe(200);
      const data = res.body.data;

      // 1. Bloc SaaS & Dunning
      expect(data.saas).toBeDefined();
      expect(data.saas.plan).toBe(SubscriptionPlan.PRO);
      expect(data.saas.status).toBe(SubscriptionStatus.ACTIVE);
      expect(data.saas.subdomain).toBe('dakar-chic');
      expect(data.saas.subdomainEnabled).toBe(true);

      // 2. Bloc Financier & Économies
      expect(data.financial).toBeDefined();
      expect(data.financial.availableBalanceFcfa).toBeDefined();
      expect(data.financial.totalCommissionSavedFcfa).toBeGreaterThanOrEqual(13500);

      // 3. Canaux de vente
      expect(data.salesChannels).toBeDefined();
      expect(data.salesChannels.totalOrders).toBeDefined();

      // 4. Santé des stocks
      expect(data.stockHealth).toBeDefined();
      expect(data.stockHealth.totalProducts).toBeGreaterThanOrEqual(2);

      // 5. Top produits et commandes
      expect(data.topProducts).toBeDefined();
      expect(data.recentOrders).toBeDefined();
    });

    it('10.2 Non-régression : Les plans tarifaires publics restent accessibles', async () => {
      const res = await request(app.getHttpServer()).get('/api/v1/subscriptions/plans');
      expect(res.status).toBe(200);
      const plans = res.body.data;
      expect(plans.length).toBe(3);
      expect(plans.find((p: any) => p.plan === 'FREE')).toBeDefined();
      expect(plans.find((p: any) => p.plan === 'PRO')).toBeDefined();
      expect(plans.find((p: any) => p.plan === 'PREMIUM')).toBeDefined();
    });
  });
});
