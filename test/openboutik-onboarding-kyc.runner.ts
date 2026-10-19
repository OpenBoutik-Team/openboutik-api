import 'dotenv/config';
import {
  PrismaClient,
  Role,
  PaymentProvider,
  KycStatus,
  SubscriptionPlan,
} from '../src/generated/prisma/client';
import { PrismaMariaDb } from '@prisma/adapter-mariadb';
import { AuthService } from '../src/auth/auth.service';
import { UsersService } from '../src/users/users.service';
import { ShopsService } from '../src/shops/shops.service';
import { WalletsService } from '../src/wallets/wallets.service';
import { JwtService } from '@nestjs/jwt';

async function runOnboardingAndKycSuite() {
  console.log('========================================================================================');
  console.log('🇸🇳 PROTOCOLE DE TEST COMPLET : PARCOURS D’ONBOARDING VENDEUR (0 À 5) & CONFORMITÉ KYC');
  console.log('========================================================================================\n');

  const adapter = new PrismaMariaDb(process.env.DATABASE_URL || 'mysql://root:@localhost:3306/openboutik_db');
  const prisma = new PrismaClient({ adapter });

  const jwtService = new JwtService({ secret: 'openboutik_jwt_access_super_secret_local_dev_key_2026' });
  const usersService = new UsersService(prisma as any);
  const authService = new AuthService(prisma as any, usersService, jwtService);
  const shopsService = new ShopsService(prisma as any);
  const walletsService = new WalletsService(prisma as any);

  let passedTests = 0;
  let totalTests = 0;

  function assert(condition: boolean, testName: string, extra?: string) {
    totalTests++;
    if (condition) {
      passedTests++;
      console.log(`  ✅ [PASS] ${testName}${extra ? ` (${extra})` : ''}`);
    } else {
      console.error(`  ❌ [FAIL] ${testName}${extra ? ` (${extra})` : ''}`);
      throw new Error(`Échec du test : ${testName}`);
    }
  }

  // Nettoyage préalable d'éventuelles données résiduelles de test
  const testPhone = '+221779998877';
  const testEmail = 'onboarding.test@openboutik.sn';
  const existingTestUser = await prisma.user.findFirst({
    where: { OR: [{ phone: testPhone }, { email: testEmail }] },
    include: { shop: { include: { wallet: true } } },
  });

  if (existingTestUser) {
    if (existingTestUser.shop) {
      if (existingTestUser.shop.wallet) {
        await prisma.walletPayout.deleteMany({ where: { walletId: existingTestUser.shop.wallet.id } });
        await prisma.vendorWallet.delete({ where: { id: existingTestUser.shop.wallet.id } });
      }
      await prisma.shop.delete({ where: { id: existingTestUser.shop.id } });
    }
    await prisma.user.delete({ where: { id: existingTestUser.id } });
  }

  const superAdmin = await prisma.user.findFirst({ where: { role: Role.SUPER_ADMIN } });
  assert(!!superAdmin, 'Super-Admin disponible pour arbitrage KYC');

  // ==========================================================================
  // ÉPREUVE 1 : ÉTAPE 0 — INSCRIPTION VENDEUR & ACCEPTATION CGU
  // ==========================================================================
  console.log('\n--- 1. ÉTAPE 0 : INSCRIPTION VENDEUR & ACCEPTATION DES CGU & SÉQUESTRE ---');

  // 1.1 Rejet si acceptTerms !== true
  try {
    await authService.registerVendor({
      phone: testPhone,
      fullName: 'Ibrahima Fall',
      email: testEmail,
      password: 'Passer123!',
      acceptTerms: false as any,
    });
    assert(false, 'Rejet si acceptTerms !== true');
  } catch (err: any) {
    assert(err.status === 400, 'Rejet 400 Bad Request si les conditions générales ne sont pas acceptées');
  }

  // 1.2 Inscription réussie avec acceptTerms = true
  const registerResult = await authService.registerVendor({
    phone: testPhone,
    fullName: 'Ibrahima Fall',
    email: testEmail,
    password: 'Passer123!',
    acceptTerms: true,
  });

  const vendorId = registerResult.user.id;
  assert(!!vendorId, 'Compte Vendeur créé avec succès', `ID: ${vendorId}`);

  // Vérification de l'enregistrement de acceptedTermsAt en BDD
  const createdUser = await prisma.user.findUnique({ where: { id: vendorId } });
  assert(
    !!createdUser?.acceptedTermsAt,
    'Horodatage contractuel acceptedTermsAt correctement persisté en base MySQL',
    createdUser?.acceptedTermsAt?.toISOString(),
  );

  // ==========================================================================
  // ÉPREUVE 2 : VÉRIFICATION EN TEMPS RÉEL DE LA DISPONIBILITÉ DU SLUG
  // ==========================================================================
  console.log('\n--- 2. VÉRIFICATION DU SLUG DE BOUTIQUE (checkSlugAvailability) ---');

  // 2.1 Slug déjà pris (ex: teranga-mode de Moussa Diop)
  const existingSlugCheck = await shopsService.checkSlugAvailability('teranga-mode');
  assert(existingSlugCheck.available === false, 'Détection du slug déjà réservé "teranga-mode"');
  assert(
    typeof existingSlugCheck.suggestion === 'string' && existingSlugCheck.suggestion.startsWith('teranga-mode-'),
    'Suggestion alternative automatique générée',
    existingSlugCheck.suggestion,
  );

  // 2.2 Slug disponible
  const newSlugCheck = await shopsService.checkSlugAvailability('fall-couture-dakar');
  assert(newSlugCheck.available === true, 'Validation de la disponibilité du nouveau slug "fall-couture-dakar"');

  // ==========================================================================
  // ÉPREUVE 3 : CONSULTATION DE L’ÉTAT D’ONBOARDING INITIAL (GET /shops/me/onboarding)
  // ==========================================================================
  console.log('\n--- 3. ÉTAT D’ONBOARDING INITIAL & REPRISE MULTI-APPAREILS ---');

  const initialStatus = await shopsService.getOnboardingStatus(vendorId);
  assert(initialStatus.hasShop === false, 'hasShop = false avant initialisation de l’identité');
  assert(initialStatus.onboardingStep === 1, 'Étape d’onboarding initialement positionnée à 1');
  assert(initialStatus.checklist.hasCompletedOnboarding === false, 'Checklist : hasCompletedOnboarding = false');

  // ==========================================================================
  // ÉPREUVE 4 : ÉTAPE 1 — IDENTITÉ DE LA BOUTIQUE (OBLIGATOIRE)
  // ==========================================================================
  console.log('\n--- 4. ÉTAPE 1 : IDENTITÉ DE LA BOUTIQUE & CRÉATION DU WALLET ---');

  // 4.1 Rejet si slug déjà réservé par un tiers
  try {
    await shopsService.saveOnboardingStep(vendorId, 1, {
      name: 'Teranga Mode Copie',
      slug: 'teranga-mode',
      mainCategory: 'Mode & Prêt-à-porter',
    });
    assert(false, 'Rejet slug doublon');
  } catch (err: any) {
    assert(err.status === 409, 'Rejet 409 Conflict si le slug appartient déjà à un autre marchand');
  }

  // 4.2 Enregistrement réussi de l'étape 1
  const step1Result = await shopsService.saveOnboardingStep(vendorId, 1, {
    name: 'Fall Couture Médina',
    slug: 'fall-couture-medina',
    description: 'Confection artisanale de boubous et broderies de luxe à Dakar',
    mainCategory: 'Mode & Prêt-à-porter',
    city: 'Dakar',
  });

  assert(step1Result.hasShop === true, 'Boutique créée en base de données');
  assert(step1Result.onboardingStep === 2, 'Progression automatique vers l’étape 2');
  assert(step1Result.shop.mainCategory === 'Mode & Prêt-à-porter', 'Catégorie principale sauvegardée');

  // Vérification de la création du portefeuille
  const walletCheck = await prisma.vendorWallet.findUnique({
    where: { shopId: step1Result.shop.id },
  });
  assert(!!walletCheck && walletCheck.availableBalanceFcfa === 0, 'Portefeuille marchand initialisé à 0 FCFA');

  // ==========================================================================
  // ÉPREUVE 5 : RÈGLE MVP « 1 VENDEUR = 1 BOUTIQUE »
  // ==========================================================================
  console.log('\n--- 5. RÈGLE MVP : INTERDICTION D’UNE 2ÈME BOUTIQUE (1 Vendeur = 1 Boutique) ---');

  try {
    await shopsService.createShop(vendorId, {
      name: 'Deuxième Boutique Interdite',
      slug: 'deuxieme-boutique-interdite',
      mainCategory: 'Électronique',
    });
    assert(false, 'Création 2ème boutique');
  } catch (err: any) {
    assert(
      err.status === 409,
      'Rejet 409 Conflict conforme à la règle MVP « 1 Vendeur = 1 Boutique »',
      err.message,
    );
  }

  // ==========================================================================
  // ÉPREUVE 6 : ÉTAPE 2 — APPARENCE (OPTIONNELLE / SAUTÉE)
  // ==========================================================================
  console.log('\n--- 6. ÉTAPE 2 : APPARENCE (SAUT D’ÉTAPE AVEC { skip: true }) ---');

  const step2Result = await shopsService.saveOnboardingStep(vendorId, 2, { skip: true });
  assert(step2Result.onboardingStep === 3, 'Étape 2 sautée avec succès -> Passage à l’étape 3');
  assert(step2Result.shop.primaryColor === '#10B981', 'Couleur par défaut (#10B981) préservée');

  // ==========================================================================
  // ÉPREUVE 7 : ÉTAPE 3 — CONTACT SOCIAL COMMERCE (OBLIGATOIRE)
  // ==========================================================================
  console.log('\n--- 7. ÉTAPE 3 : CONTACT SOCIAL COMMERCE WHATSAPP ---');

  // 7.1 Rejet numéro invalide
  try {
    await shopsService.saveOnboardingStep(vendorId, 3, { whatsappNumber: '0612345678' });
    assert(false, 'Rejet numéro non sénégalais');
  } catch (err: any) {
    assert(err.status === 400, 'Rejet 400 si le numéro WhatsApp n’est pas au format +221XXXXXXXXX');
  }

  // 7.2 Validation numéro sénégalais
  const step3Result = await shopsService.saveOnboardingStep(vendorId, 3, {
    whatsappNumber: '+221774443322',
  });
  assert(step3Result.onboardingStep === 4, 'WhatsApp enregistré -> Passage à l’étape 4');
  assert(step3Result.shop.whatsappNumber === '+221774443322', 'Numéro WhatsApp bien associé');

  // ==========================================================================
  // ÉPREUVE 8 : ÉTAPE 4 — PAIEMENTS SÉQUESTRE & TITULAIRE DU COMPTE
  // ==========================================================================
  console.log('\n--- 8. ÉTAPE 4 : RÉCEPTION PAIEMENTS & VALIDATION DU TITULAIRE ---');

  // 8.1 Rejet si nom du titulaire manquant
  try {
    await shopsService.saveOnboardingStep(vendorId, 4, {
      waveNumber: '+221774443322',
      payoutHolderName: '',
    });
    assert(false, 'Rejet si titulaire manquant');
  } catch (err: any) {
    assert(err.status === 400, 'Rejet 400 : Le nom complet du titulaire (payoutHolderName) est obligatoire');
  }

  // 8.2 Enregistrement réussi Étape 4 -> Activation de la boutique
  const step4Result = await shopsService.saveOnboardingStep(vendorId, 4, {
    waveNumber: '+221774443322',
    omNumber: '+221764443322',
    payoutHolderName: 'Ibrahima Fall',
  });

  assert(step4Result.onboardingStep === 5, 'Passage à l’étape 5');
  assert(step4Result.onboardingCompleted === true, 'Onboarding marqué comme complété (Étapes 1, 3, 4 validées)');
  assert(step4Result.shop.isActive === true, 'Boutique activée et visible sur la marketplace');
  assert(step4Result.shop.isVerified === false, 'isVerified reste false tant que le Super-Admin n’a pas certifié');

  // ==========================================================================
  // ÉPREUVE 9 : ÉTAPE 5 — CHOIX DU PLAN SAAS
  // ==========================================================================
  console.log('\n--- 9. ÉTAPE 5 : CHOIX DU PLAN SAAS (PASSAGE EN PREMIUM - COMMISSION 2 %) ---');

  const step5Result = await shopsService.saveOnboardingStep(vendorId, 5, {
    plan: SubscriptionPlan.PREMIUM,
  });
  assert(step5Result.shop.subscriptionPlan === SubscriptionPlan.PREMIUM, 'Plan SaaS mis à jour en PREMIUM');
  assert(step5Result.checklist.hasCompletedOnboarding === true, 'Checklist : Onboarding 100 % finalisé');

  // ==========================================================================
  // ÉPREUVE 10 : VERROUILLAGE FINANCIER KYC SUR LES RETRAITS (RÈGLE 4)
  // ==========================================================================
  console.log('\n--- 10. SÉCURITÉ FINANCIÈRE : BLOCAGE DU RETRAIT TANT QUE LE KYC N’EST PAS VÉRIFIÉ ---');

  // Crédit de 50 000 FCFA sur le solde disponible pour simuler des ventes livrées
  await prisma.vendorWallet.update({
    where: { shopId: step5Result.shop.id },
    data: { availableBalanceFcfa: 50000 },
  });

  // Tentative de retrait sans KYC
  try {
    await walletsService.requestPayout(vendorId, {
      amountFcfa: 25000,
      provider: PaymentProvider.WAVE,
      recipientPhone: '+221774443322',
    });
    assert(false, 'Retrait sans KYC');
  } catch (err: any) {
    assert(
      err.status === 403,
      'Rejet 403 Forbidden strict : Retrait bloqué tant que le KYC (CNI) n’est pas certifié',
      err.message,
    );
  }

  // ==========================================================================
  // ÉPREUVE 11 : SOUMISSION DE LA CNI PAR LE MARCHAND (POST /shops/me/kyc)
  // ==========================================================================
  console.log('\n--- 11. SOUMISSION DU DOSSIER CNI PAR LE VENDEUR ---');

  const kycSubmission = await shopsService.submitKyc(vendorId, {
    idCardNumber: '1 758 1992 00147',
    idCardUrl: 'https://storage.openboutik.sn/kyc/cni-ibrahima-fall.jpg',
  });

  assert(kycSubmission.kycStatus === KycStatus.PENDING, 'Statut KYC passé en PENDING');
  assert(!!kycSubmission.kycSubmittedAt, 'Date de soumission kycSubmittedAt horodatée');

  // Retrait toujours bloqué en PENDING
  try {
    await walletsService.requestPayout(vendorId, {
      amountFcfa: 25000,
      provider: PaymentProvider.WAVE,
      recipientPhone: '+221774443322',
    });
    assert(false, 'Retrait en PENDING');
  } catch (err: any) {
    assert(err.status === 403, 'Retrait toujours bloqué tant que le statut reste PENDING');
  }

  // ==========================================================================
  // ÉPREUVE 12 : ARBITRAGE & VALIDATION KYC PAR LE SUPER-ADMIN (PATCH /admin/shops/:id/kyc)
  // ==========================================================================
  console.log('\n--- 12. ARBITRAGE KYC PAR LE SUPER-ADMIN & TRACE D’AUDIT ---');

  const kycApproved = await shopsService.reviewKyc(
    step5Result.shop.id,
    { status: KycStatus.VERIFIED, verifyShopBadge: true },
    superAdmin!.id,
  );

  assert(kycApproved.kycStatus === KycStatus.VERIFIED, 'Statut KYC passé en VERIFIED');
  assert(kycApproved.isVerified === true, 'Badge Marchand Vérifié attribué automatiquement à la boutique');

  // Vérification de la trace immuable dans AuditLog
  const auditLogEntry = await prisma.auditLog.findFirst({
    where: { entityId: step5Result.shop.id, action: 'KYC_VERIFIED' },
    orderBy: { createdAt: 'desc' },
  });
  assert(!!auditLogEntry && auditLogEntry.userId === superAdmin!.id, 'Journal d’audit KYC_VERIFIED certifié');

  // ==========================================================================
  // ÉPREUVE 13 : DÉBLOCAGE DU RETRAIT APRÈS VALIDATION KYC
  // ==========================================================================
  console.log('\n--- 13. DÉBLOCAGE DU RETRAIT APRÈS CERTIFICATION KYC ---');

  const payoutSuccess = await walletsService.requestPayout(vendorId, {
    amountFcfa: 25000,
    provider: PaymentProvider.WAVE,
    recipientPhone: '+221774443322',
  });

  assert(payoutSuccess.payout.amountFcfa === 25000, 'Retrait de 25 000 FCFA exécuté avec succès');
  assert(payoutSuccess.remainingBalanceFcfa === 25000, 'Solde restant exact (50 000 - 25 000 = 25 000 FCFA)');

  // Nettoyage après test
  await prisma.auditLog.deleteMany({ where: { entityId: step5Result.shop.id } });
  await prisma.walletPayout.deleteMany({ where: { walletId: walletCheck!.id } });
  await prisma.vendorWallet.delete({ where: { id: walletCheck!.id } });
  await prisma.shop.delete({ where: { id: step5Result.shop.id } });
  await prisma.user.delete({ where: { id: vendorId } });

  console.log('\n========================================================================================');
  console.log(`🎉 SUITE TERMINÉE : ${passedTests} / ${totalTests} ASSERTIONS VALIDÉES AVEC SUCCÈS (100 %) !`);
  console.log('========================================================================================\n');
  await prisma.$disconnect();
  process.exit(0);
}

runOnboardingAndKycSuite()
  .catch((err) => {
    console.error('Erreur critique pendant la suite de test :', err);
    process.exit(1);
  });
