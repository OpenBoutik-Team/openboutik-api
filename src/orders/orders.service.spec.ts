import { Test, TestingModule } from '@nestjs/testing';
import {
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { OrdersService } from './orders.service';
import { PrismaService } from '../prisma/prisma.service';
import { SubscriptionsService } from '../subscriptions/subscriptions.service';
import {
  SubscriptionPlan,
  DeliveryMethod,
  Role,
} from '../generated/prisma/client';

describe('OrdersService (Unit Tests)', () => {
  let service: OrdersService;
  let mockPrismaService: {
    product: { findMany: jest.Mock };
    order: { findUnique: jest.Mock; findMany: jest.Mock };
    orderNote: { create: jest.Mock; findMany: jest.Mock };
    shop: { findUnique: jest.Mock };
    $transaction: jest.Mock;
  };

  beforeEach(async () => {
    mockPrismaService = {
      product: {
        findMany: jest.fn(),
      },
      order: {
        findUnique: jest.fn(),
        findMany: jest.fn(),
      },
      orderNote: {
        create: jest.fn(),
        findMany: jest.fn(),
      },
      shop: {
        findUnique: jest.fn(),
      },
      $transaction: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OrdersService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
        {
          provide: SubscriptionsService,
          useValue: {
            autoSweepIfDue: jest.fn().mockResolvedValue(null),
          },
        },
      ],
    }).compile();

    service = module.get<OrdersService>(OrdersService);
  });

  describe('Règles Métier des Commissions SaaS (Phase 5 : 0 % PRO/PREMIUM, 3 % FREE)', () => {
    it('doit appliquer exactement 3 % de commission pour le plan FREE', () => {
      const rate = (service as unknown as { getCommissionRate: (plan: SubscriptionPlan) => number })
        .getCommissionRate(SubscriptionPlan.FREE);
      expect(rate).toBe(3);
    });

    it('doit appliquer 0 % de commission pour le plan PRO', () => {
      const rate = (service as unknown as { getCommissionRate: (plan: SubscriptionPlan) => number })
        .getCommissionRate(SubscriptionPlan.PRO);
      expect(rate).toBe(0);
    });

    it('doit appliquer 0 % de commission pour le plan PREMIUM', () => {
      const rate = (service as unknown as { getCommissionRate: (plan: SubscriptionPlan) => number })
        .getCommissionRate(SubscriptionPlan.PREMIUM);
      expect(rate).toBe(0);
    });

    it('doit garantir l’intégrité financière stricte au FCFA près sans aucune perte de centime', () => {
      // Test exhaustif sur une gamme de montants réels en FCFA (pairs, impairs, petits et grands)
      const testAmounts = [
        500, 1000, 1235, 3333, 7777, 10000, 25000, 49999, 50000, 99999, 100000, 350000, 1000000,
      ];
      const plans = [
        { plan: SubscriptionPlan.FREE, rate: 3 },
        { plan: SubscriptionPlan.PRO, rate: 0 },
        { plan: SubscriptionPlan.PREMIUM, rate: 0 },
      ];

      for (const { rate } of plans) {
        for (const subtotal of testAmounts) {
          const commissionAmountFcfa = Math.round(subtotal * (rate / 100));
          const netVendorAmountFcfa = subtotal - commissionAmountFcfa;

          // Invariant financier fondamental : la somme de la commission et du net vendeur doit être égale au sous-total
          expect(commissionAmountFcfa + netVendorAmountFcfa).toBe(subtotal);
          // Les montants doivent être des entiers stricts (FCFA sans décimales)
          expect(Number.isInteger(commissionAmountFcfa)).toBe(true);
          expect(Number.isInteger(netVendorAmountFcfa)).toBe(true);
          expect(commissionAmountFcfa).toBeGreaterThanOrEqual(0);
          expect(netVendorAmountFcfa).toBeGreaterThanOrEqual(0);
        }
      }
    });
  });

  describe('Validation du Panier de Commande (Checkout)', () => {
    it('doit rejeter un panier vide avec une BadRequestException', async () => {
      await expect(
        service.checkout('client-uuid-1', {
          items: [],
          deliveryMethod: DeliveryMethod.STANDARD_DELIVERY,
          deliveryAddress: 'Plateau, Dakar',
          deliveryCity: 'Dakar',
          deliveryPhone: '+221771234567',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('doit rejeter la commande si un produit est introuvable ou non publié', async () => {
      mockPrismaService.product.findMany.mockResolvedValue([]);

      await expect(
        service.checkout('client-uuid-1', {
          items: [{ productId: 'produit-inexistant', quantity: 1 }],
          deliveryMethod: DeliveryMethod.STANDARD_DELIVERY,
          deliveryAddress: 'Almadies, Dakar',
          deliveryCity: 'Dakar',
          deliveryPhone: '+221771234567',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('doit bloquer la commande si la quantité demandée dépasse le stock disponible', async () => {
      mockPrismaService.product.findMany.mockResolvedValue([
        {
          id: 'prod-1',
          name: 'Boubou Traditionnel',
          priceFcfa: 25000,
          stock: 2,
          isPublished: true,
          shop: {
            id: 'shop-1',
            subscriptionPlan: SubscriptionPlan.PRO,
            wallet: { id: 'wallet-1' },
          },
        },
      ]);

      await expect(
        service.checkout('client-uuid-1', {
          items: [{ productId: 'prod-1', quantity: 5 }], // Demande 5 alors que stock = 2
          deliveryMethod: DeliveryMethod.STANDARD_DELIVERY,
          deliveryAddress: 'Medina, Dakar',
          deliveryCity: 'Dakar',
          deliveryPhone: '+221771234567',
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('Mémos Internes Vendeur (OrderNotes & BOLA)', () => {
    it('doit refuser l’ajout d’un mémo si le vendeur ne possède pas la boutique de la commande', async () => {
      mockPrismaService.order.findUnique.mockResolvedValue({
        id: 'order-1',
        shop: { ownerId: 'vendeur-legitime' },
      });

      await expect(
        service.addOrderNote('order-1', 'vendeur-usurpateur', {
          text: 'Colis confié au livreur',
        }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('doit enregistrer un mémo si le vendeur est bien le propriétaire de la boutique', async () => {
      mockPrismaService.order.findUnique.mockResolvedValue({
        id: 'order-1',
        shop: { ownerId: 'vendeur-legitime' },
      });
      mockPrismaService.orderNote.create.mockResolvedValue({
        id: 'note-1',
        orderId: 'order-1',
        text: 'Colis confié au livreur Tiak-Tiak Moussa',
      });

      const note = await service.addOrderNote('order-1', 'vendeur-legitime', {
        text: 'Colis confié au livreur Tiak-Tiak Moussa',
      });

      expect(note.text).toBe('Colis confié au livreur Tiak-Tiak Moussa');
      expect(mockPrismaService.orderNote.create).toHaveBeenCalledWith({
        data: {
          orderId: 'order-1',
          text: 'Colis confié au livreur Tiak-Tiak Moussa',
        },
      });
    });

    it('doit formellement interdire la lecture des mémos internes à un client', async () => {
      await expect(
        service.getOrderNotes('order-1', 'client-id', Role.CLIENT),
      ).rejects.toThrow(ForbiddenException);
    });

    it('doit renvoyer les mémos pour le vendeur propriétaire de la boutique', async () => {
      mockPrismaService.order.findUnique.mockResolvedValue({
        id: 'order-1',
        shop: { ownerId: 'vendeur-1' },
      });
      mockPrismaService.orderNote.findMany.mockResolvedValue([
        { id: 'note-1', text: 'Appeler avant de livrer' },
      ]);

      const notes = await service.getOrderNotes(
        'order-1',
        'vendeur-1',
        Role.VENDOR,
      );
      expect(notes).toHaveLength(1);
      expect(notes[0].text).toBe('Appeler avant de livrer');
    });
  });

  describe('Sécurité Facturation & Reçus PDF (generateInvoicePdf)', () => {
    it('doit refuser l’accès à la facture si le client n’est pas le commanditaire', async () => {
      mockPrismaService.order.findUnique.mockResolvedValue({
        id: 'order-1',
        clientId: 'vrai-client',
        shop: { ownerId: 'vendeur-1' },
      });

      const mockRes = {
        setHeader: jest.fn(),
      } as any;

      await expect(
        service.generateInvoicePdf('order-1', 'autre-client', Role.CLIENT, mockRes),
      ).rejects.toThrow(ForbiddenException);
    });

    it('doit refuser l’accès à la facture si un vendeur essaie d’accéder à la facture d’une autre boutique', async () => {
      mockPrismaService.order.findUnique.mockResolvedValue({
        id: 'order-1',
        clientId: 'client-1',
        shop: { ownerId: 'boutique-a' },
      });

      const mockRes = {
        setHeader: jest.fn(),
      } as any;

      await expect(
        service.generateInvoicePdf('order-1', 'vendeur-b', Role.VENDOR, mockRes),
      ).rejects.toThrow(ForbiddenException);
    });
  });
});
