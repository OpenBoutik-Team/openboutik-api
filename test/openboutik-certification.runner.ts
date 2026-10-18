import 'dotenv/config';
import {
  PrismaClient,
  Role,
  PaymentProvider,
  DeliveryMethod,
  OrderStatus,
  EscrowStatus,
  KycStatus,
  SubscriptionPlan,
  DisputeStatus,
} from '../src/generated/prisma/client';
import { PrismaMariaDb } from '@prisma/adapter-mariadb';
import { AuthService } from '../src/auth/auth.service';
import { UsersService } from '../src/users/users.service';
import { ShopsService } from '../src/shops/shops.service';
import { OrdersService } from '../src/orders/orders.service';
import { WalletsService } from '../src/wallets/wallets.service';
import { DisputesService } from '../src/disputes/disputes.service';
import { CatalogService } from '../src/catalog/catalog.service';
import { JwtService } from '@nestjs/jwt';
import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import { UpdateShopDto } from '../src/shops/dto/update-shop.dto';
import { DisputeDecision } from '../src/disputes/dto/arbitrate-dispute.dto';

async function runIntegralCertificationSuite() {
  const startTime = Date.now();
  console.log('========================================================================================');
  console.log('🇸🇳 PROTOCOLE DE CERTIFICATION FINALE OFFENSIVE & RED TEAM — OPENBOUTIK API');
  console.log('    Moteur de Séquestre, Commissions Dynamiques, Onboarding (0-5), KYC & Concurrence');
  console.log('========================================================================================\n');

  const adapter = new PrismaMariaDb(process.env.DATABASE_URL || 'mysql://root:@localhost:3306/openboutik_db');
  const prisma = new PrismaClient({ adapter });

  const jwtService = new JwtService({ secret: 'openboutik_jwt_access_super_secret_local_dev_key_2026' });
  const usersService = new UsersService(prisma as any);
  const authService = new AuthService(prisma as any, usersService, jwtService);
  const shopsService = new ShopsService(prisma as any);
  const ordersService = new OrdersService(prisma as any);
  const walletsService = new WalletsService(prisma as any);
  const disputesService = new DisputesService(prisma as any);
  const catalogService = new CatalogService(prisma as any);

  let passedTests = 0;
  let totalTests = 0;

  function assert(condition: boolean, testName: string, extra?: string) {
    totalTests++;
    if (condition) {
      passedTests++;
      console.log(`  ✅ [PASS] ${testName}${extra ? ` (${extra})` : ''}`);
    } else {
      console.error(`  ❌ [FAIL] ${testName}${extra ? ` (${extra})` : ''}`);
      throw new Error(`ÉCHEC CRITIQUE : ${testName}`);
    }
  }

  // Nettoyage préalable ordonné des comptes de test
  const testPhoneA = '+221770010001';
  const testPhoneB = '+221770020002';
  const testPhoneClientA = '+221770030003';
  const testPhoneClientB = '+221770040004';

  const testPhones = [testPhoneA, testPhoneB, testPhoneClientA, testPhoneClientB];
  for (const phone of testPhones) {
    const existing = await prisma.user.findUnique({
      where: { phone },
      include: { shop: { include: { wallet: true } } },
    });
    if (existing) {
      // Nettoyage des commandes associées en tant que client
      const clientOrders = await prisma.order.findMany({ where: { clientId: existing.id } });
      const clientOrderIds = clientOrders.map((o) => o.id);
      if (clientOrderIds.length > 0) {
        await prisma.dispute.deleteMany({ where: { orderId: { in: clientOrderIds } } });
        await prisma.escrowTransaction.deleteMany({ where: { orderId: { in: clientOrderIds } } });
        await prisma.orderItem.deleteMany({ where: { orderId: { in: clientOrderIds } } });
        await prisma.order.deleteMany({ where: { id: { in: clientOrderIds } } });
      }

      if (existing.shop) {
        // Nettoyage des commandes associées à la boutique
        const shopOrders = await prisma.order.findMany({ where: { shopId: existing.shop.id } });
        const shopOrderIds = shopOrders.map((o) => o.id);
        if (shopOrderIds.length > 0) {
          await prisma.dispute.deleteMany({ where: { orderId: { in: shopOrderIds } } });
          await prisma.escrowTransaction.deleteMany({ where: { orderId: { in: shopOrderIds } } });
          await prisma.orderItem.deleteMany({ where: { orderId: { in: shopOrderIds } } });
          await prisma.order.deleteMany({ where: { id: { in: shopOrderIds } } });
        }

        if (existing.shop.wallet) {
          await prisma.walletPayout.deleteMany({ where: { walletId: existing.shop.wallet.id } });
          await prisma.vendorWallet.delete({ where: { id: existing.shop.wallet.id } });
        }
        await prisma.product.deleteMany({ where: { shopId: existing.shop.id } });
        await prisma.category.deleteMany({ where: { shopId: existing.shop.id } });
        await prisma.shop.delete({ where: { id: existing.shop.id } });
      }
      await prisma.checkoutSession.deleteMany({ where: { clientId: existing.id } });
      await prisma.auditLog.deleteMany({ where: { userId: existing.id } });
      await prisma.user.delete({ where: { id: existing.id } });
    }
  }

  const superAdmin = await prisma.user.findFirst({ where: { role: Role.SUPER_ADMIN } });
  assert(!!superAdmin, 'Super-Admin opérationnel en base de données', superAdmin?.email || '');

  // ========================================================================================
  // SCÉNARIO 1 : CRASH-TEST PARCOURS ONBOARDING VENDEUR (ÉTAPES 0 À 5 & REPRISE)
  // ========================================================================================
  console.log('\n========================================================================================');
  console.log('📌 SCÉNARIO 1 : PARCOURS D’ONBOARDING VENDEUR (ÉTAPES 0 À 5 & REPRISE)');
  console.log('========================================================================================');

  // 1.1 Rejet inscription si acceptTerms !== true
  try {
    await authService.registerVendor({
      phone: testPhoneA,
      fullName: 'Moussa Diop',
      password: 'Passer123!',
      acceptTerms: false as any,
    });
    assert(false, 'Rejet acceptTerms: false');
  } catch (err: any) {
    assert(err.status === 400, 'Étape 0 : Rejet strict 400 si acceptTerms !== true');
  }

  // 1.2 Inscription valide avec acceptTerms: true
  const regVendorA = await authService.registerVendor({
    phone: testPhoneA,
    fullName: 'Moussa Diop',
    email: 'moussa.dakar@openboutik.sn',
    password: 'Passer123!',
    acceptTerms: true,
  });

  const vendorAId = regVendorA.user.id;
  assert(!!vendorAId, 'Étape 0 : Inscription marchand validée (201 Created)');
  assert(
    (regVendorA.user as any).passwordHash === undefined,
    'Étape 0 : Zéro fuite de secret (passwordHash absent du JSON)',
  );

  const vendorUserInDb = await prisma.user.findUnique({ where: { id: vendorAId } });
  assert(
    !!vendorUserInDb?.acceptedTermsAt,
    'Étape 0 : Horodatage contractuel acceptedTermsAt persisté en BDD',
    vendorUserInDb?.acceptedTermsAt?.toISOString(),
  );

  // 1.3 Vérification de slug en temps réel
  const slugCheck1 = await shopsService.checkSlugAvailability('dakar-sneakers');
  assert(slugCheck1.available === true, 'Slug "dakar-sneakers" disponible en temps réel');

  // 1.4 Étape 1 : Identité de la boutique
  const step1 = await shopsService.saveOnboardingStep(vendorAId, 1, {
    name: 'Dakar Sneakers Hub',
    slug: 'dakar-sneakers',
    description: 'Boutique de sneakers et streetwear exclusif à Dakar',
    mainCategory: 'Mode & Chaussures',
    city: 'Dakar',
  });
  assert(step1.hasShop === true, 'Étape 1 : Boutique créée en base de données');
  assert(step1.onboardingStep === 2, 'Étape 1 : Progression automatique vers l’étape 2');
  assert(step1.onboardingCompleted === false, 'Étape 1 : onboardingCompleted reste false');

  // 1.5 Test de persistance & reprise multi-appareils
  const resumeState = await shopsService.getOnboardingStatus(vendorAId);
  assert(
    resumeState.hasShop === true && resumeState.onboardingStep === 2 && resumeState.onboardingCompleted === false,
    'Persistance MySQL : Reprise exacte à l’étape 2 sur un autre terminal',
  );

  // 1.6 Étape 2 : Apparence (Sautée)
  const step2 = await shopsService.saveOnboardingStep(vendorAId, 2, { skip: true });
  assert(step2.onboardingStep === 3, 'Étape 2 : Saut d’étape { skip: true } validé -> Étape 3');
  assert(step2.shop!.primaryColor === '#10B981', 'Étape 2 : Couleur hexadécimale par défaut #10B981 appliquée');
  assert(step2.shop!.logoUrl === null && step2.shop!.bannerUrl === null, 'Étape 2 : logoUrl et bannerUrl restent null');

  // 1.7 Étape 3 : WhatsApp Social Commerce (Obligatoire)
  try {
    await shopsService.saveOnboardingStep(vendorAId, 3, { whatsappNumber: '12345' });
    assert(false, 'Rejet WhatsApp invalide');
  } catch (err: any) {
    assert(err.status === 400, 'Étape 3 : Rejet 400 pour numéro WhatsApp non sénégalais');
  }

  const step3 = await shopsService.saveOnboardingStep(vendorAId, 3, { whatsappNumber: '+221771234567' });
  assert(step3.onboardingStep === 4, 'Étape 3 : WhatsApp +221771234567 validé -> Étape 4');

  // 1.8 Étape 4 : Paiements Séquestre (Obligatoire)
  try {
    await shopsService.saveOnboardingStep(vendorAId, 4, {
      waveNumber: '+221771234567',
      payoutHolderName: '',
    });
    assert(false, 'Rejet titulaire manquant');
  } catch (err: any) {
    assert(err.status === 400, 'Étape 4 : Rejet 400 si payoutHolderName est absent');
  }

  const step4 = await shopsService.saveOnboardingStep(vendorAId, 4, {
    waveNumber: '+221771234567',
    omNumber: '+221761234567',
    payoutHolderName: 'Moussa Diop',
  });
  assert(step4.onboardingStep === 5, 'Étape 4 : Validée -> Étape 5');
  assert(step4.onboardingCompleted === true, 'Étape 4 : onboardingCompleted = true (Étapes 1, 3, 4 remplies)');
  assert(step4.shop!.isActive === true, 'Étape 4 : Boutique activée immédiatement (isActive = true)');

  // 1.9 Étape 5 : Plan SaaS (Choix FREE par défaut)
  const step5 = await shopsService.saveOnboardingStep(vendorAId, 5, { plan: SubscriptionPlan.FREE });
  assert(step5.shop!.subscriptionPlan === SubscriptionPlan.FREE, 'Étape 5 : Plan FREE configuré (Commission 4 %)');
  assert(step5.shop!.isVerified === false, 'Étape 5 : isVerified = false (en attente certification Super-Admin)');
  assert(step5.shop!.kycStatus === KycStatus.NONE, 'Étape 5 : kycStatus = NONE (pas de CNI bloquante à l’onboarding)');
  assert(step5.checklist.hasAddedFirstProduct === false, 'Checklist : hasAddedFirstProduct = false');

  const shopAId = step5.shop!.id;

  // ========================================================================================
  // SCÉNARIO 2 : RÈGLE « 1 VENDEUR = 1 BOUTIQUE » & UNICITÉ DU SLUG
  // ========================================================================================
  console.log('\n========================================================================================');
  console.log('📌 SCÉNARIO 2 : RÈGLE MVP « 1 VENDEUR = 1 BOUTIQUE » & UNICITÉ DU SLUG');
  console.log('========================================================================================');

  // 2.1 Tentative de création d'une 2ème boutique par Moussa
  try {
    await shopsService.createShop(vendorAId, {
      name: 'Deuxième Boutique Moussa',
      slug: 'deuxieme-boutique-moussa',
      mainCategory: 'Mode',
    });
    assert(false, 'Création 2ème boutique');
  } catch (err: any) {
    assert(err.status === 409, 'Règle MVP : Rejet 409 Conflict (1 compte vendeur = 1 boutique maximum)');
  }

  // 2.2 Inscription Vendeur B et tentative de vol de slug
  const regVendorB = await authService.registerVendor({
    phone: testPhoneB,
    fullName: 'Ousmane Ba',
    email: 'ousmane.ba@openboutik.sn',
    password: 'Passer123!',
    acceptTerms: true,
  });
  const vendorBId = regVendorB.user.id;

  try {
    await shopsService.saveOnboardingStep(vendorBId, 1, {
      name: 'Dakar Sneakers Bis',
      slug: 'dakar-sneakers', // déjà pris par Moussa
      mainCategory: 'Mode',
    });
    assert(false, 'Vol de slug');
  } catch (err: any) {
    assert(err.status === 409, 'Anti-collision : Rejet 409 Conflict si le slug "dakar-sneakers" est déjà pris');
  }

  const slugCheckOccupied = await shopsService.checkSlugAvailability('dakar-sneakers');
  assert(slugCheckOccupied.available === false, 'Vérification : slug "dakar-sneakers" détecté occupé');
  assert(
    typeof slugCheckOccupied.suggestion === 'string' && slugCheckOccupied.suggestion.startsWith('dakar-sneakers-'),
    'Suggestion automatique d’une alternative dakaroise libre',
    slugCheckOccupied.suggestion,
  );

  // Vendeur B prend son propre slug
  const step1B = await shopsService.saveOnboardingStep(vendorBId, 1, {
    name: 'Ba Tech Plateau',
    slug: 'ba-tech-plateau',
    mainCategory: 'Électronique',
  });
  const shopBId = step1B.shop!.id;
  assert(!!shopBId, 'Vendeur B initialise sa boutique avec son propre slug');

  // ========================================================================================
  // SCÉNARIO 3 : MOTEUR FINANCIER, SÉQUESTRE (ESCROW) & COMMISSIONS DYNAMIQUES (4 % VS 2 %)
  // ========================================================================================
  console.log('\n========================================================================================');
  console.log('📌 SCÉNARIO 3 : MOTEUR FINANCIER, SÉQUESTRE & COMMISSIONS DYNAMIQUES (4 % VS 2 %)');
  console.log('========================================================================================');

  // Inscription d'un client acheteur
  const regClientA = await authService.registerClient({
    phone: testPhoneClientA,
    fullName: 'Awa Faye',
    email: 'awa.faye@gmail.com',
    password: 'Passer123!',
  });
  const clientAId = regClientA.user.id;

  // Moussa ajoute un premier produit à 25 000 FCFA avec stock = 5
  const prodA = await catalogService.createProduct(vendorAId, {
    name: 'Air Jordan 1 Retro Dakar Edition',
    slug: 'air-jordan-1-retro-dakar',
    priceFcfa: 25000,
    stock: 5,
    images: ['https://images.unsplash.com/photo-1552346154-21d32810aba3?w=600'],
    description: 'Sneaker collector importée édition limitée.',
  });

  const checkAfterProd = await shopsService.getOnboardingStatus(vendorAId);
  assert(checkAfterProd.checklist.hasAddedFirstProduct === true, 'Checklist marchand : hasAddedFirstProduct = true');

  // --- VENTE 1 : SOUS PLAN FREE (COMMISSION STRICTE 4 %) ---
  console.log('  -> Test Vente 1 : Plan FREE (Taux de commission = 4 %)');
  const checkout1 = await ordersService.checkout(clientAId, {
    items: [{ productId: prodA.id, quantity: 2 }], // 2 * 25 000 = 50 000 FCFA
    deliveryMethod: DeliveryMethod.TIAK_TIAK,
    deliveryAddress: 'Almadies Zone 4, Dakar',
    deliveryCity: 'Dakar',
    deliveryPhone: testPhoneClientA,
    paymentProvider: PaymentProvider.WAVE,
  });

  const order1 = checkout1.orders[0];
  assert(order1.subtotalFcfa === 50000, 'Sous-total marchandise exact : 50 000 FCFA');
  assert(order1.deliveryFeeFcfa === 2000, 'Frais forfaitaires Tiak-Tiak : 2 000 FCFA');
  assert(order1.totalAmountFcfa === 52000, 'Montant débité au client : 52 000 FCFA');
  assert(order1.commissionRate === 4, 'Taux de commission figé à 4 % (Plan FREE)');
  assert(order1.commissionAmountFcfa === 2000, 'Montant commission OpenBoutik : 2 000 FCFA (4 % de 50 000)');
  assert(order1.netVendorAmountFcfa === 48000, 'Net vendeur exact : 48 000 FCFA');

  const walletA1 = await prisma.vendorWallet.findUnique({ where: { shopId: shopAId } });
  assert(walletA1?.escrowBalanceFcfa === 48000, 'Séquestre crédité du net marchand : 48 000 FCFA bloqués');
  assert(walletA1?.availableBalanceFcfa === 0, 'Solde disponible = 0 FCFA avant livraison');

  // Expédition Tiak-Tiak
  await ordersService.shipOrder(order1.id, vendorAId);

  // Livraison confirmée avec OTP par le client
  const fullOrder1 = await prisma.order.findUnique({ where: { id: order1.id } });
  await ordersService.confirmDelivery(order1.id, clientAId, Role.CLIENT, {
    confirmationCode: fullOrder1!.deliveryConfirmationCode,
  });

  const walletAAfterDeliv1 = await prisma.vendorWallet.findUnique({ where: { shopId: shopAId } });
  assert(walletAAfterDeliv1?.escrowBalanceFcfa === 0, 'Séquestre débloqué : escrowBalanceFcfa retombe à 0 FCFA');
  assert(
    walletAAfterDeliv1?.availableBalanceFcfa === 48000,
    'Solde disponible crédité exactement de 48 000 FCFA au franc près',
  );

  // --- VENTE 2 : PASSAGE EN PLAN PREMIUM (COMMISSION RÉDUITE À 2 %) ---
  console.log('  -> Test Vente 2 : Passage en Plan PREMIUM (Taux de commission = 2 %)');
  await shopsService.saveOnboardingStep(vendorAId, 5, { plan: SubscriptionPlan.PREMIUM });

  const checkout2 = await ordersService.checkout(clientAId, {
    items: [{ productId: prodA.id, quantity: 2 }], // 2 * 25 000 = 50 000 FCFA
    deliveryMethod: DeliveryMethod.TIAK_TIAK,
    deliveryAddress: 'Fann Résidence, Dakar',
    deliveryPhone: testPhoneClientA,
    paymentProvider: PaymentProvider.WAVE,
  });

  const order2 = checkout2.orders[0];
  assert(order2.commissionRate === 2, 'Taux de commission figé à 2 % (Plan PREMIUM)');
  assert(order2.commissionAmountFcfa === 1000, 'Commission réduite OpenBoutik : 1 000 FCFA (2 % de 50 000)');
  assert(order2.netVendorAmountFcfa === 49000, 'Net vendeur supérieur : 49 000 FCFA');

  await ordersService.shipOrder(order2.id, vendorAId);
  const fullOrder2 = await prisma.order.findUnique({ where: { id: order2.id } });
  await ordersService.confirmDelivery(order2.id, clientAId, Role.CLIENT, {
    confirmationCode: fullOrder2!.deliveryConfirmationCode,
  });

  const walletAAfterDeliv2 = await prisma.vendorWallet.findUnique({ where: { shopId: shopAId } });
  assert(
    walletAAfterDeliv2?.availableBalanceFcfa === 97000,
    'Solde disponible cumulé exact : 48 000 + 49 000 = 97 000 FCFA',
  );

  // ========================================================================================
  // SCÉNARIO 4 : BOUCLIER KYC PROGRESSIF (BLOCAGE CNI AU 1ER RETRAIT)
  // ========================================================================================
  console.log('\n========================================================================================');
  console.log('📌 SCÉNARIO 4 : BOUCLIER KYC PROGRESSIF (BLOCAGE CNI AU 1ER RETRAIT)');
  console.log('========================================================================================');

  // 4.1 Retrait refusé tant que KYC === NONE
  try {
    await walletsService.requestPayout(vendorAId, {
      amountFcfa: 40000,
      provider: PaymentProvider.WAVE,
      recipientPhone: testPhoneA,
    });
    assert(false, 'Retrait sans KYC');
  } catch (err: any) {
    assert(
      err.status === 403,
      'Verrou KYC : Rejet strict 403 Forbidden tant que le KYC est NONE',
      err.message,
    );
  }

  const walletCheckUntouched = await prisma.vendorWallet.findUnique({ where: { shopId: shopAId } });
  assert(walletCheckUntouched?.availableBalanceFcfa === 97000, 'Solde disponible préservé intact à 97 000 FCFA');

  // 4.2 Soumission de la CNI par le marchand -> PENDING
  const submitKycRes = await shopsService.submitKyc(vendorAId, {
    idCardNumber: '1 758 1990 04821',
    idCardUrl: 'https://storage.openboutik.sn/kyc/cni-moussa-diop-dakar.jpg',
  });
  assert(submitKycRes.kycStatus === KycStatus.PENDING, 'Statut KYC passé en PENDING');

  // Retrait toujours bloqué en PENDING
  try {
    await walletsService.requestPayout(vendorAId, {
      amountFcfa: 40000,
      provider: PaymentProvider.WAVE,
      recipientPhone: testPhoneA,
    });
    assert(false, 'Retrait en PENDING');
  } catch (err: any) {
    assert(err.status === 403, 'Verrou KYC : Retrait toujours bloqué 403 en statut PENDING');
  }

  // 4.3 Validation par le SUPER_ADMIN -> VERIFIED
  const reviewKycRes = await shopsService.reviewKyc(
    shopAId,
    { status: KycStatus.VERIFIED, verifyShopBadge: true },
    superAdmin!.id,
  );
  assert(reviewKycRes.kycStatus === KycStatus.VERIFIED, 'Super-Admin valide le KYC -> Statut VERIFIED');
  assert(reviewKycRes.isVerified === true, 'Badge certifié Marchand Vérifié attribué');

  // 4.4 Retrait autorisé après vérification
  const payoutRes = await walletsService.requestPayout(vendorAId, {
    amountFcfa: 40000,
    provider: PaymentProvider.WAVE,
    recipientPhone: testPhoneA,
  });
  assert(payoutRes.payout.amountFcfa === 40000, 'Retrait de 40 000 FCFA vers Wave exécuté avec succès');
  assert(
    payoutRes.remainingBalanceFcfa === 57000,
    'Solde restant exact (97 000 - 40 000 = 57 000 FCFA)',
  );

  const kycAuditLog = await prisma.auditLog.findFirst({
    where: { entityId: shopAId, action: 'KYC_VERIFIED' },
  });
  assert(!!kycAuditLog && kycAuditLog.userId === superAdmin!.id, 'Action KYC_VERIFIED consignée dans AuditLog');

  // ========================================================================================
  // SCÉNARIO 5 : PENTEST OFFENSIF — BOLA / IDOR, RBAC & MASS ASSIGNMENT
  // ========================================================================================
  console.log('\n========================================================================================');
  console.log('📌 SCÉNARIO 5 : PENTEST OFFENSIF — BOLA / IDOR, RBAC & MASS ASSIGNMENT');
  console.log('========================================================================================');

  // 5.1 Mass Assignment : Tentative d'auto-certification et d'injection de solde via DTO
  const illicitPayload = {
    name: 'Teranga Hack',
    isVerified: true,
    kycStatus: 'VERIFIED',
    commissionRate: 0,
    availableBalanceFcfa: 99999999,
  };
  const dtoInstance = plainToInstance(UpdateShopDto, illicitPayload);
  const massAssignErrors = await validate(dtoInstance, {
    whitelist: true,
    forbidNonWhitelisted: true,
  });
  assert(
    massAssignErrors.length > 0,
    'ValidationPipe : Rejet Mass Assignment (champs illicites isVerified, kycStatus interdits)',
  );

  // 5.2 BOLA / IDOR Vendeur : Vendeur B tente de modifier le produit de Vendeur A
  try {
    await catalogService.updateProduct(vendorBId, prodA.id, { priceFcfa: 100 });
    assert(false, 'BOLA Vendeur modification produit');
  } catch (err: any) {
    assert(err.status === 403, 'Anti-BOLA Vendeur : Rejet 403 Forbidden sur tentative de modification d’un tiers');
  }

  // Vendeur B tente d'expédier une commande de Vendeur A
  try {
    await ordersService.shipOrder(order1.id, vendorBId);
    assert(false, 'BOLA Vendeur expédition');
  } catch (err: any) {
    assert(err.status === 403, 'Anti-BOLA Vendeur : Rejet 403 Forbidden sur expédition d’une commande d’autrui');
  }

  // 5.3 BOLA / IDOR Client : Client B tente d'espionner ou ouvrir un litige sur la commande de Client A
  const regClientB = await authService.registerClient({
    phone: testPhoneClientB,
    fullName: 'Lamine Sané',
    email: 'lamine.sane@gmail.com',
    password: 'Passer123!',
  });
  const clientBId = regClientB.user.id;

  try {
    await ordersService.getOrderById(order1.id, clientBId, Role.CLIENT);
    assert(false, 'BOLA Client espionnage commande');
  } catch (err: any) {
    assert(err.status === 403, 'Anti-BOLA Client : Rejet 403 Forbidden (Client tiers bloqué sur getOrderById)');
  }

  try {
    await disputesService.openDispute(clientBId, order1.id, { reason: 'Tentative frauduleuse pirate' });
    assert(false, 'BOLA Client litige indu');
  } catch (err: any) {
    assert(err.status === 403, 'Anti-BOLA Client : Rejet 403 Forbidden (Client tiers bloqué sur openDispute)');
  }

  // ========================================================================================
  // SCÉNARIO 6 : CRASH-TEST DE CONCURRENCE & DOUBLE DÉPENSE (PROMISE.ALL)
  // ========================================================================================
  console.log('\n========================================================================================');
  console.log('📌 SCÉNARIO 6 : CRASH-TEST DE CONCURRENCE & DOUBLE DÉPENSE (PROMISE.ALL)');
  console.log('========================================================================================');

  // 6.1 Assaut de 5 confirmations simultanées avec OTP sur la même commande
  const prodRace = await catalogService.createProduct(vendorAId, {
    name: 'Chaussure Test Concurrence',
    slug: `chaussure-concurrence-${Date.now()}`,
    priceFcfa: 10000,
    stock: 5,
    images: ['https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=600'],
  });

  const checkRace = await ordersService.checkout(clientAId, {
    items: [{ productId: prodRace.id, quantity: 1 }],
    deliveryMethod: DeliveryMethod.TIAK_TIAK,
    deliveryAddress: 'Plateau Dakar',
    deliveryPhone: testPhoneClientA,
    paymentProvider: PaymentProvider.WAVE,
  });
  const orderRace = checkRace.orders[0];

  await ordersService.shipOrder(orderRace.id, vendorAId);

  const fullOrderRace = await prisma.order.findUnique({ where: { id: orderRace.id } });
  const raceOtp = fullOrderRace!.deliveryConfirmationCode;

  const otpAttacks = await Promise.allSettled([
    ordersService.confirmDelivery(orderRace.id, clientAId, Role.CLIENT, { confirmationCode: raceOtp }),
    ordersService.confirmDelivery(orderRace.id, clientAId, Role.CLIENT, { confirmationCode: raceOtp }),
    ordersService.confirmDelivery(orderRace.id, clientAId, Role.CLIENT, { confirmationCode: raceOtp }),
    ordersService.confirmDelivery(orderRace.id, clientAId, Role.CLIENT, { confirmationCode: raceOtp }),
    ordersService.confirmDelivery(orderRace.id, clientAId, Role.CLIENT, { confirmationCode: raceOtp }),
  ]);

  const otpSuccessCount = otpAttacks.filter((r) => r.status === 'fulfilled').length;
  const otpRejectedCount = otpAttacks.filter((r) => r.status === 'rejected').length;
  assert(otpSuccessCount === 1, 'Rejeu OTP : Exactement 1 seule validation a réussi sur les 5 requêtes simultanées');
  assert(otpRejectedCount === 4, 'Rejeu OTP : Les 4 autres requêtes concurrentes ont été bloquées avec succès');

  const currentWalletA = await prisma.vendorWallet.findUnique({ where: { shopId: shopAId } });
  assert(currentWalletA!.availableBalanceFcfa >= 50000, 'Solde vendeur disponible suffisant (>= 50 000 FCFA)');

  // On lance 5 retraits simultanés de 50 000 FCFA alors qu'il n'y a que startBal (ex: ~66 800 FCFA)
  const payoutAttacks = await Promise.allSettled([
    walletsService.requestPayout(vendorAId, { amountFcfa: 50000, provider: PaymentProvider.WAVE, recipientPhone: testPhoneA }),
    walletsService.requestPayout(vendorAId, { amountFcfa: 50000, provider: PaymentProvider.WAVE, recipientPhone: testPhoneA }),
    walletsService.requestPayout(vendorAId, { amountFcfa: 50000, provider: PaymentProvider.WAVE, recipientPhone: testPhoneA }),
    walletsService.requestPayout(vendorAId, { amountFcfa: 50000, provider: PaymentProvider.WAVE, recipientPhone: testPhoneA }),
    walletsService.requestPayout(vendorAId, { amountFcfa: 50000, provider: PaymentProvider.WAVE, recipientPhone: testPhoneA }),
  ]);

  const payoutSuccess = payoutAttacks.filter((r) => r.status === 'fulfilled').length;
  const payoutFailed = payoutAttacks.filter((r) => r.status === 'rejected').length;
  assert(payoutSuccess === 1, 'Anti-Double Dépense : Exactement 1 seul retrait de 50 000 FCFA a abouti');
  assert(payoutFailed === 4, 'Anti-Double Dépense : Les 4 autres requêtes concurrentes ont été rejetées');

  const finalBalWallet = await prisma.vendorWallet.findUnique({ where: { shopId: shopAId } });
  assert(finalBalWallet!.availableBalanceFcfa >= 0, 'Intégrité financière absolue : Solde disponible JAMAIS négatif (< 0)');

  // 6.3 Guerre de stock sur le dernier article (stock = 1)
  const prodLastOne = await catalogService.createProduct(vendorAId, {
    name: 'Dernier Sac Cuir Dakar',
    slug: `dernier-sac-cuir-${Date.now()}`,
    priceFcfa: 15000,
    stock: 1, // STRICTEMENT 1 ARTICLE
    images: ['https://images.unsplash.com/photo-1548036328-c9fa89d128fa?w=600'],
  });

  const stockRaceAttacks = await Promise.allSettled([
    ordersService.checkout(clientAId, {
      items: [{ productId: prodLastOne.id, quantity: 1 }],
      deliveryMethod: DeliveryMethod.PICKUP,
      deliveryAddress: 'Retrait Médina',
      deliveryPhone: testPhoneClientA,
      paymentProvider: PaymentProvider.WAVE,
    }),
    ordersService.checkout(clientBId, {
      items: [{ productId: prodLastOne.id, quantity: 1 }],
      deliveryMethod: DeliveryMethod.PICKUP,
      deliveryAddress: 'Retrait Médina',
      deliveryPhone: testPhoneClientB,
      paymentProvider: PaymentProvider.WAVE,
    }),
  ]);

  const stockWon = stockRaceAttacks.filter((r) => r.status === 'fulfilled').length;
  const stockLost = stockRaceAttacks.filter((r) => r.status === 'rejected').length;
  assert(stockWon === 1, 'Course au stock : Exactement 1 seul acheteur a pu réserver le dernier article');
  assert(stockLost === 1, 'Course au stock : Le 2ème acheteur a été rejeté proprement pour rupture de stock');

  const checkFinalStock = await prisma.product.findUnique({ where: { id: prodLastOne.id } });
  assert(checkFinalStock!.stock === 0, 'Stock final vérifié en base MySQL : Strictement 0 (jamais négatif)');

  // ========================================================================================
  // SCÉNARIO 7 : LITIGES (DISPUTES), GEL DU SÉQUESTRE & ARBITRAGE SUPER-ADMIN
  // ========================================================================================
  console.log('\n========================================================================================');
  console.log('📌 SCÉNARIO 7 : LITIGES (DISPUTES), GEL DU SÉQUESTRE & ARBITRAGE SUPER-ADMIN');
  console.log('========================================================================================');

  // Création d'une commande qui va faire l'objet d'un litige
  const checkDispute = await ordersService.checkout(clientAId, {
    items: [{ productId: prodRace.id, quantity: 1 }],
    deliveryMethod: DeliveryMethod.TIAK_TIAK,
    deliveryAddress: 'Grand Yoff, Dakar',
    deliveryPhone: testPhoneClientA,
    paymentProvider: PaymentProvider.WAVE,
  });
  const orderDisputed = checkDispute.orders[0];

  await ordersService.shipOrder(orderDisputed.id, vendorAId);

  // 7.1 Ouverture du litige par le client
  const dispute = await disputesService.openDispute(clientAId, orderDisputed.id, {
    reason: 'Colis endommagé lors de la livraison Tiak-Tiak, flacon brisé',
    evidenceUrls: ['https://storage.openboutik.sn/disputes/colis-abime.jpg'],
  });
  assert(dispute.status === DisputeStatus.OPEN, 'Litige ouvert par le client (Statut OPEN)');

  const orderAfterDispute = await prisma.order.findUnique({
    where: { id: orderDisputed.id },
    include: { escrow: true },
  });
  assert(orderAfterDispute?.status === OrderStatus.DISPUTED, 'Commande passée automatiquement en DISPUTED');
  assert(
    orderAfterDispute?.escrow?.status === EscrowStatus.FROZEN_BY_DISPUTE,
    'Séquestre immédiatement gelé (FROZEN_BY_DISPUTE)',
  );

  // 7.2 Tentative interdite de déblocage pendant le litige
  const fullOrderDispute = await prisma.order.findUnique({ where: { id: orderDisputed.id } });
  try {
    await ordersService.confirmDelivery(orderDisputed.id, clientAId, Role.CLIENT, {
      confirmationCode: fullOrderDispute!.deliveryConfirmationCode,
    });
    assert(false, 'Déblocage séquestre gelé');
  } catch (err: any) {
    assert(err.status === 400, 'Rejet 400 : Impossible de libérer les fonds d’une commande sous litige actif');
  }

  // 7.3 Arbitrage par le Super-Admin : Remboursement Client
  const arbitration = await disputesService.arbitrateDispute(superAdmin!.id, dispute.id, {
    decision: DisputeDecision.REFUND_CLIENT,
    decisionNotes: 'Preuves photos examinées : emballage non conforme du marchand, remboursement intégral accordé.',
  });
  assert(arbitration.status === DisputeStatus.RESOLVED_REFUND_CLIENT, 'Litige tranché en RESOLVED_REFUND_CLIENT');

  const orderFinalDispute = await prisma.order.findUnique({
    where: { id: orderDisputed.id },
    include: { escrow: true },
  });
  assert(orderFinalDispute?.status === OrderStatus.REFUNDED, 'Commande passée en REFUNDED');
  assert(orderFinalDispute?.escrow?.status === EscrowStatus.REFUNDED_TO_CLIENT, 'Séquestre marqué REFUNDED_TO_CLIENT');

  const disputeAuditLog = await prisma.auditLog.findFirst({
    where: { entityId: dispute.id, action: 'DISPUTE_ARBITRATED_REFUND_CLIENT' },
  });
  assert(
    !!disputeAuditLog && disputeAuditLog.userId === superAdmin!.id,
    'Décision d’arbitrage consignée dans AuditLog avec l’ID du Super-Admin',
  );

  // ========================================================================================
  // NETTOYAGE COMPLET DES DONNÉES DE CERTIFICATION
  // ========================================================================================
  console.log('\n--- NETTOYAGE FINAL DES DONNÉES DE CERTIFICATION ---');
  const allShopOrders = await prisma.order.findMany({
    where: { shopId: { in: [shopAId, shopBId] } },
    select: { id: true },
  });
  const allShopOrderIds = allShopOrders.map((o) => o.id);

  if (allShopOrderIds.length > 0) {
    await prisma.dispute.deleteMany({ where: { orderId: { in: allShopOrderIds } } });
    await prisma.escrowTransaction.deleteMany({ where: { orderId: { in: allShopOrderIds } } });
    await prisma.orderItem.deleteMany({ where: { orderId: { in: allShopOrderIds } } });
    await prisma.order.deleteMany({ where: { id: { in: allShopOrderIds } } });
  }

  await prisma.checkoutSession.deleteMany({
    where: { clientId: { in: [clientAId, clientBId, vendorAId, vendorBId] } },
  });

  await prisma.auditLog.deleteMany({
    where: {
      OR: [
        { entityId: { in: [shopAId, shopBId, ...allShopOrderIds] } },
        { userId: { in: [vendorAId, vendorBId, clientAId, clientBId] } },
      ],
    },
  });

  await prisma.product.deleteMany({ where: { shopId: { in: [shopAId, shopBId] } } });
  await prisma.category.deleteMany({ where: { shopId: { in: [shopAId, shopBId] } } });
  await prisma.walletPayout.deleteMany({ where: { wallet: { shopId: { in: [shopAId, shopBId] } } } });
  await prisma.vendorWallet.deleteMany({ where: { shopId: { in: [shopAId, shopBId] } } });
  await prisma.shop.deleteMany({ where: { id: { in: [shopAId, shopBId] } } });
  await prisma.user.deleteMany({ where: { id: { in: [vendorAId, vendorBId, clientAId, clientBId] } } });

  await prisma.$disconnect();

  const totalTime = ((Date.now() - startTime) / 1000).toFixed(2);
  console.log('\n========================================================================================');
  console.log(`🏆 CERTIFICATION FINALE VALIDÉE : ${passedTests} / ${totalTests} ASSERTIONS RÉUSSIES (100 %) !`);
  console.log(`⏱️  Temps total d'exécution : ${totalTime} secondes`);
  console.log('   Le moteur OpenBoutik API satisfait l’intégralité des 7 Scénarios de Crash-Test.');
  console.log('========================================================================================\n');
}

runIntegralCertificationSuite().catch((err) => {
  console.error('\n❌ ÉCHEC CRITIQUE DE LA CERTIFICATION :', err);
  process.exit(1);
});
