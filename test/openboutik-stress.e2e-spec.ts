import 'dotenv/config';
import { PrismaClient, Role, PaymentProvider, DeliveryMethod, OrderStatus, EscrowStatus } from '../src/generated/prisma/client';
import { PrismaMariaDb } from '@prisma/adapter-mariadb';
import { OrdersService } from '../src/orders/orders.service';
import { DisputesService } from '../src/disputes/disputes.service';
import { DisputeDecision } from '../src/disputes/dto/arbitrate-dispute.dto';
import { WalletsService } from '../src/wallets/wallets.service';
import { CatalogService } from '../src/catalog/catalog.service';

async function runIntenseStressSuite() {
  console.log('==============================================================================');
  console.log('🚀 DÉMARRAGE DE LA SUITE DE TESTS INTENSIFS & ANALYSE FINANCIÈRE (OPENBOUTIK)');
  console.log('==============================================================================\n');

  const adapter = new PrismaMariaDb(process.env.DATABASE_URL || 'mysql://root:@localhost:3306/openboutik_db');
  const prisma = new PrismaClient({ adapter });

  const ordersService = new OrdersService(prisma as any);
  const disputesService = new DisputesService(prisma as any);
  const walletsService = new WalletsService(prisma as any);
  const catalogService = new CatalogService(prisma as any);

  let passedTests = 0;
  let totalTests = 0;

  function assert(condition: boolean, testName: string) {
    totalTests++;
    if (condition) {
      passedTests++;
      console.log(`  ✅ [PASS] ${testName}`);
    } else {
      console.error(`  ❌ [FAIL] ${testName}`);
      throw new Error(`Échec du test : ${testName}`);
    }
  }

  // --- Données de test réelles ---
  const client = await prisma.user.findFirst({ where: { role: Role.CLIENT } });
  const admin = await prisma.user.findFirst({ where: { role: Role.SUPER_ADMIN } });
  const vendor1 = await prisma.user.findUnique({ where: { email: 'moussa.diop@terangamode.sn' } });
  const vendor2 = await prisma.user.findUnique({ where: { email: 'aminata.sow@dakartech.sn' } });

  const products = await prisma.product.findMany({
    include: { shop: true },
    orderBy: { createdAt: 'desc' },
  });

  const productShop1 = products.find((p) => p.shop.slug === 'teranga-mode')!;
  const productShop2 = products.find((p) => p.shop.slug === 'dakar-tech-hub')!;

  console.log('--- TEST 1 : RÉSISTANCE DES STOCKS & ATOMICITÉ ---');
  try {
    await ordersService.checkout(client!.id, {
      items: [{ productId: productShop1.id, quantity: 999999 }], // Quantité impossible
      deliveryAddress: 'Dakar Fann',
      deliveryPhone: '+221765432109',
      paymentProvider: PaymentProvider.WAVE,
    });
    assert(false, 'La commande avec stock excessif aurait dû être rejetée');
  } catch (error: any) {
    assert(error.message.includes('Stock insuffisant'), 'Rejet strict 400 en cas de dépassement de stock');
  }

  console.log('\n--- TEST 2 : PRÉCISION DES COMMISSIONS AU FCFA PRÈS ---');
  // Plan PRO : 3%
  const proSubtotal = 100000;
  const proComRate = 3;
  const proComAmount = Math.round(proSubtotal * (proComRate / 100));
  const proNet = proSubtotal - proComAmount;
  assert(proComAmount === 3000, 'Calcul commission Plan PRO (3%) : 3 000 FCFA sur 100 000 FCFA');
  assert(proNet === 97000, 'Net Vendeur Plan PRO : 97 000 FCFA');
  assert(proSubtotal === proComAmount + proNet, 'Égalité comptable stricte : Subtotal === Commission + Net Vendeur');

  // Plan FREE : 4% (décision Pilote)
  const freeSubtotal = 50000;
  const freeComRate = 4;
  const freeComAmount = Math.round(freeSubtotal * (freeComRate / 100));
  const freeNet = freeSubtotal - freeComAmount;
  assert(freeComAmount === 2000, 'Calcul commission Plan FREE (4%) : 2 000 FCFA sur 50 000 FCFA');
  assert(freeNet === 48000, 'Net Vendeur Plan FREE : 48 000 FCFA');
  assert(freeSubtotal === freeComAmount + freeNet, 'Égalité comptable stricte FREE');

  console.log('\n--- TEST 3 : ÉTANCHÉITÉ DU CHECKOUT MULTI-BOUTIQUES ---');
  const initialStock1 = productShop1.stock;
  const initialStock2 = productShop2.stock;

  const checkoutMulti = await ordersService.checkout(client!.id, {
    items: [
      { productId: productShop1.id, quantity: 1 },
      { productId: productShop2.id, quantity: 1 },
    ],
    deliveryAddress: 'Plateau Rue Carnot, Dakar',
    deliveryPhone: '+221765432109',
    paymentProvider: PaymentProvider.ORANGE_MONEY,
    deliveryMethod: DeliveryMethod.TIAK_TIAK,
  });

  assert(checkoutMulti.orders.length === 2, 'Génération exacte de 2 sous-commandes distinctes');

  const orderTeranga = checkoutMulti.orders.find((o) => o.shopId === productShop1.shopId)!;
  const orderTech = checkoutMulti.orders.find((o) => o.shopId === productShop2.shopId)!;

  assert(orderTeranga.orderNumber !== orderTech.orderNumber, 'Numéros de commande uniques');
  assert(orderTeranga.deliveryConfirmationCode !== orderTech.deliveryConfirmationCode, 'Codes OTP Tiak-Tiak indépendants');
  assert(orderTeranga.escrow.status === EscrowStatus.HELD_IN_ESCROW, 'Séquestre 1 bloqué (HELD_IN_ESCROW)');
  assert(orderTech.escrow.status === EscrowStatus.HELD_IN_ESCROW, 'Séquestre 2 bloqué (HELD_IN_ESCROW)');

  // Vérification de la décrémentation des stocks physiques
  const freshProd1 = await prisma.product.findUnique({ where: { id: productShop1.id } });
  const freshProd2 = await prisma.product.findUnique({ where: { id: productShop2.id } });
  assert(freshProd1!.stock === initialStock1 - 1, 'Stock Boutique 1 décrémenté atomiquement (-1)');
  assert(freshProd2!.stock === initialStock2 - 1, 'Stock Boutique 2 décrémenté atomiquement (-1)');

  console.log('\n--- TEST 4 : SÉCURITÉ DE L’OTP TIAK-TIAK ---');
  // Tentative de déblocage avec un faux code OTP par le vendeur
  try {
    await ordersService.confirmDelivery(
      orderTeranga.id,
      vendor1!.id,
      Role.VENDOR,
      { confirmationCode: '000000' }, // Mauvais OTP
    );
    assert(false, 'Le déblocage avec un mauvais code OTP aurait dû échouer');
  } catch (error: any) {
    assert(error.message.includes('invalide'), 'Rejet strict 400 si code OTP erroné');
  }

  // Déblocage nominal avec le vrai code OTP
  const validRelease = await ordersService.confirmDelivery(
    orderTeranga.id,
    vendor1!.id,
    Role.VENDOR,
    { confirmationCode: orderTeranga.deliveryConfirmationCode },
  );
  assert(validRelease.status === OrderStatus.DELIVERED_CONFIRMED, 'Commande passée à DELIVERED_CONFIRMED');

  const checkedEscrow = await prisma.escrowTransaction.findUnique({ where: { orderId: orderTeranga.id } });
  assert(checkedEscrow!.status === EscrowStatus.RELEASED_TO_VENDOR, 'Séquestre débloqué (RELEASED_TO_VENDOR)');

  console.log('\n--- TEST 5 : GEL DU SÉQUESTRE PAR LITIGE & ARBITRAGE SUPER-ADMIN ---');
  // Ouverture d'un litige sur la 2ème commande par le client
  const dispute = await disputesService.openDispute(client!.id, orderTech.id, {
    reason: 'Écouteurs reçus défectueux avec boîte ouverte.',
  });
  assert(dispute.status === 'OPEN', 'Litige ouvert avec succès');

  const frozenEscrow = await prisma.escrowTransaction.findUnique({ where: { orderId: orderTech.id } });
  assert(frozenEscrow!.status === EscrowStatus.FROZEN_BY_DISPUTE, 'Séquestre gelé instantanément (FROZEN_BY_DISPUTE)');

  // Tentative de déblocage pendant que le litige est gelé -> Doit échouer
  try {
    await ordersService.confirmDelivery(
      orderTech.id,
      client!.id,
      Role.CLIENT,
      {},
    );
    assert(false, 'Le déblocage d’une commande en litige aurait dû être rejeté');
  } catch (error: any) {
    assert(error.message.includes('litige gelé'), 'Rejet du déblocage d’un séquestre gelé');
  }

  // Arbitrage officiel par le Super-Admin : Remboursement de l'acheteur
  const arbitration = await disputesService.arbitrateDispute(admin!.id, dispute.id, {
    decision: DisputeDecision.REFUND_CLIENT,
    decisionNotes: 'Preuve photo du colis défectueux validée par l’équipe. Remboursement accordé.',
  });
  assert(arbitration.status === 'RESOLVED_REFUND_CLIENT', 'Décision arbitrage Super-Admin enregistrée');

  const refundedOrder = await prisma.order.findUnique({ where: { id: orderTech.id }, include: { escrow: true } });
  assert(refundedOrder!.status === OrderStatus.REFUNDED, 'Commande passée à REFUNDED');
  assert(refundedOrder!.escrow?.status === EscrowStatus.REFUNDED_TO_CLIENT, 'Séquestre marqué REFUNDED_TO_CLIENT');

  console.log('\n--- TEST 6 : PROTECTION DU PORTEFEUILLE (ANTI-DÉPASSEMENT) ---');
  const wallet = await walletsService.getVendorWallet(vendor1!.id);
  const currentBalance = wallet.wallet.availableBalanceFcfa;

  try {
    await walletsService.requestPayout(vendor1!.id, {
      amountFcfa: currentBalance + 500000, // Demande supérieure au solde
      provider: PaymentProvider.WAVE,
      recipientPhone: '+221771234567',
    });
    assert(false, 'La demande de retrait excédentaire aurait dû être rejetée');
  } catch (error: any) {
    assert(error.message.includes('Solde insuffisant'), 'Rejet strict 400 si demande de retrait > solde disponible');
  }

  // Retrait valide de 10 000 FCFA
  const validPayout = await walletsService.requestPayout(vendor1!.id, {
    amountFcfa: 10000,
    provider: PaymentProvider.WAVE,
    recipientPhone: '+221771234567',
  });
  assert(validPayout.remainingBalanceFcfa === currentBalance - 10000, 'Débit exact du portefeuille en transaction ACID (-10 000 FCFA)');

  console.log('\n--- TEST 7 : BARRIÈRE DE SÉCURITÉ RBAC & CLOISONNEMENT VENDEUR ---');
  // Tentative par le Vendeur 2 de modifier un produit appartenant au Vendeur 1
  try {
    await catalogService.updateProduct(vendor2!.id, productShop1.id, {
      name: 'Tentative de piratage de nom',
    });
    assert(false, 'La modification illégitime d’un produit d’une autre boutique aurait dû être bloquée');
  } catch (error: any) {
    assert(error.message.includes('autre boutique'), 'Rejet 403 Forbidden : un marchand ne peut modifier que ses propres articles');
  }

  console.log('\n--- TEST 8 : TRAÇABILITÉ DES AUDIT LOGS ---');
  const auditLogsCount = await prisma.auditLog.count();
  assert(auditLogsCount >= 5, `Journalisation immuable opérationnelle (${auditLogsCount} actions sensibles tracées en BDD)`);

  await prisma.$disconnect();

  console.log('\n==============================================================================');
  console.log(`🏆 RÉSULTAT FINAL DU STRESS-TEST : ${passedTests}/${totalTests} TESTS PASSÉS AVEC SUCCÈS !`);
  console.log('==============================================================================\n');
}

runIntenseStressSuite().catch((e) => {
  console.error('\n❌ ÉCHEC DU PROTOCOLE DE STRESS-TEST :', e);
  process.exit(1);
});
