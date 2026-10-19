import 'dotenv/config';
import * as bcrypt from 'bcryptjs';
import {
  PrismaClient,
  Role,
  SubscriptionPlan,
  OrderStatus,
  EscrowStatus,
  PaymentProvider,
  DeliveryMethod,
  CouponType,
  NegotiationStatus,
  StreamType,
  StreamStatus,
  InstallmentPlanStatus,
  InstallmentPaymentStatus,
} from '../src/generated/prisma/client';
import { PrismaMariaDb } from '@prisma/adapter-mariadb';

const connectionString =
  process.env.DATABASE_URL || 'mysql://root:@localhost:3306/openboutik_db';
const adapter = new PrismaMariaDb(connectionString);
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log('🌱 Démarrage du Seed réaliste OpenBoutik Sénégal (Roadmap V2 Espace Vendeur)...');

  // Nettoyage préalable ordonné respectant l'intégrité référentielle
  await prisma.installmentPayment.deleteMany();
  await prisma.installmentPlan.deleteMany();
  await prisma.streamProduct.deleteMany();
  await prisma.mediaStream.deleteMany();
  await prisma.priceNegotiation.deleteMany();
  await prisma.paymentTransaction.deleteMany();
  await prisma.orderTracking.deleteMany();
  await prisma.message.deleteMany();
  await prisma.wishlist.deleteMany();
  await prisma.auditLog.deleteMany();
  await prisma.dispute.deleteMany();
  await prisma.escrowTransaction.deleteMany();
  await prisma.orderNote.deleteMany();
  await prisma.orderItem.deleteMany();
  await prisma.order.deleteMany();
  await prisma.checkoutSession.deleteMany();
  await prisma.review.deleteMany();
  await prisma.productView.deleteMany();
  await prisma.productVariant.deleteMany();
  await prisma.coupon.deleteMany();
  await prisma.product.deleteMany();
  await prisma.category.deleteMany();
  await prisma.walletPayout.deleteMany();
  await prisma.vendorWallet.deleteMany();
  await prisma.subscription.deleteMany();
  await prisma.shop.deleteMany();
  await prisma.user.deleteMany();

  const salt = await bcrypt.genSalt(10);
  const defaultPasswordHash = await bcrypt.hash('Passer123!', salt);
  const adminPasswordHash = await bcrypt.hash('Admin@OpenBoutik2026!', salt);

  // 1. Super-Admin (Pôle Équipe Dev & Opérations OpenBoutik)
  const superAdmin = await prisma.user.create({
    data: {
      email: 'admin@openboutik.sn',
      phone: '+221770000001',
      fullName: 'Direction Super-Admin OpenBoutik',
      passwordHash: adminPasswordHash,
      role: Role.SUPER_ADMIN,
      acceptedTermsAt: new Date(),
    },
  });
  console.log(`✅ Super-Admin créé : ${superAdmin.email} (${superAdmin.phone})`);

  // 2. Vendeur 1 : Moussa Diop (Boutique Teranga Mode - Médina, Dakar)
  const vendor1 = await prisma.user.create({
    data: {
      email: 'moussa.diop@terangamode.sn',
      phone: '+221771234567',
      fullName: 'Moussa Diop',
      passwordHash: defaultPasswordHash,
      role: Role.VENDOR,
      acceptedTermsAt: new Date(),
    },
  });

  const shop1 = await prisma.shop.create({
    data: {
      ownerId: vendor1.id,
      name: 'Teranga Mode',
      slug: 'teranga-mode',
      description:
        'Couture haut de gamme, boubous traditionnels en bazin riche et prêt-à-porter sénégalais.',
      mainCategory: 'Mode & Prêt-à-porter',
      logoUrl:
        'https://images.unsplash.com/photo-1544441893-675973e31985?w=400',
      bannerUrl:
        'https://images.unsplash.com/photo-1489987707025-afc232f7ea0f?w=1200',
      primaryColor: '#059669',
      whatsappNumber: '+221771234567',
      waveNumber: '+221771234567',
      omNumber: '+221771234567',
      payoutHolderName: 'Moussa Diop',
      onboardingStep: 5,
      onboardingCompleted: true,
      kycStatus: 'VERIFIED',
      idCardNumber: '1 758 1990 01234',
      idCardUrl: 'https://storage.openboutik.sn/kyc/cni-moussa-diop.jpg',
      kycSubmittedAt: new Date(),
      kycVerifiedAt: new Date(),
      address: 'Rue 11 angle Blaise Diagne, Médina',
      city: 'Dakar',
      isVerified: true,
      isOnVacation: false,
      subscriptionPlan: SubscriptionPlan.PRO,
      wallet: {
        create: {
          escrowBalanceFcfa: 37000,
          availableBalanceFcfa: 185000,
          totalEarnedFcfa: 450000,
        },
      },
      subscriptions: {
        create: {
          plan: SubscriptionPlan.PRO,
          priceFcfa: 15000,
          startDate: new Date(),
          endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
          paymentProvider: PaymentProvider.WAVE,
          providerReference: 'WAVE_SUB_PRO_20261001',
        },
      },
    },
  });

  // Catégories boutique Teranga Mode
  const catModeHomme = await prisma.category.create({
    data: {
      shopId: shop1.id,
      name: 'Mode Homme',
      slug: 'mode-homme',
      imageUrl:
        'https://images.unsplash.com/photo-1507679799987-c73779587ccf?w=400',
    },
  });

  const catModeFemme = await prisma.category.create({
    data: {
      shopId: shop1.id,
      name: 'Mode Femme',
      slug: 'mode-femme',
      imageUrl:
        'https://images.unsplash.com/photo-1581044777550-4cfa60707c03?w=400',
    },
  });

  // Produit 1 avec Variantes & Seuil de stock critique
  const prod1 = await prisma.product.create({
    data: {
      shopId: shop1.id,
      categoryId: catModeHomme.id,
      name: 'Boubou Bazin Riche Brodé 3 Pièces',
      slug: 'boubou-bazin-riche-brode',
      description:
        'Bazin allemand Getzner teint à la main et brodé au fil de soie par nos maîtres artisans de la Médina.',
      priceFcfa: 35000,
      compareAtPriceFcfa: 40000,
      stock: 15,
      lowStockThreshold: 5,
      images: [
        'https://images.unsplash.com/photo-1523381210434-271e8be1f52b?w=600',
      ],
      isPublished: true,
      variants: {
        create: [
          {
            sku: 'BOUBOU-BN-XL',
            priceFcfa: 35000,
            compareAtPriceFcfa: 40000,
            stock: 6,
            attributes: { taille: 'XL', couleur: 'Bleu Nuit' },
            isActive: true,
          },
          {
            sku: 'BOUBOU-BN-L',
            priceFcfa: 35000,
            compareAtPriceFcfa: 40000,
            stock: 5,
            attributes: { taille: 'L', couleur: 'Bleu Nuit' },
            isActive: true,
          },
          {
            sku: 'BOUBOU-BC-XL',
            priceFcfa: 38000,
            compareAtPriceFcfa: 42000,
            stock: 4,
            attributes: { taille: 'XL', couleur: 'Blanc Cassé' },
            isActive: true,
          },
        ],
      },
    },
  });

  // Produit 2 en alerte stock faible
  await prisma.product.create({
    data: {
      shopId: shop1.id,
      categoryId: catModeFemme.id,
      name: 'Robe Wax Moderne Thioup',
      slug: 'robe-wax-moderne-thioup',
      description:
        'Robe ajustée en véritable pagne wax hollandais avec empiècements contemporains.',
      priceFcfa: 18000,
      compareAtPriceFcfa: 22000,
      stock: 2, // Inférieur au seuil -> alerte déclenchée
      lowStockThreshold: 5,
      images: [
        'https://images.unsplash.com/photo-1572804013309-59a88b7e92f1?w=600',
      ],
      isPublished: true,
    },
  });

  // Codes Promotionnels Teranga Mode
  const futureExpiry = new Date(Date.now() + 60 * 24 * 60 * 60 * 1000);
  await prisma.coupon.create({
    data: {
      shopId: shop1.id,
      code: 'TABASKI20',
      type: CouponType.PERCENTAGE,
      value: 20,
      expiryDate: futureExpiry,
      maxUses: 50,
      usedCount: 1,
      isActive: true,
    },
  });

  await prisma.coupon.create({
    data: {
      shopId: shop1.id,
      code: 'KORITE5K',
      type: CouponType.FIXED_FCFA,
      value: 5000,
      expiryDate: futureExpiry,
      maxUses: 100,
      usedCount: 0,
      isActive: true,
    },
  });

  // 3. Vendeur 2 : Aminata Sow (Boutique Dakar Tech Hub - Plateau, Dakar)
  const vendor2 = await prisma.user.create({
    data: {
      email: 'aminata.sow@dakartech.sn',
      phone: '+221789876543',
      fullName: 'Aminata Sow',
      passwordHash: defaultPasswordHash,
      role: Role.VENDOR,
      acceptedTermsAt: new Date(),
    },
  });

  const shop2 = await prisma.shop.create({
    data: {
      ownerId: vendor2.id,
      name: 'Dakar Tech Hub',
      slug: 'dakar-tech-hub',
      description:
        'Accessoires smartphones originaux, écouteurs Bluetooth et solutions de recharge rapide.',
      mainCategory: 'Électronique & High-Tech',
      logoUrl:
        'https://images.unsplash.com/photo-1550009158-9ebf69173e03?w=400',
      bannerUrl:
        'https://images.unsplash.com/photo-1519389950473-47ba0277781c?w=1200',
      primaryColor: '#2563EB',
      whatsappNumber: '+221789876543',
      waveNumber: '+221789876543',
      omNumber: '+221789876543',
      payoutHolderName: 'Aminata Sow',
      onboardingStep: 5,
      onboardingCompleted: true,
      kycStatus: 'VERIFIED',
      idCardNumber: '2 850 1995 05678',
      idCardUrl: 'https://storage.openboutik.sn/kyc/cni-aminata-sow.jpg',
      kycSubmittedAt: new Date(),
      kycVerifiedAt: new Date(),
      address: 'Avenue William Ponty, Plateau',
      city: 'Dakar',
      isVerified: true,
      isOnVacation: false,
      subscriptionPlan: SubscriptionPlan.FREE,
      wallet: {
        create: {
          escrowBalanceFcfa: 0,
          availableBalanceFcfa: 95000,
          totalEarnedFcfa: 160000,
        },
      },
    },
  });

  const catAudio = await prisma.category.create({
    data: {
      shopId: shop2.id,
      name: 'Audio & Écouteurs',
      slug: 'audio-ecouteurs',
      imageUrl:
        'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=400',
    },
  });

  await prisma.product.create({
    data: {
      shopId: shop2.id,
      categoryId: catAudio.id,
      name: 'Écouteurs TWS Sans Fil Réduction de Bruit',
      slug: 'ecouteurs-tws-sans-fil',
      description:
        'Autonomie 36h, Bluetooth 5.3, résistance aux éclaboussures et micro HD.',
      priceFcfa: 15000,
      compareAtPriceFcfa: 18000,
      stock: 30,
      lowStockThreshold: 5,
      images: [
        'https://images.unsplash.com/photo-1590658268037-6bf12165a8df?w=600',
      ],
      isPublished: true,
    },
  });

  // 4. Clients Acheteurs
  const client1 = await prisma.user.create({
    data: {
      email: 'client.fatou@gmail.com',
      phone: '+221765432109',
      fullName: 'Fatou Ndiaye',
      passwordHash: defaultPasswordHash,
      role: Role.CLIENT,
      acceptedTermsAt: new Date(),
      kycStatus: 'VERIFIED',
      idCardNumber: '1 759 1995 04567',
      idCardUrl: 'https://storage.openboutik.sn/kyc/cni-fatou-ndiaye.jpg',
      kycSubmittedAt: new Date(),
      kycVerifiedAt: new Date(),
    },
  });
  console.log(`✅ Client 1 créé : ${client1.email} (${client1.phone})`);

  // 5. Commande 1 : En Séquestre Actif (PAID_ESCROW) avec Mémo Interne Vendeur
  const checkoutSession = await prisma.checkoutSession.create({
    data: {
      clientId: client1.id,
      totalAmountFcfa: 37000,
      paymentProvider: PaymentProvider.WAVE,
      providerReference: 'WAVE_SN_CHECKOUT_20261014_9999',
      isPaid: true,
      paidAt: new Date(),
    },
  });

  const testOrder = await prisma.order.create({
    data: {
      orderNumber: 'OB-2026-0001',
      checkoutSessionId: checkoutSession.id,
      clientId: client1.id,
      shopId: shop1.id,
      subtotalFcfa: 35000,
      deliveryFeeFcfa: 2000,
      totalAmountFcfa: 37000,
      commissionRate: 3, // Plan PRO (3%)
      commissionAmountFcfa: 1050, // 3% de 35 000 FCFA
      netVendorAmountFcfa: 33950, // 35 000 - 1 050 FCFA
      deliveryMethod: DeliveryMethod.TIAK_TIAK,
      deliveryAddress: 'Villa 142, Mermoz Pyrotechnie',
      deliveryCity: 'Dakar',
      deliveryPhone: '+221765432109',
      deliveryNotes: 'Appeler à l’arrivée, portail vert.',
      deliveryConfirmationCode: '482910', // Code OTP 6 chiffres
      status: OrderStatus.PAID_ESCROW,
      items: {
        create: [
          {
            productId: prod1.id,
            productName: prod1.name,
            unitPriceFcfa: 35000,
            quantity: 1,
            totalPriceFcfa: 35000,
          },
        ],
      },
      escrow: {
        create: {
          totalAmountFcfa: 37000,
          commissionAmountFcfa: 1050,
          netVendorAmountFcfa: 33950,
          paymentProvider: PaymentProvider.WAVE,
          providerReference: 'WAVE_SN_TXN_20261014_001',
          status: EscrowStatus.HELD_IN_ESCROW,
          heldAt: new Date(),
        },
      },
      notes: {
        create: [
          {
            text: 'Cliente régulière de Mermoz, livreur Tiak-Tiak Moussa prévenu pour le portail vert.',
          },
        ],
      },
    },
  });

  // 6. Commande 2 : Livrée et Confirmée (DELIVERED_CONFIRMED) pour Avis Client
  const deliveredOrder = await prisma.order.create({
    data: {
      orderNumber: 'OB-2026-0002',
      clientId: client1.id,
      shopId: shop1.id,
      subtotalFcfa: 35000,
      deliveryFeeFcfa: 2000,
      totalAmountFcfa: 37000,
      commissionRate: 3,
      commissionAmountFcfa: 1050,
      netVendorAmountFcfa: 33950,
      deliveryMethod: DeliveryMethod.TIAK_TIAK,
      deliveryAddress: 'Villa 142, Mermoz Pyrotechnie',
      deliveryCity: 'Dakar',
      deliveryPhone: '+221765432109',
      deliveryConfirmationCode: '918273',
      status: OrderStatus.DELIVERED_CONFIRMED,
      deliveredAt: new Date(),
      items: {
        create: [
          {
            productId: prod1.id,
            productName: prod1.name,
            unitPriceFcfa: 35000,
            quantity: 1,
            totalPriceFcfa: 35000,
          },
        ],
      },
      escrow: {
        create: {
          totalAmountFcfa: 37000,
          commissionAmountFcfa: 1050,
          netVendorAmountFcfa: 33950,
          paymentProvider: PaymentProvider.WAVE,
          providerReference: 'WAVE_SN_TXN_20261014_002',
          status: EscrowStatus.RELEASED_TO_VENDOR,
          heldAt: new Date(Date.now() - 86400000 * 2),
          releasedAt: new Date(),
        },
      },
    },
  });

  // Avis Client 5 Étoiles avec Réponse Vendeur Officielle
  await prisma.review.create({
    data: {
      productId: prod1.id,
      userId: client1.id,
      orderId: deliveredOrder.id,
      rating: 5,
      comment:
        'Le tissu Bazin Getzner est d’une qualité somptueuse ! La coupe est parfaite et la livraison Tiak-Tiak à Mermoz a été très rapide.',
      isApproved: true,
      vendorReply:
        'Jërëjëf Fatou pour votre confiance et fidélité chez Teranga Mode ! À très bientôt pour la Tabaski.',
      repliedAt: new Date(),
    },
  });

  // Tracking de visites (ProductViews) sur prod1
  const todayUtc = new Date();
  todayUtc.setUTCHours(0, 0, 0, 0);

  const yesterdayUtc = new Date(Date.now() - 86400000);
  yesterdayUtc.setUTCHours(0, 0, 0, 0);

  await prisma.productView.create({
    data: {
      productId: prod1.id,
      date: todayUtc,
      count: 64,
    },
  });

  await prisma.productView.create({
    data: {
      productId: prod1.id,
      date: yesterdayUtc,
      count: 48,
    },
  });

  // Log d'audit initial
  await prisma.auditLog.create({
    data: {
      userId: client1.id,
      action: 'ESCROW_PAYMENT_CAPTURED',
      entityType: 'ORDER',
      entityId: testOrder.id,
      metadata: {
        orderNumber: testOrder.orderNumber,
        totalAmountFcfa: testOrder.totalAmountFcfa,
        provider: 'WAVE',
      },
    },
  });

  // 7. Extensions Espace Acheteur : Wishlist, Messages, Tracking, Transaction Mobile Money
  await prisma.wishlist.create({
    data: {
      userId: client1.id,
      productId: prod1.id,
    },
  });

  await prisma.message.create({
    data: {
      senderId: client1.id,
      receiverId: vendor1.id,
      shopId: shop1.id,
      productId: prod1.id,
      content:
        'Bonjour Moussa, avez-vous la taille XL en stock pour le grand boubou Bazin Getzner ?',
      isRead: true,
      readAt: new Date(),
    },
  });

  await prisma.message.create({
    data: {
      senderId: vendor1.id,
      receiverId: client1.id,
      shopId: shop1.id,
      productId: prod1.id,
      content:
        'Bonjour Fatou ! Oui absolument, il nous reste 6 pièces en taille XL prêtes à être expédiées.',
      isRead: false,
    },
  });

  await prisma.orderTracking.create({
    data: {
      orderId: testOrder.id,
      statusStep: OrderStatus.PAID_ESCROW,
      title: 'Paiement sécurisé sur le séquestre Wave',
      comment: 'Fonds de 37 000 FCFA bloqués avec succès.',
    },
  });

  await prisma.orderTracking.create({
    data: {
      orderId: testOrder.id,
      statusStep: OrderStatus.PREPARING,
      title: 'Colis en cours de préparation',
      comment:
        'Boutique Teranga Mode prépare le colis pour le livreur Tiak-Tiak.',
    },
  });

  await prisma.paymentTransaction.create({
    data: {
      orderId: testOrder.id,
      amountFcfa: 37000,
      provider: PaymentProvider.WAVE,
      phone: '+221765432109',
      externalTxId: 'WAVE_TX_TEST_001',
      status: 'SUCCESS',
    },
  });

  // 8. Extensions Phase 4 : Wakhale, Live Shopping & Achat Fractionné BNPL
  // Négociation Wakhale en cours
  await prisma.priceNegotiation.create({
    data: {
      productId: prod1.id,
      buyerId: client1.id,
      shopId: shop1.id,
      originalPriceFcfa: 35000,
      proposedPriceFcfa: 30000,
      counterPriceFcfa: 32000,
      status: NegotiationStatus.COUNTER_OFFERED,
      expiresAt: new Date(Date.now() + 24 * 3600 * 1000),
    },
  });

  // Live Stream actif avec produit épinglé
  await prisma.mediaStream.create({
    data: {
      shopId: shop1.id,
      title: 'Vente Flash Spéciale Bazin & Prêt-à-porter',
      description: 'Défilé en direct de nos nouvelles coupes Tabaski 2026',
      type: StreamType.LIVE_STREAM,
      status: StreamStatus.LIVE,
      mediaUrl: 'https://cdn.openboutik.sn/streams/teranga-live.m3u8',
      thumbnailUrl:
        'https://images.unsplash.com/photo-1544441893-675973e31985?w=600',
      viewsCount: 142,
      peakViewers: 38,
      startedAt: new Date(),
      streamProducts: {
        create: [
          {
            productId: prod1.id,
            isPinned: true,
            specialPriceFcfa: 30000,
          },
        ],
      },
    },
  });

  // Plan BNPL en 3 fois sur la commande test
  await prisma.installmentPlan.create({
    data: {
      orderId: testOrder.id,
      userId: client1.id,
      shopId: shop1.id,
      totalAmountFcfa: 37000,
      installmentsCount: 3,
      paidAmountFcfa: 12334,
      remainingAmountFcfa: 24666,
      status: InstallmentPlanStatus.ACTIVE,
      payments: {
        create: [
          {
            installmentNumber: 1,
            amountFcfa: 12334, // 12333 + 1
            dueDate: new Date(),
            paidAt: new Date(),
            status: InstallmentPaymentStatus.PAID,
            paymentTransactionId: 'WAVE_TX_TEST_001',
          },
          {
            installmentNumber: 2,
            amountFcfa: 12333,
            dueDate: new Date(Date.now() + 30 * 24 * 3600 * 1000),
            status: InstallmentPaymentStatus.PENDING,
          },
          {
            installmentNumber: 3,
            amountFcfa: 12333,
            dueDate: new Date(Date.now() + 60 * 24 * 3600 * 1000),
            status: InstallmentPaymentStatus.PENDING,
          },
        ],
      },
    },
  });

  console.log(`✅ Commande séquestre : ${testOrder.orderNumber} (OTP: 482910)`);
  console.log(`✅ Commande confirmée livrée : ${deliveredOrder.orderNumber}`);
  console.log(
    '🚀 Seed complet : Socle V1 + Roadmap V2 Vendeur + Roadmap Acheteur + Phase 4 (Wakhale, Live, BNPL) !',
  );
}

main()
  .catch((e) => {
    console.error('❌ Erreur lors du seed :', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
