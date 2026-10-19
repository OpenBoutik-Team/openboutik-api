import { Test, TestingModule } from '@nestjs/testing';
import {
  SubscriptionNotificationService,
  DunningNotificationPayload,
} from './subscription-notification.service';
import { SubscriptionPlan } from '../generated/prisma/client';

describe('SubscriptionNotificationService — Alertes Dunning WhatsApp & SMS', () => {
  let service: SubscriptionNotificationService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [SubscriptionNotificationService],
    }).compile();

    service = module.get<SubscriptionNotificationService>(
      SubscriptionNotificationService,
    );
  });

  it('1. Doit formater et expédier la notification de renouvellement réussi (Succès)', async () => {
    const payload: DunningNotificationPayload = {
      shopId: 'shop-123',
      shopName: 'Dakar Chic Boutique',
      recipientPhone: '+221771234567',
      plan: SubscriptionPlan.PRO,
      amountFcfa: 5000,
      availableBalanceFcfa: 45000,
      nextPeriodEnd: new Date('2026-11-19T00:00:00Z'),
    };

    const res = await service.notifyRenewalSuccess(payload);

    expect(res.channel).toBe('MULTI_CHANNEL');
    expect(res.recipientPhone).toBe('+221771234567');
    expect(res.whatsappMessage).toContain('Renouvellement Réussi');
    expect(res.whatsappMessage).toContain('Dakar Chic Boutique');
    expect(res.whatsappMessage).toContain('5 000 FCFA');
    expect(res.smsMessage).toContain('5000 FCFA');
    expect(res.whatsappDirectUrl).toContain('wa.me/221771234567');
  });

  it('2. Doit formater l’alerte de solde insuffisant avec 72h de grâce (Tentatives 1 à 3)', async () => {
    const payload: DunningNotificationPayload = {
      shopId: 'shop-123',
      shopName: 'Touba Tech Express',
      recipientPhone: '+221781234567',
      plan: SubscriptionPlan.PREMIUM,
      amountFcfa: 15000,
      availableBalanceFcfa: 2000,
      missingAmountFcfa: 13000,
      attemptNumber: 1,
      gracePeriodEndsAt: new Date('2026-10-22T20:00:00Z'),
    };

    const res = await service.notifyInsufficientFundsGracePeriod(payload);

    expect(res.whatsappMessage).toContain('Alerte Renouvellement');
    expect(res.whatsappMessage).toMatch(/13[\s\u202F]?000 FCFA/);
    expect(res.whatsappMessage).toContain('Période de grâce');
    expect(res.smsMessage).toContain('Wave/OM');
    expect(res.whatsappDirectUrl).toContain('wa.me/221781234567');
  });

  it('3. Doit formater le rappel d’urgence 24h avant coupure du site (Tentatives 4 & 5)', async () => {
    const payload: DunningNotificationPayload = {
      shopId: 'shop-123',
      shopName: 'Touba Tech Express',
      recipientPhone: '+221781234567',
      plan: SubscriptionPlan.PREMIUM,
      amountFcfa: 15000,
      availableBalanceFcfa: 2000,
      missingAmountFcfa: 13000,
      attemptNumber: 5,
    };

    const res = await service.notifyGraceExpiringUrgent(payload);

    expect(res.whatsappMessage).toContain('DERNIER RAPPEL — Coupure dans 24h');
    expect(res.whatsappMessage).toMatch(/13[\s\u202F]?000 FCFA/);
    expect(res.smsMessage).toContain('[OpenBoutik URGENT]');
  });

  it('4. Doit formater l’avis de suspension et de rétrogradation au Forfait Gratuit (Tentative 6)', async () => {
    const payload: DunningNotificationPayload = {
      shopId: 'shop-123',
      shopName: 'Dakar Chic Boutique',
      recipientPhone: '+221771234567',
      plan: SubscriptionPlan.PRO,
      amountFcfa: 5000,
      availableBalanceFcfa: 500,
      attemptNumber: 6,
    };

    const res = await service.notifyDowngradeSuspension(payload);

    expect(res.whatsappMessage).toContain('Suspension du Site Dédié & Rétrogradation');
    expect(res.whatsappMessage).toContain('Forfait Gratuit');
    expect(res.whatsappMessage).toContain('3 % s\'applique');
    expect(res.smsMessage).toContain('Delai de grace expire');
  });
});
