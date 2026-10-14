import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { WalletsService } from './wallets.service';
import { PrismaService } from '../prisma/prisma.service';
import { PaymentProvider, PayoutStatus } from '../generated/prisma/client';

describe('WalletsService (Unit Tests)', () => {
  let service: WalletsService;
  let mockPrismaService: {
    shop: { findUnique: jest.Mock };
    vendorWallet: { update: jest.Mock };
    walletPayout: { create: jest.Mock };
    auditLog: { create: jest.Mock };
    $transaction: jest.Mock;
  };

  const mockShop = {
    id: 'shop-uuid-1',
    name: 'Boutique Teranga Dakar',
    ownerId: 'vendor-uuid-1',
    wallet: {
      id: 'wallet-uuid-1',
      availableBalanceFcfa: 75000,
      escrowBalanceFcfa: 120000,
      payouts: [],
    },
  };

  beforeEach(async () => {
    mockPrismaService = {
      shop: { findUnique: jest.fn() },
      vendorWallet: { update: jest.fn() },
      walletPayout: { create: jest.fn() },
      auditLog: { create: jest.fn() },
      $transaction: jest.fn((callback) => callback(mockPrismaService)),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WalletsService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get<WalletsService>(WalletsService);
  });

  describe('Consultation du Portefeuille Marchand', () => {
    it('doit retourner le solde et les décaissements du marchand', async () => {
      mockPrismaService.shop.findUnique.mockResolvedValue(mockShop);

      const result = await service.getVendorWallet('vendor-uuid-1');

      expect(result.shopId).toBe('shop-uuid-1');
      expect(result.shopName).toBe('Boutique Teranga Dakar');
      expect(result.wallet.availableBalanceFcfa).toBe(75000);
      expect(result.wallet.escrowBalanceFcfa).toBe(120000);
    });

    it('doit lever une NotFoundException si la boutique n’a aucun portefeuille associé', async () => {
      mockPrismaService.shop.findUnique.mockResolvedValue(null);

      await expect(service.getVendorWallet('inconnu')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('Demande de Retrait (Protection Anti-Dépassement & Intégrité)', () => {
    it('doit rejeter un montant de retrait négatif ou nul', async () => {
      mockPrismaService.shop.findUnique.mockResolvedValue(mockShop);

      await expect(
        service.requestPayout('vendor-uuid-1', {
          amountFcfa: 0,
          provider: PaymentProvider.WAVE,
          recipientPhone: '+221771234567',
        }),
      ).rejects.toThrow(BadRequestException);

      await expect(
        service.requestPayout('vendor-uuid-1', {
          amountFcfa: -15000,
          provider: PaymentProvider.ORANGE_MONEY,
          recipientPhone: '+221771234567',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('doit bloquer toute demande de retrait supérieure au solde disponible (anti-overdraft)', async () => {
      mockPrismaService.shop.findUnique.mockResolvedValue(mockShop);

      // Solde disponible = 75 000 FCFA, demande = 80 000 FCFA
      await expect(
        service.requestPayout('vendor-uuid-1', {
          amountFcfa: 80000,
          provider: PaymentProvider.WAVE,
          recipientPhone: '+221771234567',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('doit exécuter le retrait avec succès et déduire atomiquement le montant', async () => {
      mockPrismaService.shop.findUnique.mockResolvedValue(mockShop);
      mockPrismaService.vendorWallet.update.mockResolvedValue({
        id: 'wallet-uuid-1',
        availableBalanceFcfa: 50000, // 75 000 - 25 000
      });
      mockPrismaService.walletPayout.create.mockResolvedValue({
        id: 'payout-1',
        amountFcfa: 25000,
        provider: PaymentProvider.WAVE,
        status: PayoutStatus.PROCESSED,
      });
      mockPrismaService.auditLog.create.mockResolvedValue({ id: 'log-1' });

      const res = await service.requestPayout('vendor-uuid-1', {
        amountFcfa: 25000,
        provider: PaymentProvider.WAVE,
        recipientPhone: '+221771234567',
      });

      expect(res.payout.amountFcfa).toBe(25000);
      expect(res.remainingBalanceFcfa).toBe(50000);
      expect(mockPrismaService.vendorWallet.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'wallet-uuid-1' },
          data: { availableBalanceFcfa: { decrement: 25000 } },
        }),
      );
      expect(mockPrismaService.auditLog.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            userId: 'vendor-uuid-1',
            action: 'WALLET_PAYOUT_PROCESSED',
          }),
        }),
      );
    });
  });
});
