import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UpdateShopDto } from './dto/update-shop.dto';
import { SaveOnboardingStepDto, SubmitKycDto, ReviewKycDto } from './dto/onboarding.dto';
import { Prisma, OrderStatus, KycStatus, SubscriptionPlan } from '../generated/prisma/client';

@Injectable()
export class ShopsService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Vérification en temps réel de la disponibilité du slug URL (openboutik.com/nom-boutique)
   */
  async checkSlugAvailability(rawSlug: string) {
    const slug = rawSlug.toLowerCase().trim();
    const existing = await this.prisma.shop.findUnique({
      where: { slug },
      select: { id: true },
    });

    if (!existing) {
      return { available: true, slug };
    }

    // Génération d'une suggestion dakaroise propre
    const suffix = Math.floor(100 + Math.random() * 900);
    const suggestion = `${slug}-${suffix}`;

    return {
      available: false,
      slug,
      suggestion,
    };
  }

  /**
   * Récupère l'état d'onboarding, l'étape courante (1..5) et la checklist de démarrage
   */
  async getOnboardingStatus(ownerId: string) {
    const shop = await this.prisma.shop.findUnique({
      where: { ownerId },
      include: {
        wallet: true,
        _count: {
          select: {
            products: true,
          },
        },
      },
    });

    if (!shop) {
      return {
        hasShop: false,
        onboardingStep: 1,
        onboardingCompleted: false,
        shop: null,
        checklist: {
          hasCompletedOnboarding: false,
          hasAddedFirstProduct: false,
          isKycVerified: false,
        },
      };
    }

    const hasAddedFirstProduct = (shop._count?.products || 0) > 0;

    return {
      hasShop: true,
      onboardingStep: shop.onboardingStep,
      onboardingCompleted: shop.onboardingCompleted,
      shop,
      checklist: {
        hasCompletedOnboarding: shop.onboardingCompleted,
        hasAddedFirstProduct,
        isKycVerified: shop.kycStatus === KycStatus.VERIFIED,
      },
    };
  }

  /**
   * Sauvegarde progressive d'une étape d'onboarding (Étapes 1 à 5)
   */
  async saveOnboardingStep(ownerId: string, stepNumber: number, dto: SaveOnboardingStepDto) {
    if (![1, 2, 3, 4, 5].includes(stepNumber)) {
      throw new BadRequestException("Le numéro d'étape d'onboarding doit être compris entre 1 et 5");
    }

    let shop = await this.prisma.shop.findUnique({
      where: { ownerId },
      include: { wallet: true },
    });

    switch (stepNumber) {
      // ----------------------------------------------------------------------
      // ÉTAPE 1 : Identité de la boutique (OBLIGATOIRE)
      // ----------------------------------------------------------------------
      case 1: {
        if (!dto.name || !dto.slug || !dto.mainCategory) {
          throw new BadRequestException(
            "Les champs 'name', 'slug' et 'mainCategory' sont obligatoires à l'étape 1",
          );
        }

        const cleanSlug = dto.slug.toLowerCase().trim();

        if (shop) {
          // Mise à jour de la boutique existante
          if (cleanSlug !== shop.slug) {
            const existingSlug = await this.prisma.shop.findUnique({
              where: { slug: cleanSlug },
            });
            if (existingSlug && existingSlug.id !== shop.id) {
              throw new ConflictException("Ce nom de boutique (slug) est déjà réservé par un autre marchand");
            }
          }

          shop = await this.prisma.shop.update({
            where: { id: shop.id },
            data: {
              name: dto.name.trim(),
              slug: cleanSlug,
              description: dto.description ? dto.description.trim() : shop.description,
              mainCategory: dto.mainCategory.trim(),
              city: dto.city ? dto.city.trim() : shop.city,
              onboardingStep: Math.max(shop.onboardingStep, 2),
            },
            include: { wallet: true },
          });
        } else {
          // Création initiale de la boutique (Règle MVP 1 Vendeur = 1 Boutique vérifiée car shop === null)
          const existingSlug = await this.prisma.shop.findUnique({
            where: { slug: cleanSlug },
          });
          if (existingSlug) {
            throw new ConflictException("Ce nom de boutique (slug) est déjà réservé par un autre marchand");
          }

          shop = await this.prisma.$transaction(async (tx) => {
            return tx.shop.create({
              data: {
                ownerId,
                name: dto.name!.trim(),
                slug: cleanSlug,
                description: dto.description ? dto.description.trim() : null,
                mainCategory: dto.mainCategory!.trim(),
                city: dto.city ? dto.city.trim() : 'Dakar',
                primaryColor: '#10B981',
                onboardingStep: 2,
                onboardingCompleted: false,
                wallet: {
                  create: {
                    escrowBalanceFcfa: 0,
                    availableBalanceFcfa: 0,
                    totalEarnedFcfa: 0,
                  },
                },
              },
              include: { wallet: true },
            });
          });
        }
        break;
      }

      // ----------------------------------------------------------------------
      // ÉTAPE 2 : Apparence (OPTIONNELLE / PEUT ÊTRE PASSÉE)
      // ----------------------------------------------------------------------
      case 2: {
        if (!shop) {
          throw new BadRequestException("Veuillez d'abord compléter l'étape 1 pour initialiser votre boutique");
        }

        if (dto.skip) {
          shop = await this.prisma.shop.update({
            where: { id: shop.id },
            data: { onboardingStep: Math.max(shop.onboardingStep, 3) },
            include: { wallet: true },
          });
        } else {
          shop = await this.prisma.shop.update({
            where: { id: shop.id },
            data: {
              logoUrl: dto.logoUrl !== undefined ? dto.logoUrl : shop.logoUrl,
              bannerUrl: dto.bannerUrl !== undefined ? dto.bannerUrl : shop.bannerUrl,
              primaryColor: dto.primaryColor || shop.primaryColor || '#10B981',
              onboardingStep: Math.max(shop.onboardingStep, 3),
            },
            include: { wallet: true },
          });
        }
        break;
      }

      // ----------------------------------------------------------------------
      // ÉTAPE 3 : Contact Social Commerce (OBLIGATOIRE)
      // ----------------------------------------------------------------------
      case 3: {
        if (!shop) {
          throw new BadRequestException("Veuillez d'abord compléter l'étape 1");
        }

        if (!dto.whatsappNumber || !/^\+221[0-9]{9}$/.test(dto.whatsappNumber)) {
          throw new BadRequestException(
            "Le numéro WhatsApp est obligatoire à l'étape 3 et doit être au format sénégalais +221XXXXXXXXX",
          );
        }

        shop = await this.prisma.shop.update({
          where: { id: shop.id },
          data: {
            whatsappNumber: dto.whatsappNumber,
            onboardingStep: Math.max(shop.onboardingStep, 4),
          },
          include: { wallet: true },
        });
        break;
      }

      // ----------------------------------------------------------------------
      // ÉTAPE 4 : Réception des paiements du Séquestre (OBLIGATOIRE)
      // ----------------------------------------------------------------------
      case 4: {
        if (!shop) {
          throw new BadRequestException("Veuillez d'abord compléter les étapes précédentes");
        }

        const wave = dto.waveNumber || shop.waveNumber;
        const om = dto.omNumber || shop.omNumber;

        if (!wave && !om) {
          throw new BadRequestException(
            "Vous devez renseigner au moins un numéro de réception mobile money valide (Wave ou Orange Money au format +221XXXXXXXXX)",
          );
        }

        if (dto.waveNumber && !/^\+221[0-9]{9}$/.test(dto.waveNumber)) {
          throw new BadRequestException("Le numéro Wave doit être au format sénégalais +221XXXXXXXXX");
        }

        if (dto.omNumber && !/^\+221[0-9]{9}$/.test(dto.omNumber)) {
          throw new BadRequestException("Le numéro Orange Money doit être au format sénégalais +221XXXXXXXXX");
        }

        const payoutHolder = dto.payoutHolderName ? dto.payoutHolderName.trim() : shop.payoutHolderName;
        if (!payoutHolder) {
          throw new BadRequestException(
            "Le nom complet du titulaire du compte Wave / Orange Money (payoutHolderName) est obligatoire pour valider cette étape",
          );
        }

        // Vérification de la complétion des étapes 1, 3 et 4 -> Activation immédiate de la boutique
        const hasValidIdentity = !!shop.name && !!shop.slug;
        const hasValidWhatsapp = !!shop.whatsappNumber;

        const isCompleted = hasValidIdentity && hasValidWhatsapp && (!!wave || !!om);

        shop = await this.prisma.shop.update({
          where: { id: shop.id },
          data: {
            waveNumber: dto.waveNumber || shop.waveNumber,
            omNumber: dto.omNumber || shop.omNumber,
            payoutHolderName: payoutHolder,
            onboardingCompleted: isCompleted,
            isActive: isCompleted ? true : shop.isActive,
            onboardingStep: Math.max(shop.onboardingStep, 5),
          },
          include: { wallet: true },
        });
        break;
      }

      // ----------------------------------------------------------------------
      // ÉTAPE 5 : Choix du plan SaaS (OPTIONNELLE / PEUT ÊTRE PASSÉE)
      // ----------------------------------------------------------------------
      case 5: {
        if (!shop) {
          throw new BadRequestException("Veuillez d'abord compléter les étapes précédentes");
        }

        const selectedPlan =
          dto.plan === SubscriptionPlan.PREMIUM
            ? SubscriptionPlan.PREMIUM
            : SubscriptionPlan.FREE;

        shop = await this.prisma.shop.update({
          where: { id: shop.id },
          data: {
            subscriptionPlan: selectedPlan,
            onboardingCompleted: true,
            onboardingStep: 5,
          },
          include: { wallet: true },
        });
        break;
      }
    }

    return this.getOnboardingStatus(ownerId);
  }

  /**
   * Soumission des pièces d'identité (CNI) par le marchand
   */
  async submitKyc(ownerId: string, dto: SubmitKycDto) {
    const shop = await this.prisma.shop.findUnique({
      where: { ownerId },
    });

    if (!shop) {
      throw new NotFoundException('Boutique introuvable pour ce vendeur');
    }

    return this.prisma.shop.update({
      where: { id: shop.id },
      data: {
        idCardNumber: dto.idCardNumber.trim(),
        idCardUrl: dto.idCardUrl.trim(),
        kycStatus: KycStatus.PENDING,
        kycSubmittedAt: new Date(),
        kycRejectionReason: null,
      },
    });
  }

  /**
   * Validation ou Rejet de la CNI par le Super-Admin avec Audit Log
   */
  async reviewKyc(shopId: string, dto: ReviewKycDto, superAdminId: string) {
    const shop = await this.prisma.shop.findUnique({
      where: { id: shopId },
    });

    if (!shop) {
      throw new NotFoundException('Boutique introuvable');
    }

    const isVerified = dto.status === KycStatus.VERIFIED;

    const [updatedShop] = await this.prisma.$transaction([
      this.prisma.shop.update({
        where: { id: shopId },
        data: {
          kycStatus: dto.status,
          kycVerifiedAt: isVerified ? new Date() : null,
          kycRejectionReason: !isVerified ? (dto.rejectionReason || 'Dossier rejeté par le Super-Admin') : null,
          isVerified: isVerified && dto.verifyShopBadge !== false ? true : shop.isVerified,
        },
      }),
      this.prisma.auditLog.create({
        data: {
          userId: superAdminId,
          action: isVerified ? 'KYC_VERIFIED' : 'KYC_REJECTED',
          entityType: 'SHOP',
          entityId: shopId,
          metadata: {
            shopName: shop.name,
            slug: shop.slug,
            status: dto.status,
            rejectionReason: dto.rejectionReason,
            verifyShopBadge: dto.verifyShopBadge,
          },
        },
      }),
    ]);

    return updatedShop;
  }

  /**
   * Création d'une nouvelle boutique (Verrouillage strict Règle MVP : 1 Vendeur = 1 Boutique)
   */
  async createShop(ownerId: string, dto: any) {
    const existing = await this.prisma.shop.findUnique({
      where: { ownerId },
    });

    if (existing) {
      throw new ConflictException(
        "Un compte vendeur ne peut posséder qu'une seule boutique dans la version actuelle",
      );
    }

    // Si pas de boutique, redirige vers saveOnboardingStep 1
    return this.saveOnboardingStep(ownerId, 1, dto);
  }

  /**
   * Liste publique des boutiques actives sur la marketplace (Dev 1)
   */
  async getAllShops(query: { search?: string; isVerified?: boolean; city?: string }) {
    const where: Prisma.ShopWhereInput = { isActive: true };

    if (query.city) {
      where.city = { contains: query.city };
    }

    if (query.isVerified !== undefined) {
      where.isVerified = query.isVerified;
    }

    if (query.search) {
      where.OR = [
        { name: { contains: query.search } },
        { description: { contains: query.search } },
        { city: { contains: query.search } },
      ];
    }

    const shops = await this.prisma.shop.findMany({
      where,
      select: {
        id: true,
        name: true,
        slug: true,
        description: true,
        mainCategory: true,
        logoUrl: true,
        bannerUrl: true,
        primaryColor: true,
        whatsappNumber: true,
        city: true,
        isVerified: true,
        subscriptionPlan: true,
        createdAt: true,
        _count: {
          select: {
            products: {
              where: { isPublished: true },
            },
          },
        },
      },
      orderBy: [
        { isVerified: 'desc' },
        { createdAt: 'desc' },
      ],
    });

    return shops;
  }

  /**
   * Vitrine publique d'une boutique par son slug (Dev 1 - openboutik.sn/boutique/[slug])
   */
  async findBySlug(slug: string) {
    const shop = await this.prisma.shop.findUnique({
      where: { slug: slug.toLowerCase().trim() },
      include: {
        categories: {
          include: {
            _count: {
              select: {
                products: { where: { isPublished: true } },
              },
            },
          },
        },
        products: {
          where: { isPublished: true },
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!shop || !shop.isActive) {
      throw new NotFoundException(`La boutique "${slug}" est introuvable ou inactive`);
    }

    return shop;
  }

  /**
   * Tableau de bord complet du commerçant connecté (Dev 2 - openboutik-seller)
   */
  async getVendorDashboard(ownerId: string) {
    const shop = await this.prisma.shop.findUnique({
      where: { ownerId },
      include: {
        wallet: true,
        subscriptions: {
          where: { status: 'ACTIVE' },
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
      },
    });

    if (!shop) {
      throw new NotFoundException('Aucune boutique associée à ce compte vendeur');
    }

    // Agrégations statistiques pour le tableau de bord marchand
    const [
      totalProductsCount,
      outOfStockProductsCount,
      totalOrdersCount,
      pendingOrdersCount,
      shippedOrdersCount,
      deliveredOrdersCount,
    ] = await Promise.all([
      this.prisma.product.count({ where: { shopId: shop.id } }),
      this.prisma.product.count({ where: { shopId: shop.id, stock: 0 } }),
      this.prisma.order.count({ where: { shopId: shop.id } }),
      this.prisma.order.count({
        where: { shopId: shop.id, status: { in: [OrderStatus.PAID_ESCROW, OrderStatus.PREPARING] } },
      }),
      this.prisma.order.count({
        where: { shopId: shop.id, status: OrderStatus.SHIPPED_TIAK_TIAK },
      }),
      this.prisma.order.count({
        where: { shopId: shop.id, status: OrderStatus.DELIVERED_CONFIRMED },
      }),
    ]);

    return {
      shop,
      statistics: {
        products: {
          total: totalProductsCount,
          outOfStock: outOfStockProductsCount,
        },
        orders: {
          total: totalOrdersCount,
          pendingPreparation: pendingOrdersCount,
          inTransitTiakTiak: shippedOrdersCount,
          deliveredSuccess: deliveredOrdersCount,
        },
        financials: {
          escrowBalanceFcfa: shop.wallet?.escrowBalanceFcfa || 0,
          availableBalanceFcfa: shop.wallet?.availableBalanceFcfa || 0,
          totalEarnedFcfa: shop.wallet?.totalEarnedFcfa || 0,
        },
      },
    };
  }

  /**
   * Mise à jour de la boutique par son propriétaire
   */
  async updateVendorShop(ownerId: string, dto: UpdateShopDto) {
    const shop = await this.prisma.shop.findUnique({
      where: { ownerId },
    });

    if (!shop) {
      throw new NotFoundException('Boutique introuvable');
    }

    return this.prisma.shop.update({
      where: { id: shop.id },
      data: dto,
    });
  }

  /**
   * Certification / Validation d'une boutique par le Super-Admin
   */
  async verifyShop(shopId: string, isVerified: boolean, superAdminId: string, notes?: string) {
    const shop = await this.prisma.shop.findUnique({
      where: { id: shopId },
    });

    if (!shop) {
      throw new NotFoundException('Boutique introuvable');
    }

    const [updatedShop] = await this.prisma.$transaction([
      this.prisma.shop.update({
        where: { id: shopId },
        data: { isVerified },
      }),
      this.prisma.auditLog.create({
        data: {
          userId: superAdminId,
          action: isVerified ? 'SHOP_VERIFIED' : 'SHOP_UNVERIFIED',
          entityType: 'SHOP',
          entityId: shopId,
          metadata: {
            shopName: shop.name,
            slug: shop.slug,
            notes,
          },
        },
      }),
    ]);

    return updatedShop;
  }
}

