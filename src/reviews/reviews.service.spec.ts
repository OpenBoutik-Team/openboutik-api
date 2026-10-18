import { Test, TestingModule } from '@nestjs/testing';
import {
  ForbiddenException,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { ReviewsService } from './reviews.service';
import { PrismaService } from '../prisma/prisma.service';
import { OrderStatus } from '../generated/prisma/client';

describe('ReviewsService (Avis Clients & Modération Unit Tests)', () => {
  let service: ReviewsService;
  let mockPrismaService: {
    product: { findUnique: jest.Mock };
    review: {
      findUnique: jest.Mock;
      findMany: jest.Mock;
      create: jest.Mock;
      update: jest.Mock;
    };
    order: { findFirst: jest.Mock };
  };

  const mockProduct = {
    id: 'prod-uuid-1',
    name: 'Tissu Bazin Riche Getzner',
    shopId: 'shop-uuid-1',
    shop: {
      id: 'shop-uuid-1',
      ownerId: 'vendor-uuid-1',
    },
  };

  beforeEach(async () => {
    mockPrismaService = {
      product: {
        findUnique: jest.fn(),
      },
      review: {
        findUnique: jest.fn(),
        findMany: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
      order: {
        findFirst: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ReviewsService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get<ReviewsService>(ReviewsService);
  });

  describe('Publication d’Avis (createReview & Achat Vérifié)', () => {
    it('doit renvoyer 404 si le produit n’existe pas', async () => {
      mockPrismaService.product.findUnique.mockResolvedValue(null);

      await expect(
        service.createReview('user-client-1', 'prod-inconnu', {
          rating: 5,
          comment: 'Très bon produit',
        }),
      ).rejects.toThrow(NotFoundException);
    });

    it('doit bloquer la publication si l’acheteur a déjà déposé un avis sur ce produit', async () => {
      mockPrismaService.product.findUnique.mockResolvedValue(mockProduct);
      mockPrismaService.review.findUnique.mockResolvedValue({
        id: 'review-existante',
        productId: mockProduct.id,
        userId: 'user-client-1',
      });

      await expect(
        service.createReview('user-client-1', mockProduct.id, {
          rating: 4,
          comment: 'Deuxième essai',
        }),
      ).rejects.toThrow(ConflictException);
    });

    it('doit bloquer l’avis si l’utilisateur n’a pas d’achat vérifié livré (DELIVERED_CONFIRMED)', async () => {
      mockPrismaService.product.findUnique.mockResolvedValue(mockProduct);
      mockPrismaService.review.findUnique.mockResolvedValue(null);
      mockPrismaService.order.findFirst.mockResolvedValue(null); // Aucune commande livrée

      await expect(
        service.createReview('user-client-sans-achat', mockProduct.id, {
          rating: 5,
          comment: 'J’adore ce produit sans l’avoir acheté !',
        }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('doit créer avec succès l’avis si l’utilisateur a une commande confirmée livrée', async () => {
      mockPrismaService.product.findUnique.mockResolvedValue(mockProduct);
      mockPrismaService.review.findUnique.mockResolvedValue(null);
      mockPrismaService.order.findFirst.mockResolvedValue({
        id: 'order-livree-1',
        status: OrderStatus.DELIVERED_CONFIRMED,
      });

      mockPrismaService.review.create.mockResolvedValue({
        id: 'review-new-1',
        productId: mockProduct.id,
        userId: 'user-client-1',
        rating: 5,
        comment: 'Superbe qualité, reçu en 2h à Dakar !',
        orderId: 'order-livree-1',
        isApproved: true,
        user: { id: 'user-client-1', fullName: 'Fatou Sow' },
      });

      const res = await service.createReview('user-client-1', mockProduct.id, {
        rating: 5,
        comment: 'Superbe qualité, reçu en 2h à Dakar !',
      });

      expect(res.rating).toBe(5);
      expect(mockPrismaService.review.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            productId: mockProduct.id,
            userId: 'user-client-1',
            orderId: 'order-livree-1',
            rating: 5,
          }),
        }),
      );
    });
  });

  describe('Consultation Publique des Avis (getProductReviews)', () => {
    it('doit calculer correctement la moyenne et masquer le nom de famille des clients', async () => {
      mockPrismaService.product.findUnique.mockResolvedValue(mockProduct);
      mockPrismaService.review.findMany.mockResolvedValue([
        {
          id: 'r1',
          rating: 5,
          comment: 'Parfait',
          vendorReply: 'Merci beaucoup !',
          repliedAt: new Date(),
          createdAt: new Date(),
          user: { id: 'u1', fullName: 'Amadou Diallo' },
        },
        {
          id: 'r2',
          rating: 4,
          comment: 'Très bien',
          vendorReply: null,
          repliedAt: null,
          createdAt: new Date(),
          user: { id: 'u2', fullName: 'Mariama Ba' },
        },
      ]);

      const result = await service.getProductReviews(mockProduct.id);

      expect(result.totalReviews).toBe(2);
      expect(result.averageRating).toBe(4.5); // (5 + 4) / 2 = 4.5
      expect(result.reviews[0].customerName).toBe('Amadou D.');
      expect(result.reviews[1].customerName).toBe('Mariama B.');
      expect(result.reviews[0].vendorReply).toBe('Merci beaucoup !');
    });

    it('doit renvoyer 0 en moyenne s’il n’y a aucun avis', async () => {
      mockPrismaService.product.findUnique.mockResolvedValue(mockProduct);
      mockPrismaService.review.findMany.mockResolvedValue([]);

      const result = await service.getProductReviews(mockProduct.id);

      expect(result.totalReviews).toBe(0);
      expect(result.averageRating).toBe(0);
      expect(result.reviews).toEqual([]);
    });
  });

  describe('Réponse Vendeur & Sécurité BOLA (replyToReview)', () => {
    it('doit refuser la réponse si le marchand ne possède pas la boutique vendant le produit', async () => {
      mockPrismaService.review.findUnique.mockResolvedValue({
        id: 'review-1',
        product: {
          shop: {
            ownerId: 'autre-vendeur',
          },
        },
      });

      await expect(
        service.replyToReview('vendeur-imposteur', 'review-1', {
          reply: 'Merci pour votre achat',
        }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('doit enregistrer la réponse si le marchand est le propriétaire légitime', async () => {
      mockPrismaService.review.findUnique.mockResolvedValue({
        id: 'review-1',
        product: {
          shop: {
            ownerId: 'vendeur-legitime',
          },
        },
      });

      mockPrismaService.review.update.mockResolvedValue({
        id: 'review-1',
        vendorReply: 'Merci beaucoup pour votre confiance !',
        repliedAt: new Date(),
      });

      const updated = await service.replyToReview(
        'vendeur-legitime',
        'review-1',
        {
          reply: 'Merci beaucoup pour votre confiance !',
        },
      );

      expect(updated.vendorReply).toBe('Merci beaucoup pour votre confiance !');
      expect(mockPrismaService.review.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'review-1' },
          data: expect.objectContaining({
            vendorReply: 'Merci beaucoup pour votre confiance !',
          }),
        }),
      );
    });
  });
});
