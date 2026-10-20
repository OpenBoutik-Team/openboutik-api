import { Test, TestingModule } from '@nestjs/testing';
import {
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { ShopsService } from './shops.service';
import { PrismaService } from '../prisma/prisma.service';
import { KycStatus, SubscriptionPlan } from '../generated/prisma/client';

describe('ShopsService (Onboarding & KYC Unit Tests)', () => {
  let service: ShopsService;
  let mockPrismaService: {
    shop: {
      findUnique: jest.Mock;
      findMany: jest.Mock;
      create: jest.Mock;
      update: jest.Mock;
    };
    auditLog: {
      create: jest.Mock;
    };
    $transaction: jest.Mock;
  };

  beforeEach(async () => {
    mockPrismaService = {
      shop: {
        findUnique: jest.fn(),
        findMany: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
      auditLog: {
        create: jest.fn(),
      },
      $transaction: jest.fn((callbackOrArray) => {
        if (typeof callbackOrArray === 'function') {
          return callbackOrArray(mockPrismaService);
        }
        return Promise.all(callbackOrArray);
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ShopsService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get<ShopsService>(ShopsService);
  });

  describe('Vérification en Temps Réel du Slug (checkSlugAvailability)', () => {
    it('doit indiquer qu’un slug est disponible s’il n’existe pas en BDD', async () => {
      mockPrismaService.shop.findUnique.mockResolvedValue(null);

      const result = await service.checkSlugAvailability('diop-couture');

      expect(result.available).toBe(true);
      expect(result.slug).toBe('diop-couture');
    });

    it('doit indiquer qu’un slug est indisponible et fournir une suggestion dakaroise', async () => {
      mockPrismaService.shop.findUnique.mockResolvedValue({ id: 'shop-existing' });

      const result = await service.checkSlugAvailability('teranga-mode');

      expect(result.available).toBe(false);
      expect(result.slug).toBe('teranga-mode');
      expect(result.suggestion).toMatch(/^teranga-mode-[0-9]{3}$/);
    });
  });

  describe('Consultation de l’État d’Onboarding (getOnboardingStatus)', () => {
    it('doit renvoyer hasShop = false et étape 1 si le vendeur n’a pas encore de boutique', async () => {
      mockPrismaService.shop.findUnique.mockResolvedValue(null);

      const status = await service.getOnboardingStatus('vendor-new-id');

      expect(status.hasShop).toBe(false);
      expect(status.onboardingStep).toBe(1);
      expect(status.checklist.hasCompletedOnboarding).toBe(false);
      expect(status.checklist.hasAddedFirstProduct).toBe(false);
      expect(status.checklist.isKycVerified).toBe(false);
    });

    it('doit renvoyer les données complètes et la checklist si la boutique existe', async () => {
      mockPrismaService.shop.findUnique.mockResolvedValue({
        id: 'shop-1',
        name: 'Teranga Mode',
        slug: 'teranga-mode',
        onboardingStep: 3,
        onboardingCompleted: false,
        kycStatus: KycStatus.NONE,
        _count: { products: 2 },
      });

      const status = await service.getOnboardingStatus('vendor-1');

      expect(status.hasShop).toBe(true);
      expect(status.onboardingStep).toBe(3);
      expect(status.checklist.hasCompletedOnboarding).toBe(false);
      expect(status.checklist.hasAddedFirstProduct).toBe(true);
      expect(status.checklist.isKycVerified).toBe(false);
    });
  });

  describe('Parcours d’Onboarding par Étapes (saveOnboardingStep)', () => {
    it('Étape 1 : doit créer la boutique et son portefeuille avec succès', async () => {
      mockPrismaService.shop.findUnique
        .mockResolvedValueOnce(null) // Recherche boutique existante de l'utilisateur
        .mockResolvedValueOnce(null); // Recherche unicité du slug

      mockPrismaService.shop.create.mockResolvedValue({
        id: 'new-shop-id',
        name: 'Dakar Bazin Chic',
        slug: 'dakar-bazin-chic',
        onboardingStep: 2,
        onboardingCompleted: false,
        kycStatus: KycStatus.NONE,
        _count: { products: 0 },
      });

      // Simulation du retour de getOnboardingStatus après création
      mockPrismaService.shop.findUnique.mockResolvedValue({
        id: 'new-shop-id',
        name: 'Dakar Bazin Chic',
        slug: 'dakar-bazin-chic',
        onboardingStep: 2,
        onboardingCompleted: false,
        kycStatus: KycStatus.NONE,
        _count: { products: 0 },
      });

      const result = await service.saveOnboardingStep('vendor-1', 1, {
        name: 'Dakar Bazin Chic',
        slug: 'dakar-bazin-chic',
        mainCategory: 'Mode & Prêt-à-porter',
        city: 'Dakar',
      });

      expect(result.hasShop).toBe(true);
      expect(result.onboardingStep).toBe(2);
    });

    it('Étape 1 : doit rejeter si le nom ou le slug est manquant', async () => {
      mockPrismaService.shop.findUnique.mockResolvedValue(null);

      await expect(
        service.saveOnboardingStep('vendor-1', 1, {
          name: '',
          slug: 'dakar-bazin',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('Étape 1 : doit rejeter si le slug est déjà utilisé par une autre boutique (409 Conflict)', async () => {
      mockPrismaService.shop.findUnique
        .mockResolvedValueOnce(null) // Pas de boutique pour le vendeur
        .mockResolvedValueOnce({ id: 'other-shop' }); // Slug déjà pris

      await expect(
        service.saveOnboardingStep('vendor-1', 1, {
          name: 'Teranga Mode',
          slug: 'teranga-mode',
          mainCategory: 'Mode',
        }),
      ).rejects.toThrow(ConflictException);
    });

    it('Étape 2 : doit permettre de sauter l’étape d’apparence avec { skip: true }', async () => {
      mockPrismaService.shop.findUnique.mockResolvedValue({
        id: 'shop-1',
        onboardingStep: 2,
      });

      mockPrismaService.shop.update.mockResolvedValue({
        id: 'shop-1',
        onboardingStep: 3,
      });

      await service.saveOnboardingStep('vendor-1', 2, { skip: true });

      expect(mockPrismaService.shop.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'shop-1' },
          data: { onboardingStep: 3 },
        }),
      );
    });

    it('Étape 3 : doit valider le format du numéro WhatsApp sénégalais (+221...)', async () => {
      mockPrismaService.shop.findUnique.mockResolvedValue({
        id: 'shop-1',
        onboardingStep: 3,
      });

      // Numéro invalide (trop court)
      await expect(
        service.saveOnboardingStep('vendor-1', 3, {
          whatsappNumber: '771234567',
        }),
      ).rejects.toThrow(BadRequestException);

      // Numéro sénégalais valide
      mockPrismaService.shop.update.mockResolvedValue({
        id: 'shop-1',
        whatsappNumber: '+221771234567',
        onboardingStep: 4,
      });

      await service.saveOnboardingStep('vendor-1', 3, {
        whatsappNumber: '+221771234567',
      });

      expect(mockPrismaService.shop.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'shop-1' },
          data: expect.objectContaining({
            whatsappNumber: '+221771234567',
            onboardingStep: 4,
          }),
        }),
      );
    });

    it('Étape 4 : doit exiger payoutHolderName et au moins un numéro Wave/OM, et activer la boutique', async () => {
      mockPrismaService.shop.findUnique.mockResolvedValue({
        id: 'shop-1',
        name: 'Teranga Mode',
        slug: 'teranga-mode',
        whatsappNumber: '+221771234567',
        onboardingStep: 4,
        onboardingCompleted: false,
        isActive: false,
      });

      // Erreur si payoutHolderName manquant
      await expect(
        service.saveOnboardingStep('vendor-1', 4, {
          waveNumber: '+221771234567',
          payoutHolderName: '',
        }),
      ).rejects.toThrow(BadRequestException);

      // Succès avec Wave + Titulaire -> Onboarding validé & boutique activée
      mockPrismaService.shop.update.mockResolvedValue({
        id: 'shop-1',
        waveNumber: '+221771234567',
        payoutHolderName: 'Moussa Diop',
        onboardingCompleted: true,
        isActive: true,
        onboardingStep: 5,
      });

      await service.saveOnboardingStep('vendor-1', 4, {
        waveNumber: '+221771234567',
        payoutHolderName: 'Moussa Diop',
      });

      expect(mockPrismaService.shop.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'shop-1' },
          data: expect.objectContaining({
            payoutHolderName: 'Moussa Diop',
            onboardingCompleted: true,
            isActive: true,
            onboardingStep: 5,
          }),
        }),
      );
    });

    it('Étape 5 : doit ajuster le plan SaaS en PREMIUM ou par défaut FREE', async () => {
      mockPrismaService.shop.findUnique.mockResolvedValue({
        id: 'shop-1',
        onboardingStep: 5,
        onboardingCompleted: true,
      });

      mockPrismaService.shop.update.mockResolvedValue({
        id: 'shop-1',
        subscriptionPlan: SubscriptionPlan.PREMIUM,
        onboardingCompleted: true,
        onboardingStep: 5,
      });

      await service.saveOnboardingStep('vendor-1', 5, {
        plan: SubscriptionPlan.PREMIUM,
      });

      expect(mockPrismaService.shop.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'shop-1' },
          data: expect.objectContaining({
            subscriptionPlan: SubscriptionPlan.PREMIUM,
          }),
        }),
      );
    });
  });

  describe('Règle MVP « 1 Vendeur = 1 Boutique »', () => {
    it('doit rejeter la création d’une 2ème boutique avec 409 Conflict', async () => {
      mockPrismaService.shop.findUnique.mockResolvedValue({
        id: 'existing-shop-1',
        name: 'Première Boutique',
      });

      await expect(
        service.createShop('vendor-1', {
          name: 'Deuxième Boutique',
          slug: 'deuxieme-boutique',
          mainCategory: 'Mode',
        }),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('Workflow KYC (Soumission CNI & Validation Super-Admin)', () => {
    it('submitKyc : doit enregistrer la CNI et passer le statut en PENDING', async () => {
      mockPrismaService.shop.findUnique.mockResolvedValue({
        id: 'shop-1',
        name: 'Teranga Mode',
      });

      mockPrismaService.shop.update.mockResolvedValue({
        id: 'shop-1',
        kycStatus: KycStatus.PENDING,
        idCardNumber: '1 758 1990 01234',
      });

      const res = await service.submitKyc('vendor-1', {
        idCardNumber: '1 758 1990 01234',
        idCardUrl: 'https://storage.openboutik.sn/cni.jpg',
      });

      expect(res.kycStatus).toBe(KycStatus.PENDING);
      expect(mockPrismaService.shop.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'shop-1' },
          data: expect.objectContaining({
            idCardNumber: '1 758 1990 01234',
            kycStatus: KycStatus.PENDING,
          }),
        }),
      );
    });

    it('reviewKyc : doit valider la CNI, attribuer le badge et consigner dans AuditLog', async () => {
      mockPrismaService.shop.findUnique.mockResolvedValue({
        id: 'shop-1',
        name: 'Teranga Mode',
        slug: 'teranga-mode',
        isVerified: false,
      });

      mockPrismaService.shop.update.mockResolvedValue({
        id: 'shop-1',
        kycStatus: KycStatus.VERIFIED,
        isVerified: true,
      });
      mockPrismaService.auditLog.create.mockResolvedValue({ id: 'audit-log-1' });

      const res = await service.reviewKyc(
        'shop-1',
        { status: KycStatus.VERIFIED, verifyShopBadge: true },
        'super-admin-id',
      );

      expect(res.kycStatus).toBe(KycStatus.VERIFIED);
      expect(mockPrismaService.auditLog.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            action: 'KYC_VERIFIED',
            entityType: 'SHOP',
            entityId: 'shop-1',
            userId: 'super-admin-id',
          }),
        }),
      );
    });
  });

  describe('Store Builder Theme Sync (saveShopTheme & getShopTheme)', () => {
    it('saveShopTheme : doit fusionner le JSON du thème et synchroniser les colonnes visuelles', async () => {
      mockPrismaService.shop.findUnique.mockResolvedValue({
        id: 'shop-1',
        themeConfig: { initialKey: 'test' },
      });

      mockPrismaService.shop.update.mockResolvedValue({
        id: 'shop-1',
        primaryColor: '#10B981',
        themeConfig: { initialKey: 'test', primaryColor: '#10B981', wakhaleEnabled: true },
      });

      const res = await service.saveShopTheme('vendor-1', {
        primaryColor: '#10B981',
        wakhaleEnabled: true,
      });

      expect(res.success).toBe(true);
      expect(mockPrismaService.shop.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'shop-1' },
          data: expect.objectContaining({
            primaryColor: '#10B981',
            themeConfig: {
              initialKey: 'test',
              primaryColor: '#10B981',
              wakhaleEnabled: true,
            },
          }),
        }),
      );
    });

    it('getShopTheme : doit renvoyer la configuration visuelle et le thème de la boutique', async () => {
      mockPrismaService.shop.findUnique.mockResolvedValue({
        id: 'shop-1',
        name: 'Teranga Mode',
        slug: 'teranga-mode',
        primaryColor: '#10B981',
        bannerUrl: null,
        logoUrl: null,
        slogan: 'Le chic sénégalais',
        announcementBarText: 'Livraison gratuite à Dakar',
        announcementBarEnabled: true,
        themeConfig: { primaryColor: '#10B981', wakhaleEnabled: true },
      });

      const res = await service.getShopTheme('vendor-1');

      expect(res.success).toBe(true);
      expect(res.themeConfig).toEqual({ primaryColor: '#10B981', wakhaleEnabled: true });
      expect(res.shop.slug).toBe('teranga-mode');
    });
  });
});

