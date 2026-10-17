import { Test, TestingModule } from '@nestjs/testing';
import {
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { CouponsService } from './coupons.service';
import { PrismaService } from '../prisma/prisma.service';
import { CouponType } from '../generated/prisma/client';

describe('CouponsService (Marketing & Codes Promo Unit Tests)', () => {
  let service: CouponsService;
  let mockPrismaService: {
    shop: {
      findUnique: jest.Mock;
    };
    coupon: {
      findUnique: jest.Mock;
      findMany: jest.Mock;
      create: jest.Mock;
      update: jest.Mock;
      delete: jest.Mock;
    };
  };

  const mockShop = {
    id: 'shop-uuid-1',
    ownerId: 'user-vendor-1',
    name: 'Boutique Sandaga',
    slug: 'boutique-sandaga',
  };

  beforeEach(async () => {
    mockPrismaService = {
      shop: {
        findUnique: jest.fn(),
      },
      coupon: {
        findUnique: jest.fn(),
        findMany: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CouponsService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get<CouponsService>(CouponsService);
  });

  describe('Création de Codes Promotionnels (createCoupon)', () => {
    it('doit refuser la création si l’utilisateur n’a pas de boutique', async () => {
      mockPrismaService.shop.findUnique.mockResolvedValue(null);

      await expect(
        service.createCoupon('user-no-shop', {
          code: 'TABASKI20',
          type: CouponType.PERCENTAGE,
          value: 20,
          expiryDate: new Date(Date.now() + 86400000).toISOString(),
        }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('doit refuser un code déjà existant pour la même boutique', async () => {
      mockPrismaService.shop.findUnique.mockResolvedValue(mockShop);
      mockPrismaService.coupon.findUnique.mockResolvedValue({
        id: 'coupon-1',
        code: 'TABASKI20',
      });

      await expect(
        service.createCoupon('user-vendor-1', {
          code: 'tabaski20',
          type: CouponType.PERCENTAGE,
          value: 20,
          expiryDate: new Date(Date.now() + 86400000).toISOString(),
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('doit refuser un pourcentage supérieur à 90%', async () => {
      mockPrismaService.shop.findUnique.mockResolvedValue(mockShop);
      mockPrismaService.coupon.findUnique.mockResolvedValue(null);

      await expect(
        service.createCoupon('user-vendor-1', {
          code: 'ABUSE99',
          type: CouponType.PERCENTAGE,
          value: 99,
          expiryDate: new Date(Date.now() + 86400000).toISOString(),
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('doit refuser un montant fixe inférieur à 100 FCFA', async () => {
      mockPrismaService.shop.findUnique.mockResolvedValue(mockShop);
      mockPrismaService.coupon.findUnique.mockResolvedValue(null);

      await expect(
        service.createCoupon('user-vendor-1', {
          code: 'PETIT50',
          type: CouponType.FIXED_FCFA,
          value: 50,
          expiryDate: new Date(Date.now() + 86400000).toISOString(),
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('doit créer avec succès un code promo pourcentage valide en majuscules', async () => {
      mockPrismaService.shop.findUnique.mockResolvedValue(mockShop);
      mockPrismaService.coupon.findUnique.mockResolvedValue(null);

      const futureDate = new Date(Date.now() + 86400000 * 30);
      mockPrismaService.coupon.create.mockResolvedValue({
        id: 'coupon-new',
        shopId: mockShop.id,
        code: 'TABASKI20',
        type: CouponType.PERCENTAGE,
        value: 20,
        expiryDate: futureDate,
        maxUses: 50,
        isActive: true,
      });

      const res = await service.createCoupon('user-vendor-1', {
        code: 'tabaski20',
        type: CouponType.PERCENTAGE,
        value: 20,
        expiryDate: futureDate.toISOString(),
        maxUses: 50,
      });

      expect(mockPrismaService.coupon.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            code: 'TABASKI20',
            value: 20,
            maxUses: 50,
          }),
        }),
      );
      expect(res.code).toBe('TABASKI20');
    });
  });

  describe('Validation Client de Code Promo (validateCoupon)', () => {
    it('doit calculer correctement une réduction de 20% sur un panier de 50 000 FCFA', async () => {
      const futureDate = new Date(Date.now() + 86400000);
      mockPrismaService.coupon.findUnique.mockResolvedValue({
        id: 'coupon-tabaski',
        shopId: 'shop-uuid-1',
        code: 'TABASKI20',
        type: CouponType.PERCENTAGE,
        value: 20,
        expiryDate: futureDate,
        maxUses: 100,
        usedCount: 5,
        isActive: true,
      });

      const result = await service.validateCoupon({
        code: 'tabaski20',
        shopId: 'shop-uuid-1',
        subtotalFcfa: 50000,
      });

      expect(result.valid).toBe(true);
      expect(result.discountAmountFcfa).toBe(10000);
      expect(result.newSubtotalFcfa).toBe(40000);
    });

    it('doit plafonner la réduction fixe au montant du sous-total', async () => {
      const futureDate = new Date(Date.now() + 86400000);
      mockPrismaService.coupon.findUnique.mockResolvedValue({
        id: 'coupon-gros',
        shopId: 'shop-uuid-1',
        code: 'CADEAU10K',
        type: CouponType.FIXED_FCFA,
        value: 10000,
        expiryDate: futureDate,
        maxUses: null,
        usedCount: 0,
        isActive: true,
      });

      const result = await service.validateCoupon({
        code: 'CADEAU10K',
        shopId: 'shop-uuid-1',
        subtotalFcfa: 7000, // Sous-total inférieur à la valeur du coupon
      });

      expect(result.valid).toBe(true);
      expect(result.discountAmountFcfa).toBe(7000); // Plafonné à 7000 FCFA
      expect(result.newSubtotalFcfa).toBe(0); // Pas de solde négatif
    });

    it('doit rejeter un code promo expiré', async () => {
      const pastDate = new Date(Date.now() - 3600000);
      mockPrismaService.coupon.findUnique.mockResolvedValue({
        id: 'coupon-expired',
        shopId: 'shop-uuid-1',
        code: 'EXPIRE',
        type: CouponType.PERCENTAGE,
        value: 10,
        expiryDate: pastDate,
        maxUses: null,
        usedCount: 0,
        isActive: true,
      });

      await expect(
        service.validateCoupon({
          code: 'EXPIRE',
          shopId: 'shop-uuid-1',
          subtotalFcfa: 20000,
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('doit rejeter un code promo ayant atteint son quota maximal', async () => {
      const futureDate = new Date(Date.now() + 86400000);
      mockPrismaService.coupon.findUnique.mockResolvedValue({
        id: 'coupon-full',
        shopId: 'shop-uuid-1',
        code: 'LIMIT10',
        type: CouponType.PERCENTAGE,
        value: 10,
        expiryDate: futureDate,
        maxUses: 10,
        usedCount: 10,
        isActive: true,
      });

      await expect(
        service.validateCoupon({
          code: 'LIMIT10',
          shopId: 'shop-uuid-1',
          subtotalFcfa: 20000,
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('Protection BOLA Vendeur (updateCoupon & deleteCoupon)', () => {
    it('doit refuser la modification d’un coupon appartenant à une autre boutique', async () => {
      mockPrismaService.shop.findUnique.mockResolvedValue(mockShop);
      mockPrismaService.coupon.findUnique.mockResolvedValue({
        id: 'coupon-other',
        shopId: 'other-shop-uuid',
      });

      await expect(
        service.updateCoupon('user-vendor-1', 'coupon-other', {
          value: 30,
        }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('doit refuser la suppression d’un coupon appartenant à une autre boutique', async () => {
      mockPrismaService.shop.findUnique.mockResolvedValue(mockShop);
      mockPrismaService.coupon.findUnique.mockResolvedValue({
        id: 'coupon-other',
        shopId: 'other-shop-uuid',
      });

      await expect(
        service.deleteCoupon('user-vendor-1', 'coupon-other'),
      ).rejects.toThrow(ForbiddenException);
    });
  });
});
