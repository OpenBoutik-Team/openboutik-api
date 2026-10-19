import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UpdateShopDto } from './dto/update-shop.dto';
import { SaveOnboardingStepDto, SubmitKycDto, ReviewKycDto } from './dto/onboarding.dto';
import { SetVacationDto } from './dto/set-vacation.dto';
import { UpdateShopCustomizationDto } from './dto/customization.dto';
import { CreateShopSponsorDto, UpdateShopSponsorDto } from './dto/sponsor.dto';
import { isReservedSlug } from './constants/reserved-slugs';
import {
  Prisma,
  OrderStatus,
  KycStatus,
  SubscriptionPlan,
  SubscriptionStatus,
  StreamStatus,
  NegotiationStatus,
} from '../generated/prisma/client';

@Injectable()
export class ShopsService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Vérification en temps réel de la disponibilité du slug URL (openboutik.com/nom-boutique)
   */
  async checkSlugAvailability(rawSlug: string) {
    const slug = rawSlug.toLowerCase().trim();

    // 1. Contrôle de la liste noire des slugs réservés par le système (Phase 5)
    if (isReservedSlug(slug)) {
      return {
        available: false,
        slug,
        reason: 'RESERVED_SYSTEM_SLUG',
        suggestion: `${slug}-boutik`,
      };
    }

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

        if (isReservedSlug(cleanSlug)) {
          throw new BadRequestException('Ce nom de sous-domaine/slug est réservé par le système OpenBoutik');
        }

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

    if ((dto as any).slug) {
      const cleanSlug = (dto as any).slug.toLowerCase().trim();
      if (isReservedSlug(cleanSlug)) {
        throw new BadRequestException('Ce nom de sous-domaine/slug est réservé par le système OpenBoutik');
      }
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

  /**
   * Activation ou désactivation du Mode Vacances de la boutique (Dev 2)
   */
  async setVacationMode(ownerId: string, dto: SetVacationDto) {
    const shop = await this.prisma.shop.findUnique({
      where: { ownerId },
    });

    if (!shop) {
      throw new NotFoundException('Boutique introuvable pour ce compte vendeur');
    }

    const [updatedShop] = await this.prisma.$transaction([
      this.prisma.shop.update({
        where: { id: shop.id },
        data: {
          isOnVacation: dto.isOnVacation,
          vacationMessage: dto.isOnVacation ? dto.vacationMessage || null : null,
        },
      }),
      this.prisma.auditLog.create({
        data: {
          userId: ownerId,
          action: dto.isOnVacation ? 'SHOP_VACATION_MODE_ENABLED' : 'SHOP_VACATION_MODE_DISABLED',
          entityType: 'SHOP',
          entityId: shop.id,
          metadata: {
            shopName: shop.name,
            slug: shop.slug,
            vacationMessage: dto.vacationMessage,
          },
        },
      }),
    ]);

    return {
      id: updatedShop.id,
      name: updatedShop.name,
      slug: updatedShop.slug,
      isOnVacation: updatedShop.isOnVacation,
      vacationMessage: updatedShop.vacationMessage,
    };
  }

  // ============================================================================
  // PHASE 5 : SOUS-DOMAINES, STORE BUILDER, SPONSORS & DASHBOARD 360°
  // ============================================================================

  /**
   * Endpoint de résolution vitrine pour Middleware Next.js & Subdomains
   */
  async getStorefront(rawIdentifier: string) {
    const identifier = rawIdentifier.toLowerCase().trim();
    const shop = await this.prisma.shop.findFirst({
      where: {
        OR: [
          { slug: identifier },
          { subdomain: identifier },
          { customDomain: identifier },
        ],
        isActive: true,
      },
    });

    if (!shop) {
      throw new NotFoundException('Boutique introuvable');
    }

    // Si le sous-domaine est désactivé (Plan FREE ou rétrogradé CANCELED_DOWNGRADED)
    if (!shop.subdomainEnabled) {
      return {
        subdomainActive: false,
        redirectToMarketplace: true,
        reason: 'PLAN_FREE_NO_SUBDOMAIN',
        marketplaceUrl: `https://www.openboutik.sn/boutique/${shop.slug}`,
        redirectMarketplaceUrl: `/shops/${shop.slug}`,
        shopBasicInfo: {
          id: shop.id,
          name: shop.name,
          slug: shop.slug,
          logoUrl: shop.logoUrl,
          mainCategory: shop.mainCategory,
        },
      };
    }

    const [sponsors, liveStream, featuredProducts, products] = await Promise.all([
      this.prisma.shopSponsor.findMany({
        where: { shopId: shop.id, isActive: true },
        orderBy: { displayOrder: 'asc' },
      }),
      this.prisma.mediaStream.findFirst({
        where: { shopId: shop.id, status: StreamStatus.LIVE },
        include: {
          streamProducts: {
            include: { product: true },
          },
        },
      }),
      this.prisma.product.findMany({
        where: { shopId: shop.id, isPublished: true, isFeatured: true },
        orderBy: { displayOrder: 'asc' },
        include: { variants: true },
      }),
      this.prisma.product.findMany({
        where: { shopId: shop.id, isPublished: true },
        orderBy: { displayOrder: 'asc' },
        include: { variants: true },
      }),
    ]);

    return {
      subdomainActive: true,
      themeConfig: shop.themeConfig,
      shop: {
        id: shop.id,
        name: shop.name,
        slug: shop.slug,
        slogan: shop.slogan,
        description: shop.description,
        logoUrl: shop.logoUrl,
        bannerUrl: shop.bannerUrl,
        faviconUrl: shop.faviconUrl,
        primaryColor: shop.primaryColor,
        whatsappNumber: shop.whatsappNumber,
        announcementBarEnabled: shop.announcementBarEnabled,
        announcementBarText: shop.announcementBarText,
        themeConfig: shop.themeConfig,
        subscriptionPlan: shop.subscriptionPlan,
        subscriptionStatus: shop.subscriptionStatus,
        isVerified: shop.isVerified,
        city: shop.city,
        address: shop.address,
      },
      sponsors,
      liveStream,
      featuredProducts,
      products,
    };
  }

  /**
   * Consultation de la configuration Store Builder du vendeur
   */
  async getShopCustomization(ownerId: string) {
    const shop = await this.prisma.shop.findUnique({
      where: { ownerId },
      select: {
        id: true,
        name: true,
        slogan: true,
        description: true,
        logoUrl: true,
        bannerUrl: true,
        faviconUrl: true,
        primaryColor: true,
        announcementBarEnabled: true,
        announcementBarText: true,
        themeConfig: true,
        subscriptionPlan: true,
        subdomainEnabled: true,
        customDomain: true,
        customDomainVerified: true,
      },
    });

    if (!shop) {
      throw new NotFoundException('Boutique introuvable');
    }

    return shop;
  }

  /**
   * Mise à jour de la configuration Store Builder (thème, typographies, barre d'annonces)
   */
  async updateShopCustomization(ownerId: string, dto: UpdateShopCustomizationDto) {
    const shop = await this.prisma.shop.findUnique({
      where: { ownerId },
    });

    if (!shop) {
      throw new NotFoundException('Boutique introuvable');
    }

    const data: Prisma.ShopUpdateInput = {};

    if (dto.name !== undefined) data.name = dto.name.trim();
    if (dto.slogan !== undefined) data.slogan = dto.slogan.trim();
    if (dto.description !== undefined) data.description = dto.description.trim();
    if (dto.logoUrl !== undefined) data.logoUrl = dto.logoUrl;
    if (dto.bannerUrl !== undefined) data.bannerUrl = dto.bannerUrl;
    if (dto.faviconUrl !== undefined) data.faviconUrl = dto.faviconUrl;
    if (dto.announcementBarEnabled !== undefined) {
      data.announcementBarEnabled = dto.announcementBarEnabled;
    }
    if (dto.announcementBarText !== undefined) {
      data.announcementBarText = dto.announcementBarText.trim();
    }
    if (dto.primaryColor !== undefined) {
      data.primaryColor = dto.primaryColor;
      data.themeConfig = {
        ...(shop.themeConfig as any),
        primaryColor: dto.primaryColor,
      };
    }
    if (dto.secondaryColor !== undefined) {
      data.themeConfig = {
        ...((data.themeConfig as any) || (shop.themeConfig as any)),
        secondaryColor: dto.secondaryColor,
      };
    }
    if (dto.themeConfig !== undefined) {
      data.themeConfig = {
        ...((data.themeConfig as any) || (shop.themeConfig as any)),
        ...dto.themeConfig,
      };
      if (dto.themeConfig.primaryColor) {
        data.primaryColor = dto.themeConfig.primaryColor;
      }
    }

    // Contrôle d'activation de sous-domaine (Réservé PRO et PREMIUM)
    if (dto.subdomainEnabled === true || dto.subdomain) {
      if (shop.subscriptionPlan === SubscriptionPlan.FREE) {
        throw new ForbiddenException(
          'Le sous-domaine dédié est réservé aux forfaits PRO et PREMIUM',
        );
      }
      if (dto.subdomain) {
        const cleanSubdomain = dto.subdomain.toLowerCase().trim();
        if (isReservedSlug(cleanSubdomain)) {
          throw new BadRequestException(
            'Ce sous-domaine est réservé par la plateforme OpenBoutik',
          );
        }
        data.slug = cleanSubdomain;
      }
      if (dto.subdomainEnabled !== undefined) {
        data.subdomainEnabled = dto.subdomainEnabled;
      }
    } else if (dto.subdomainEnabled === false) {
      data.subdomainEnabled = false;
    }

    return this.prisma.shop.update({
      where: { id: shop.id },
      data,
    });
  }

  /**
   * Ajouter un sponsor / partenaire (Store Builder)
   */
  async createShopSponsor(ownerId: string, dto: CreateShopSponsorDto) {
    const shop = await this.prisma.shop.findUnique({
      where: { ownerId },
      include: {
        _count: { select: { sponsors: true } },
      },
    });

    if (!shop) {
      throw new NotFoundException('Boutique introuvable');
    }

    // Règle de plan : Interdit sur FREE
    if (shop.subscriptionPlan === SubscriptionPlan.FREE) {
      throw new ForbiddenException(
        'Passez au plan PRO ou PREMIUM pour afficher des sponsors sur votre plateforme.',
      );
    }

    // Règle de plan : Maximum 5 sponsors sur PRO, illimité sur PREMIUM
    if (shop.subscriptionPlan === SubscriptionPlan.PRO && shop._count.sponsors >= 5) {
      throw new ForbiddenException(
        'Le forfait PRO est limité à un maximum de 5 sponsors. Passez au forfait PREMIUM pour un nombre illimité.',
      );
    }

    return this.prisma.shopSponsor.create({
      data: {
        shopId: shop.id,
        name: dto.name.trim(),
        logoUrl: dto.logoUrl.trim(),
        websiteUrl: dto.websiteUrl ? dto.websiteUrl.trim() : null,
        description: dto.description ? dto.description.trim() : null,
        badgeText: dto.badgeText ? dto.badgeText.trim() : null,
        displayOrder: dto.displayOrder ?? 0,
        isActive: true,
      },
    });
  }

  /**
   * Liste des sponsors du vendeur connecté
   */
  async getShopSponsors(ownerId: string) {
    const shop = await this.prisma.shop.findUnique({
      where: { ownerId },
    });

    if (!shop) {
      throw new NotFoundException('Boutique introuvable');
    }

    return this.prisma.shopSponsor.findMany({
      where: { shopId: shop.id },
      orderBy: { displayOrder: 'asc' },
    });
  }

  /**
   * Modifier un sponsor (avec vérification BOLA d'appartenance)
   */
  async updateShopSponsor(ownerId: string, sponsorId: string, dto: UpdateShopSponsorDto) {
    const sponsor = await this.prisma.shopSponsor.findUnique({
      where: { id: sponsorId },
      include: { shop: true },
    });

    if (!sponsor) {
      throw new NotFoundException('Sponsor introuvable');
    }

    if (sponsor.shop.ownerId !== ownerId) {
      throw new ForbiddenException(
        'Vous n’avez pas le droit de modifier un sponsor appartenant à une autre boutique',
      );
    }

    const data: Prisma.ShopSponsorUpdateInput = {};
    if (dto.name !== undefined) data.name = dto.name.trim();
    if (dto.logoUrl !== undefined) data.logoUrl = dto.logoUrl.trim();
    if (dto.websiteUrl !== undefined) data.websiteUrl = dto.websiteUrl ? dto.websiteUrl.trim() : null;
    if (dto.description !== undefined) data.description = dto.description ? dto.description.trim() : null;
    if (dto.badgeText !== undefined) data.badgeText = dto.badgeText ? dto.badgeText.trim() : null;
    if (dto.displayOrder !== undefined) data.displayOrder = dto.displayOrder;
    if (dto.isActive !== undefined) data.isActive = dto.isActive;

    return this.prisma.shopSponsor.update({
      where: { id: sponsorId },
      data,
    });
  }

  /**
   * Supprimer un sponsor (avec vérification BOLA)
   */
  async deleteShopSponsor(ownerId: string, sponsorId: string) {
    const sponsor = await this.prisma.shopSponsor.findUnique({
      where: { id: sponsorId },
      include: { shop: true },
    });

    if (!sponsor) {
      throw new NotFoundException('Sponsor introuvable');
    }

    if (sponsor.shop.ownerId !== ownerId) {
      throw new ForbiddenException(
        'Vous n’avez pas le droit de supprimer un sponsor appartenant à une autre boutique',
      );
    }

    await this.prisma.shopSponsor.delete({
      where: { id: sponsorId },
    });

    return { message: 'Sponsor supprimé avec succès' };
  }

  /**
   * Dashboard Vendeur 360° ultra-complet et consolidé (Phase 5)
   */
  async getVendorDashboard360(ownerId: string) {
    const shop = await this.prisma.shop.findUnique({
      where: { ownerId },
      include: {
        wallet: true,
        sponsors: {
          where: { isActive: true },
          orderBy: { displayOrder: 'asc' },
        },
      },
    });

    if (!shop || !shop.wallet) {
      throw new NotFoundException('Boutique introuvable pour ce compte vendeur');
    }

    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    // Parallélisation des agrégations
    const [
      orderCountsRaw,
      totalRevenueAgg,
      monthlyRevenueAgg,
      recentOrders,
      totalPublishedProducts,
      allShopProducts,
      pendingNegotiationsCount,
      totalViewsAgg,
    ] = await Promise.all([
      // 1. Décompte par statut de commande
      this.prisma.order.groupBy({
        by: ['status'],
        where: { shopId: shop.id },
        _count: { id: true },
      }),

      // 2. CA total livré
      this.prisma.order.aggregate({
        where: { shopId: shop.id, status: OrderStatus.DELIVERED_CONFIRMED },
        _sum: { netVendorAmountFcfa: true },
      }),

      // 3. CA du mois en cours
      this.prisma.order.aggregate({
        where: {
          shopId: shop.id,
          status: OrderStatus.DELIVERED_CONFIRMED,
          createdAt: { gte: startOfMonth },
        },
        _sum: { netVendorAmountFcfa: true },
      }),

      // 4. 5 dernières commandes
      this.prisma.order.findMany({
        where: { shopId: shop.id },
        take: 5,
        orderBy: { createdAt: 'desc' },
        include: {
          client: { select: { fullName: true, phone: true } },
          items: { select: { productName: true, quantity: true, totalPriceFcfa: true } },
        },
      }),

      // 5. Total produits publiés
      this.prisma.product.count({
        where: { shopId: shop.id, isPublished: true },
      }),

      // 6. Produits pour détection stock critique
      this.prisma.product.findMany({
        where: { shopId: shop.id, isPublished: true },
        select: { id: true, name: true, stock: true, lowStockThreshold: true },
      }),

      // 7. Négociations Wakhale en attente
      this.prisma.priceNegotiation.count({
        where: { shopId: shop.id, status: NegotiationStatus.PENDING },
      }),

      // 8. Total des vues
      this.prisma.productView.aggregate({
        where: { product: { shopId: shop.id } },
        _sum: { count: true },
      }),
    ]);

    const ordersBreakdown: Record<string, number> = {
      PENDING_PAYMENT: 0,
      PAID_ESCROW: 0,
      PREPARING: 0,
      SHIPPED_TIAK_TIAK: 0,
      DELIVERED_CONFIRMED: 0,
      DISPUTED: 0,
      REFUNDED: 0,
      CANCELLED: 0,
    };
    for (const item of orderCountsRaw) {
      ordersBreakdown[item.status] = item._count.id;
    }

    const lowStockItems = allShopProducts.filter(
      (p) => p.stock <= p.lowStockThreshold,
    );

    const planPriceFcfa =
      shop.subscriptionPlan === SubscriptionPlan.PREMIUM ? 15000 : 5000;
    const isPastDue = shop.subscriptionStatus === SubscriptionStatus.PAST_DUE;
    const dunningAlert = isPastDue
      ? {
          isPastDue: true,
          retryCount: shop.billingRetryCount,
          maxRetries: 6,
          remainingRetries: Math.max(0, 6 - shop.billingRetryCount),
          gracePeriodEndsAt: shop.gracePeriodEndsAt,
          amountNeededFcfa: Math.max(
            0,
            planPriceFcfa - shop.wallet.availableBalanceFcfa,
          ),
          warningMessage: `Attention : solde insuffisant pour votre abonnement. Il reste ${Math.max(0, 6 - shop.billingRetryCount)} tentative(s) avant la désactivation de votre sous-domaine et de vos privilèges.`,
        }
      : null;

    return {
      financials: {
        totalRevenueFcfa: totalRevenueAgg._sum.netVendorAmountFcfa || 0,
        monthlyRevenueFcfa: monthlyRevenueAgg._sum.netVendorAmountFcfa || 0,
        escrowBalanceFcfa: shop.wallet.escrowBalanceFcfa,
        availableBalanceFcfa: shop.wallet.availableBalanceFcfa,
        totalCommissionSavedFcfa: shop.totalCommissionSavedFcfa,
        currentCommissionRate: shop.commissionRate,
      },
      subscriptionAndDomain: {
        plan: shop.subscriptionPlan,
        status: shop.subscriptionStatus,
        subdomainUrl: `https://${shop.slug}.openboutik.sn`,
        subdomainEnabled: shop.subdomainEnabled,
        customDomain: shop.customDomain,
        customDomainVerified: shop.customDomainVerified,
        trialEndsAt: shop.trialEndsAt,
        currentPeriodEnd: shop.currentPeriodEnd,
        dunningAlert,
      },
      ordersBreakdown: {
        counts: ordersBreakdown,
        recentOrders,
      },
      catalogAndAlerts: {
        totalPublishedProducts,
        lowStockCount: lowStockItems.length,
        lowStockItems,
        pendingNegotiationsCount,
        totalViewsCount: totalViewsAgg._sum.count || 0,
        activeSponsorsCount: shop.sponsors.length,
        sponsors: shop.sponsors,
      },

      // Blocs consolidés Phase 5
      saas: {
        plan: shop.subscriptionPlan,
        status: shop.subscriptionStatus,
        subdomain: shop.slug,
        subdomainEnabled: shop.subdomainEnabled,
        customDomain: shop.customDomain,
        trialEndsAt: shop.trialEndsAt,
        nextBillingDate: shop.currentPeriodEnd,
        billingRetriesCount: shop.billingRetryCount,
        dunningAlert,
      },
      financial: {
        availableBalanceFcfa: shop.wallet.availableBalanceFcfa,
        escrowBalanceFcfa: shop.wallet.escrowBalanceFcfa,
        totalEarnedFcfa: shop.wallet.totalEarnedFcfa,
        totalCommissionSavedFcfa: shop.totalCommissionSavedFcfa,
        currentCommissionRate: shop.commissionRate,
      },
      salesChannels: {
        totalOrders: recentOrders.length,
        marketplaceOrders: recentOrders.filter((o: any) => o.salesChannel !== 'SUBDOMAIN').length,
        subdomainOrders: recentOrders.filter((o: any) => o.salesChannel === 'SUBDOMAIN').length,
        marketplaceRevenueFcfa: totalRevenueAgg._sum.netVendorAmountFcfa || 0,
        subdomainRevenueFcfa: 0,
      },
      stockHealth: {
        totalProducts: totalPublishedProducts,
        lowStockProducts: lowStockItems.length,
        outOfStockProducts: lowStockItems.filter((i) => i.stock === 0).length,
      },
      topProducts: allShopProducts.slice(0, 5),
      recentOrders,
    };
  }
}

