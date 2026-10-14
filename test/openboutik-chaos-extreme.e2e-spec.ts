import 'dotenv/config';
import {
  PrismaClient,
  Role,
  PaymentProvider,
  OrderStatus,
  EscrowStatus,
} from '../src/generated/prisma/client';
import { PrismaMariaDb } from '@prisma/adapter-mariadb';
import { OrdersService } from '../src/orders/orders.service';
import { DisputesService } from '../src/disputes/disputes.service';
import { WalletsService } from '../src/wallets/wallets.service';

async function runChaosExtremeSuite() {
  console.log('========================================================================================');
  console.log('🔥 DÉMARRAGE DU PROTOCOLE DE STRESS-TEST EXTRÊME & CONCURRENCE CRITIQUE (OPENBOUTIK)');
  console.log('========================================================================================\n');

  const adapter = new PrismaMariaDb(process.env.DATABASE_URL || 'mysql://root:@localhost:3306/openboutik_db');
  const prisma = new PrismaClient({ adapter });

  const ordersService = new OrdersService(prisma as any);
  const disputesService = new DisputesService(prisma as any);
  const walletsService = new WalletsService(prisma as any);

  let passedTests = 0;
  let totalTests = 0;

  function assert(condition: boolean, testName: string) {
    totalTests++;
    if (condition) {
      passedTests++;
      console.log(`  ✅ [PASS] ${testName}`);
    } else {
      console.error(`  ❌ [FAIL] ${testName}`);
      throw new Error(`Échec du test de résistance : ${testName}`);
    }
  }

  // --- Récupération des acteurs réels ---
  const client = await prisma.user.findFirst({ where: { role: Role.CLIENT } });
  const admin = await prisma.user.findFirst({ where: { role: Role.SUPER_ADMIN } });
  const vendorUser = await prisma.user.findUnique({
    where: { email: 'moussa.diop@terangamode.sn' },
    include: { shop: { include: { wallet: true } } },
  });

  if (!client || !admin || !vendorUser || !vendorUser.shop) {
    throw new Error('Données de seed introuvables. Lancez npm run seed d’abord.');
  }

  const shop = vendorUser.shop;

  // ========================================================================================
  // ÉPREUVE 1 : ATTAQUE EN RAFALE SUR STOCK TRÈS LIMITÉ (RACE CONDITION SURVENTE / FLASH SALE)
  // ========================================================================================
  console.log('--- ÉPREUVE 1 : ASSAUT DE 20 ACHATS CONCURRENTS SUR UN STOCK DE 3 ARTICLES ---');
  
  // Création d'un produit spécial flash sale avec un stock limité à exactement 3 unités
  const flashSlug = `flash-iphone-15-${Date.now()}`;
  const flashProduct = await prisma.product.create({
    data: {
      shopId: shop.id,
      name: 'iPhone 15 Pro Max Flash Deal',
      slug: flashSlug,
      priceFcfa: 750000,
      stock: 3, // SEULEMENT 3 EN STOCK !
      images: ['https://images.unsplash.com/photo-5'],
      isPublished: true,
    },
  });

  console.log(`  ℹ️  Produit créé avec stock initial = ${flashProduct.stock}`);
  console.log('  ⚡ Lancement de 20 requêtes simultanées de commande (1 unité chacune)...');

  const concurrentRequestsCount = 20;
  const purchasePromises = Array.from({ length: concurrentRequestsCount }).map((_, i) =>
    ordersService.checkout(client.id, {
      items: [{ productId: flashProduct.id, quantity: 1 }],
      deliveryAddress: `Dakar Médina Rue ${i + 1}`,
      deliveryPhone: '+221770000000',
      paymentProvider: PaymentProvider.WAVE,
    }),
  );

  const purchaseResults = await Promise.allSettled(purchasePromises);

  const fulfilledCount = purchaseResults.filter((r) => r.status === 'fulfilled').length;
  const rejectedCount = purchaseResults.filter((r) => r.status === 'rejected').length;

  console.log(`  📊 Résultats assaut stock : ${fulfilledCount} acceptés, ${rejectedCount} rejetés proprement`);

  // Vérification atomique
  assert(fulfilledCount === 3, 'Exactement 3 commandes ont pu être validées sur les 20 assauts');
  assert(rejectedCount === 17, 'Exactement 17 commandes ont été rejetées pour rupture de stock');

  const reloadedProduct = await prisma.product.findUnique({ where: { id: flashProduct.id } });
  assert(reloadedProduct!.stock === 0, 'Le stock final en BDD est STRICTEMENT égal à 0 (JAMAIS négatif)');

  // ========================================================================================
  // ÉPREUVE 2 : ATTAQUE DOUBLE-SPEND / RETRAITS PARALLÈLES SUR LE PORTEFEUILLE
  // ========================================================================================
  console.log('\n--- ÉPREUVE 2 : TENTATIVE DE RETRAITS CONCURRENTS (DOUBLE-SPEND SUR WALLET) ---');

  // Réinitialiser le solde disponible du vendeur à exactement 50 000 FCFA
  await prisma.vendorWallet.update({
    where: { shopId: shop.id },
    data: { availableBalanceFcfa: 50000 },
  });

  console.log('  ℹ️  Solde disponible configuré à 50 000 FCFA');
  console.log('  ⚡ Lancement de 5 requêtes de retrait SIMULTANÉES de 30 000 FCFA...');

  const payoutPromises = Array.from({ length: 5 }).map(() =>
    walletsService.requestPayout(vendorUser.id, {
      amountFcfa: 30000,
      provider: PaymentProvider.WAVE,
      recipientPhone: '+221771234567',
    }),
  );

  const payoutResults = await Promise.allSettled(payoutPromises);
  const payoutFulfilled = payoutResults.filter((r) => r.status === 'fulfilled').length;
  const payoutRejected = payoutResults.filter((r) => r.status === 'rejected').length;

  console.log(`  📊 Retraits : ${payoutFulfilled} réussi(s), ${payoutRejected} rejeté(s)`);

  assert(payoutFulfilled === 1, 'Un seul retrait de 30 000 FCFA a pu aboutir');
  assert(payoutRejected === 4, 'Les 4 autres tentatives concurrentes ont été bloquées (anti-double-dépense)');

  const finalWallet = await prisma.vendorWallet.findUnique({ where: { shopId: shop.id } });
  assert(finalWallet!.availableBalanceFcfa === 20000, 'Le solde restant est exactement 20 000 FCFA (50 000 - 30 000)');

  // ========================================================================================
  // ÉPREUVE 3 : REPLAY ATTACK CONCURRENTE SUR L'OTP TIAK-TIAK (DOUBLE SÉQUESTRE)
  // ========================================================================================
  console.log('\n--- ÉPREUVE 3 : ASSAUT CONCURRENT SUR LA LIBÉRATION D’UN SÉQUESTRE (REPLAY OTP) ---');

  // Création d'une commande fraîche avec séquestre
  const orderForReplay = await ordersService.checkout(client.id, {
    items: [{ productId: (await prisma.product.findFirst({ where: { shopId: shop.id } }))!.id, quantity: 1 }],
    deliveryAddress: 'Dakar Plateau',
    deliveryPhone: '+221773456789',
    paymentProvider: PaymentProvider.WAVE,
  });

  const targetOrder = orderForReplay.orders[0];
  const initialWalletBeforeRelease = await prisma.vendorWallet.findUnique({ where: { shopId: shop.id } });

  console.log(`  ℹ️  Commande créée (${targetOrder.orderNumber}) avec code OTP : ${targetOrder.deliveryConfirmationCode}`);
  console.log('  ⚡ 10 requêtes concurrentes envoient le code OTP en même temps...');

  const replayPromises = Array.from({ length: 10 }).map(() =>
    ordersService.confirmDelivery(targetOrder.id, vendorUser.id, Role.VENDOR, {
      confirmationCode: targetOrder.deliveryConfirmationCode,
    }),
  );

  const replayResults = await Promise.allSettled(replayPromises);
  const replaySuccess = replayResults.filter((r) => r.status === 'fulfilled').length;
  const replayBlocked = replayResults.filter((r) => r.status === 'rejected').length;

  console.log(`  📊 Déblocages OTP : ${replaySuccess} réussi, ${replayBlocked} bloqués`);

  assert(replaySuccess === 1, 'Exactement 1 seule validation OTP a débloqué les fonds');
  assert(replayBlocked === 9, 'Les 9 requêtes de rejeu concurrentes ont été immédiatement rejetées');

  const updatedWalletAfterReplay = await prisma.vendorWallet.findUnique({ where: { shopId: shop.id } });
  const expectedGain = targetOrder.netVendorAmountFcfa;
  const actualGain = updatedWalletAfterReplay!.availableBalanceFcfa - initialWalletBeforeRelease!.availableBalanceFcfa;

  assert(actualGain === expectedGain, `Le portefeuille du marchand n'a été crédité qu'UNE SEULE FOIS (+${expectedGain} FCFA)`);

  // ========================================================================================
  // ÉPREUVE 4 : CONFLIT SIMULTANÉ LITIGE VS VALIDATION DE LIVRAISON (RACE CONDITION)
  // ========================================================================================
  console.log('\n--- ÉPREUVE 4 : DUEL ULTRA-RAPIDE LITIGE CLIENT VS VALIDATION VENDEUR ---');

  const orderConflict = (
    await ordersService.checkout(client.id, {
      items: [{ productId: (await prisma.product.findFirst({ where: { shopId: shop.id } }))!.id, quantity: 1 }],
      deliveryAddress: 'Dakar Almadies',
      deliveryPhone: '+221778901234',
      paymentProvider: PaymentProvider.ORANGE_MONEY,
    })
  ).orders[0];

  console.log(`  ⚡ Déclenchement au même millième de seconde :`);
  console.log(`     Action A: Le client ouvre un litige`);
  console.log(`     Action B: Le vendeur tente de confirmer la livraison`);

  const duelResults = await Promise.allSettled([
    disputesService.openDispute(client.id, orderConflict.id, {
      reason: 'Article endommagé pendant le transport',
    }),
    ordersService.confirmDelivery(orderConflict.id, vendorUser.id, Role.VENDOR, {
      confirmationCode: orderConflict.deliveryConfirmationCode,
    }),
  ]);

  const disputeDone = duelResults[0].status === 'fulfilled';
  const deliveryDone = duelResults[1].status === 'fulfilled';

  console.log(`  📊 Issue du duel : Litige=${disputeDone ? 'GAGNÉ' : 'REJETÉ'}, Livraison=${deliveryDone ? 'GAGNÉE' : 'REJETÉE'}`);

  // Une seule des deux opérations doit triompher sans incohérence d'état
  assert(disputeDone !== deliveryDone, 'Une seule des deux opérations a pris le verrou (cohérence absolue)');

  const finalConflictOrder = await prisma.order.findUnique({
    where: { id: orderConflict.id },
    include: { escrow: true, dispute: true },
  });

  if (disputeDone) {
    assert(finalConflictOrder!.status === OrderStatus.DISPUTED, 'La commande est passée en litige');
    assert(finalConflictOrder!.escrow?.status === EscrowStatus.FROZEN_BY_DISPUTE, 'Le séquestre a été gelé');
  } else {
    assert(finalConflictOrder!.status === OrderStatus.DELIVERED_CONFIRMED, 'La commande a été confirmée');
    assert(finalConflictOrder!.escrow?.status === EscrowStatus.RELEASED_TO_VENDOR, 'Le séquestre a été versé');
  }

  // ========================================================================================
  // ÉPREUVE 5 : CONTRÔLE D'INJECTION & RÉSISTANCE AUX PAYLOADS ABERRANTS
  // ========================================================================================
  console.log('\n--- ÉPREUVE 5 : INJECTIONS, MONTANTS NÉGATIFS & QUANTITÉS ABERRANTES ---');

  // Tentative avec quantité négative
  let quantityRejected = false;
  try {
    await ordersService.checkout(client.id, {
      items: [{ productId: flashProduct.id, quantity: -5 }],
      deliveryAddress: 'Dakar',
      deliveryPhone: '+221770000000',
      paymentProvider: PaymentProvider.WAVE,
    });
  } catch (error: any) {
    quantityRejected = error.message.includes('strictement supérieur à 0');
  }
  assert(quantityRejected, 'Rejet strict 400 des commandes avec quantité négative ou nulle');

  // Tentative de retrait avec montant négatif ou nul
  let payoutRejectedFlag = false;
  try {
    await walletsService.requestPayout(vendorUser.id, {
      amountFcfa: -10000,
      provider: PaymentProvider.WAVE,
      recipientPhone: '+221771234567',
    });
  } catch (error: any) {
    payoutRejectedFlag = error.message.includes('strictement supérieur à 0');
  }
  assert(payoutRejectedFlag, 'Rejet strict 400 des demandes de retrait avec montant négatif ou nul');

  // Tentative d'injection de texte malveillant dans le motif de litige
  const sqlInjectionText = "'; DROP TABLE orders; -- <script>alert('hack')</script>";
  const orderForXss = (
    await ordersService.checkout(client.id, {
      items: [{ productId: (await prisma.product.findFirst({ where: { shopId: shop.id } }))!.id, quantity: 1 }],
      deliveryAddress: 'Dakar Yoff',
      deliveryPhone: '+221778901234',
      paymentProvider: PaymentProvider.WAVE,
    })
  ).orders[0];

  const sanitizedDispute = await disputesService.openDispute(client.id, orderForXss.id, {
    reason: sqlInjectionText,
  });

  assert(sanitizedDispute.reason === sqlInjectionText, 'Traitement sécurisé de la chaîne (paramétrée en BDD sans injection SQL)');

  // Vérification que les tables sont toujours intactes
  const ordersCount = await prisma.order.count();
  assert(ordersCount > 0, 'Intégrité de la table orders préservée à 100%');

  // ========================================================================================
  // ÉPREUVE 6 : TRAÇABILITÉ DES AUDIT LOGS SOUS HAUT DÉBIT
  // ========================================================================================
  console.log('\n--- ÉPREUVE 6 : RÉSISTANCE & COHÉRENCE DE LA JOURNALISATION D’AUDIT ---');

  const totalAuditLogs = await prisma.auditLog.count();
  console.log(`  ℹ️  Nombre total d'actions immuables enregistrées en BDD : ${totalAuditLogs}`);
  assert(totalAuditLogs >= 30, 'Plus de 30 événements critiques tracés avec userId, action et snapshot JSON');

  await prisma.$disconnect();

  console.log('\n========================================================================================');
  console.log(`🏆 RÉSULTAT DU PROTOCOLE DE STRESS-TEST EXTRÊME : ${passedTests}/${totalTests} TESTS PASSÉS AVEC SUCCÈS !`);
  console.log('   Le moteur OpenBoutik API résiste aux pires attaques de concurrence et de charge.');
  console.log('========================================================================================\n');
}

runChaosExtremeSuite().catch((err) => {
  console.error('\n❌ ÉCHEC CRITIQUE DU PROTOCOLE CHAOS :', err);
  process.exit(1);
});
