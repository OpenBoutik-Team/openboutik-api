import { Test, TestingModule } from '@nestjs/testing';
import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { DisputesService } from './disputes.service';
import { PrismaService } from '../prisma/prisma.service';
import {
  OrderStatus,
  EscrowStatus,
  DisputeStatus,
} from '../generated/prisma/client';
import { DisputeDecision } from './dto/arbitrate-dispute.dto';

describe('DisputesService (Unit Tests)', () => {
  let service: DisputesService;
  let mockPrismaService: {
    order: { findUnique: jest.Mock; update: jest.Mock; updateMany: jest.Mock };
    escrowTransaction: { update: jest.Mock; updateMany: jest.Mock };
    dispute: {
      findUnique: jest.Mock;
      findMany: jest.Mock;
      create: jest.Mock;
      update: jest.Mock;
    };
    vendorWallet: { update: jest.Mock };
    auditLog: { create: jest.Mock };
    $transaction: jest.Mock;
  };

  const mockOrder = {
    id: 'order-uuid-1',
    orderNumber: 'OB-2026-4012',
    clientId: 'client-uuid-1',
    shopId: 'shop-uuid-1',
    totalAmountFcfa: 35000,
    netVendorAmountFcfa: 33950,
    status: OrderStatus.PAID_PENDING_DELIVERY,
    escrow: {
      id: 'escrow-uuid-1',
      status: EscrowStatus.HELD_IN_ESCROW,
    },
    dispute: null,
  };

  beforeEach(async () => {
    mockPrismaService = {
      order: {
        findUnique: jest.fn(),
        update: jest.fn(),
        updateMany: jest.fn(),
      },
      escrowTransaction: {
        update: jest.fn(),
        updateMany: jest.fn(),
      },
      dispute: {
        findUnique: jest.fn(),
        findMany: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
      vendorWallet: {
        update: jest.fn(),
      },
      auditLog: {
        create: jest.fn(),
      },
      $transaction: jest.fn((callback) => callback(mockPrismaService)),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DisputesService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get<DisputesService>(DisputesService);
  });

  describe('Ouverture de Litige & Gel de Séquestre', () => {
    it('doit rejeter l’ouverture de litige si la commande n’existe pas', async () => {
      mockPrismaService.order.findUnique.mockResolvedValue(null);

      await expect(
        service.openDispute('client-uuid-1', 'inconnu', {
          reason: 'Colis non reçu',
        }),
      ).rejects.toThrow(NotFoundException);
    });

    it('doit bloquer l’ouverture de litige si l’utilisateur n’est pas l’acheteur (IDOR client)', async () => {
      mockPrismaService.order.findUnique.mockResolvedValue(mockOrder);

      // Client pirate tente d'ouvrir un litige sur la commande de client-uuid-1
      await expect(
        service.openDispute('client-pirate-99', 'order-uuid-1', {
          reason: 'Produit contrefait',
        }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('doit refuser d’ouvrir un litige si la commande est déjà confirmée livrée', async () => {
      mockPrismaService.order.findUnique.mockResolvedValue({
        ...mockOrder,
        status: OrderStatus.DELIVERED_CONFIRMED,
      });

      await expect(
        service.openDispute('client-uuid-1', 'order-uuid-1', {
          reason: 'Réclamation tardive',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('doit geler immédiatement le séquestre et marquer la commande DISPUTED', async () => {
      mockPrismaService.order.findUnique.mockResolvedValue(mockOrder);
      mockPrismaService.order.updateMany.mockResolvedValue({ count: 1 });
      mockPrismaService.escrowTransaction.updateMany.mockResolvedValue({ count: 1 });
      mockPrismaService.dispute.create.mockResolvedValue({
        id: 'dispute-uuid-1',
        orderId: 'order-uuid-1',
        status: DisputeStatus.OPEN,
      });
      mockPrismaService.auditLog.create.mockResolvedValue({ id: 'log-1' });

      const dispute = await service.openDispute('client-uuid-1', 'order-uuid-1', {
        reason: 'Article non conforme reçu à la Médina',
      });

      expect(dispute.id).toBe('dispute-uuid-1');
      expect(mockPrismaService.order.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ id: 'order-uuid-1' }),
          data: { status: OrderStatus.DISPUTED },
        }),
      );
      expect(mockPrismaService.escrowTransaction.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            orderId: 'order-uuid-1',
            status: EscrowStatus.HELD_IN_ESCROW,
          }),
          data: expect.objectContaining({
            status: EscrowStatus.FROZEN_BY_DISPUTE,
          }),
        }),
      );
    });
  });

  describe('Arbitrage Super-Admin', () => {
    const mockOpenDispute = {
      id: 'dispute-1',
      orderId: 'order-1',
      status: DisputeStatus.OPEN,
      order: {
        id: 'order-1',
        orderNumber: 'OB-2026-4012',
        shopId: 'shop-1',
        totalAmountFcfa: 50000,
        netVendorAmountFcfa: 48000,
        escrow: { id: 'escrow-1', status: EscrowStatus.FROZEN_BY_DISPUTE },
      },
    };

    it('doit arbitrer en faveur du client (remboursement intégral)', async () => {
      mockPrismaService.dispute.findUnique.mockResolvedValue(mockOpenDispute);
      mockPrismaService.dispute.update.mockResolvedValue({
        id: 'dispute-1',
        status: DisputeStatus.RESOLVED_REFUND_CLIENT,
      });
      mockPrismaService.order.update.mockResolvedValue({});
      mockPrismaService.escrowTransaction.update.mockResolvedValue({});
      mockPrismaService.vendorWallet.update.mockResolvedValue({});
      mockPrismaService.auditLog.create.mockResolvedValue({});

      const result = await service.arbitrateDispute('super-admin-1', 'dispute-1', {
        decision: DisputeDecision.REFUND_CLIENT,
        decisionNotes: 'Le vendeur a reconnu l’erreur d’expédition.',
      });

      expect(result.status).toBe(DisputeStatus.RESOLVED_REFUND_CLIENT);
      expect(mockPrismaService.order.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'order-1' },
          data: { status: OrderStatus.REFUNDED },
        }),
      );
      expect(mockPrismaService.escrowTransaction.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { orderId: 'order-1' },
          data: expect.objectContaining({
            status: EscrowStatus.REFUNDED_TO_CLIENT,
          }),
        }),
      );
      expect(mockPrismaService.vendorWallet.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { shopId: 'shop-1' },
          data: { escrowBalanceFcfa: { decrement: 48000 } },
        }),
      );
    });

    it('doit arbitrer en faveur du marchand (libération du séquestre)', async () => {
      mockPrismaService.dispute.findUnique.mockResolvedValue(mockOpenDispute);
      mockPrismaService.dispute.update.mockResolvedValue({
        id: 'dispute-1',
        status: DisputeStatus.RESOLVED_RELEASE_VENDOR,
      });
      mockPrismaService.order.update.mockResolvedValue({});
      mockPrismaService.escrowTransaction.update.mockResolvedValue({});
      mockPrismaService.vendorWallet.update.mockResolvedValue({});
      mockPrismaService.auditLog.create.mockResolvedValue({});

      const result = await service.arbitrateDispute('super-admin-1', 'dispute-1', {
        decision: DisputeDecision.RELEASE_VENDOR,
        decisionNotes: 'Preuve de livraison fournie par le livreur Tiak-Tiak.',
      });

      expect(result.status).toBe(DisputeStatus.RESOLVED_RELEASE_VENDOR);
      expect(mockPrismaService.order.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'order-1' },
          data: expect.objectContaining({
            status: OrderStatus.DELIVERED_CONFIRMED,
          }),
        }),
      );
      expect(mockPrismaService.escrowTransaction.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { orderId: 'order-1' },
          data: expect.objectContaining({
            status: EscrowStatus.RELEASED_TO_VENDOR,
          }),
        }),
      );
    });
  });
});
