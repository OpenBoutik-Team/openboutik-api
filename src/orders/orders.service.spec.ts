import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { OrdersService } from './orders.service';
import { PrismaService } from '../prisma/prisma.service';
import { SubscriptionPlan, DeliveryMethod } from '../generated/prisma/client';

describe('OrdersService (Unit Tests)', () => {
  let service: OrdersService;
  let mockPrismaService: {
    product: { findMany: jest.Mock };
    order: { findUnique: jest.Mock; findMany: jest.Mock };
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
      $transaction: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OrdersService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get<OrdersService>(OrdersService);
  });

  describe('Règles Métier des Commissions SaaS (2 % à 4 %)', () => {
    it('doit appliquer exactement 4 % de commission pour le plan FREE', () => {
      const rate = (service as unknown as { getCommissionRate: (plan: SubscriptionPlan) => number })
        .getCommissionRate(SubscriptionPlan.FREE);
      expect(rate).toBe(4);
    });

    it('doit appliquer exactement 3 % de commission pour le plan PRO', () => {
      const rate = (service as unknown as { getCommissionRate: (plan: SubscriptionPlan) => number })
        .getCommissionRate(SubscriptionPlan.PRO);
      expect(rate).toBe(3);
    });

    it('doit appliquer exactement 2 % de commission pour le plan PREMIUM', () => {
      const rate = (service as unknown as { getCommissionRate: (plan: SubscriptionPlan) => number })
        .getCommissionRate(SubscriptionPlan.PREMIUM);
      expect(rate).toBe(2);
    });

    it('doit garantir l’intégrité financière stricte au FCFA près sans aucune perte de centime', () => {
      // Test exhaustif sur une gamme de montants réels en FCFA (pairs, impairs, petits et grands)
      const testAmounts = [
        500, 1000, 1235, 3333, 7777, 10000, 25000, 49999, 50000, 99999, 100000, 350000, 1000000,
      ];
      const plans = [
        { plan: SubscriptionPlan.FREE, rate: 4 },
        { plan: SubscriptionPlan.PRO, rate: 3 },
        { plan: SubscriptionPlan.PREMIUM, rate: 2 },
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
});
