import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CheckoutDto } from './dto/checkout.dto';
import { ConfirmDeliveryDto } from './dto/confirm-delivery.dto';
import { CreateOrderNoteDto } from './dto/create-order-note.dto';
import type { Response } from 'express';
import { randomUUID } from 'node:crypto';
import PDFDocument from 'pdfkit';
import {
  Order,
  OrderStatus,
  EscrowStatus,
  DeliveryMethod,
  SubscriptionPlan,
  SubscriptionStatus,
  SalesChannel,
  Role,
  CouponType,
  Prisma,
} from '../generated/prisma/client';
import { SubscriptionsService } from '../subscriptions/subscriptions.service';

export interface PreparedOrderItemData {
  productId: string;
  variantId?: string;
  variantAttributes?: Prisma.InputJsonValue;
  productName: string;
  unitPriceFcfa: number;
  quantity: number;
  totalPriceFcfa: number;
}

export interface PreparedOrderData {
  shopId: string;
  orderNumber: string;
  subtotalFcfa: number;
  deliveryFeeFcfa: number;
  discountAmountFcfa: number;
  couponCode?: string;
  couponId?: string;
  totalAmountFcfa: number;
  buyerProtectionFeeFcfa: number;
  salesChannel: SalesChannel;
  commissionRate: number;
  commissionAmountFcfa: number;
  netVendorAmountFcfa: number;
  deliveryMethod: DeliveryMethod;
  deliveryAddress: string;
  deliveryCity: string;
  deliveryPhone: string;
  deliveryNotes?: string;
  deliveryConfirmationCode: string;
  items: PreparedOrderItemData[];
}

@Injectable()
export class OrdersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly subscriptionsService: SubscriptionsService,
  ) {}

  /**
   * Création d'une commande / Checkout multi-boutiques en Transaction ACID
   */
  async checkout(clientId: string, dto: CheckoutDto) {
    if (!dto.items || dto.items.length === 0) {
      throw new BadRequestException('Le panier de commande est vide');
    }

    // 1. Récupération des produits et vérification des stocks
    const productIds = dto.items.map((i) => i.productId);
    const products = await this.prisma.product.findMany({
      where: { id: { in: productIds }, isPublished: true },
      include: {
        shop: {
          include: {
            wallet: true,
          },
        },
        variants: true,
      },
    });

    if (products.length !== productIds.length) {
      throw new BadRequestException('Certains produits du panier sont introuvables ou indisponibles');
    }

    // Vérification des stocks et des quantités pour chaque produit / variante
    for (const item of dto.items) {
      if (!item.quantity || item.quantity <= 0) {
        throw new BadRequestException('La quantité commandée doit être un entier strictement supérieur à 0');
      }

      const prod = products.find((p) => p.id === item.productId);
      if (!prod) {
        throw new BadRequestException('Produit introuvable');
      }

      if (item.variantId) {
        const variant = prod.variants.find(
          (v) => v.id === item.variantId && v.isActive,
        );
        if (!variant) {
          throw new BadRequestException(
            `La variante sélectionnée pour "${prod.name}" est introuvable ou inactive.`,
          );
        }
        if (variant.stock < item.quantity) {
          throw new BadRequestException(
            `Stock insuffisant pour la variante de "${prod.name}". Stock restant : ${variant.stock}`,
          );
        }
      } else {
        if (prod.stock < item.quantity) {
          throw new BadRequestException(
            `Stock insuffisant pour l’article "${prod.name}". Stock restant : ${prod.stock}`,
          );
        }
      }
    }

    // 2. Regroupement des articles par boutique
    const shopGroups = new Map<string, typeof products>();
    for (const item of dto.items) {
      const prod = products.find((p) => p.id === item.productId)!;
      const existing = shopGroups.get(prod.shopId) || [];
      existing.push(prod);
      shopGroups.set(prod.shopId, existing);
    }

    // Contrôle Mode Vacances : Empêcher la commande si l'une des boutiques est fermée
    for (const shopProducts of shopGroups.values()) {
      const shop = shopProducts[0].shop;
      if (shop.isOnVacation) {
        const vacationMsg =
          shop.vacationMessage ||
          'Cette boutique est actuellement fermée pour vacances et ne prend pas de commandes pour le moment.';
        throw new BadRequestException(
          `Impossible de commander auprès de la boutique "${shop.name}" : ${vacationMsg}`,
        );
      }
    }

    // 3. Exécution de la transaction ACID globale
    const createdOrders = await this.prisma.$transaction(async (tx) => {
      // Décrémenter les stocks physiques avec vérification atomique anti-concurrence
      for (const item of dto.items) {
        const prod = products.find((p) => p.id === item.productId)!;

        if (item.variantId) {
          const updatedVariant = await tx.productVariant.update({
            where: { id: item.variantId },
            data: { stock: { decrement: item.quantity } },
          });

          if (updatedVariant.stock < 0) {
            throw new BadRequestException(
              `Rupture de stock concurrente pour la variante sélectionnée de "${prod.name}".`,
            );
          }
        }

        const updatedProduct = await tx.product.update({
          where: { id: item.productId },
          data: { stock: { decrement: item.quantity } },
        });

        if (updatedProduct.stock < 0) {
          throw new BadRequestException(
            `Rupture de stock concurrente pour l’article "${prod.name}". Stock restant insuffisant.`,
          );
        }
      }

      // Gestion du Code Promo (Option A : un code unique applicable à la boutique émettrice)
      let coupon: {
        id: string;
        shopId: string;
        code: string;
        type: CouponType;
        value: number;
        expiryDate: Date;
        maxUses: number | null;
        usedCount: number;
      } | null = null;

      if (dto.couponCode) {
        const normalizedCoupon = dto.couponCode.trim().toUpperCase();
        coupon = await tx.coupon.findFirst({
          where: {
            code: normalizedCoupon,
            shopId: { in: Array.from(shopGroups.keys()) },
            isActive: true,
          },
        });

        if (!coupon) {
          throw new BadRequestException(
            `Le code promo "${normalizedCoupon}" est invalide ou ne s'applique à aucune boutique de cette commande.`,
          );
        }

        if (new Date(coupon.expiryDate).getTime() < Date.now()) {
          throw new BadRequestException(
            `Le code promo "${normalizedCoupon}" a expiré.`,
          );
        }

        if (coupon.maxUses !== null && coupon.usedCount >= coupon.maxUses) {
          throw new BadRequestException(
            `Le code promo "${normalizedCoupon}" a atteint son quota maximal d'utilisations.`,
          );
        }
      }

      // Création de la CheckoutSession globale
      let grandTotalFcfa = 0;
      const ordersToCreate: PreparedOrderData[] = [];

      for (const [shopId, shopProducts] of shopGroups.entries()) {
        const shop = shopProducts[0].shop;

        // Calcul sous-total de cette boutique
        let shopSubtotal = 0;
        const orderItemsData: PreparedOrderItemData[] = [];

        for (const itemDto of dto.items.filter((i) => {
          const p = products.find((prod) => prod.id === i.productId);
          return p && p.shopId === shopId;
        })) {
          const prod = products.find((p) => p.id === itemDto.productId)!;
          const variant = itemDto.variantId
            ? prod.variants.find((v) => v.id === itemDto.variantId)
            : undefined;

          const unitPriceFcfa = variant ? variant.priceFcfa : prod.priceFcfa;
          const lineTotal = unitPriceFcfa * itemDto.quantity;
          shopSubtotal += lineTotal;

          orderItemsData.push({
            productId: prod.id,
            variantId: variant ? variant.id : undefined,
            variantAttributes: variant
              ? (variant.attributes as Prisma.InputJsonValue)
              : undefined,
            productName: prod.name,
            unitPriceFcfa,
            quantity: itemDto.quantity,
            totalPriceFcfa: lineTotal,
          });
        }

        // Calcul de la réduction du coupon si applicable à cette boutique
        let discountAmountFcfa = 0;
        let appliedCouponCode: string | undefined = undefined;
        let appliedCouponId: string | undefined = undefined;

        if (coupon && coupon.shopId === shopId) {
          if (coupon.type === CouponType.PERCENTAGE) {
            discountAmountFcfa = Math.round(
              shopSubtotal * (coupon.value / 100),
            );
          } else {
            discountAmountFcfa = Math.min(shopSubtotal, coupon.value);
          }
          discountAmountFcfa = Math.min(discountAmountFcfa, shopSubtotal);
          appliedCouponCode = coupon.code;
          appliedCouponId = coupon.id;

          // Incrément atomique de l'utilisation du coupon et vérification stricte anti-race-condition
          const updatedCoupon = await tx.coupon.update({
            where: { id: coupon.id },
            data: { usedCount: { increment: 1 } },
          });

          if (
            coupon.maxUses !== null &&
            coupon.maxUses !== undefined &&
            updatedCoupon.usedCount > coupon.maxUses
          ) {
            throw new BadRequestException(
              `Le code promo ${coupon.code} a atteint sa limite maximale d'utilisations.`,
            );
          }
        }

        const discountedSubtotal = shopSubtotal - discountAmountFcfa;
        const deliveryFeeFcfa =
          dto.deliveryMethod === DeliveryMethod.PICKUP ? 0 : 2000;

        // Protection Séquestre & Opérateur Mobile Money (1 % par défaut)
        const gatewayFeeRate = typeof shop.gatewayFeeRate === 'number' ? shop.gatewayFeeRate : 1.0;
        const buyerProtectionFeeFcfa = Math.ceil(discountedSubtotal * (gatewayFeeRate / 100));
        const totalAmountFcfa = discountedSubtotal + deliveryFeeFcfa + buyerProtectionFeeFcfa;
        grandTotalFcfa += totalAmountFcfa;

        // Privilège 0 % de commission pour les forfaits PRO et PREMIUM (en essai, actif ou grâce 72h)
        const hasZeroCommissionPrivilege =
          (shop.subscriptionPlan === SubscriptionPlan.PRO ||
            shop.subscriptionPlan === SubscriptionPlan.PREMIUM) &&
          (shop.subscriptionStatus === SubscriptionStatus.TRIALING ||
            shop.subscriptionStatus === SubscriptionStatus.ACTIVE ||
            shop.subscriptionStatus === SubscriptionStatus.PAST_DUE);

        const commissionRate = hasZeroCommissionPrivilege ? 0 : 3;
        const commissionAmountFcfa = hasZeroCommissionPrivilege
          ? 0
          : Math.round(discountedSubtotal * 0.03);
        const netVendorAmountFcfa = discountedSubtotal - commissionAmountFcfa;

        // Génération du code OTP Tiak-Tiak à 6 chiffres
        const deliveryConfirmationCode = Math.floor(
          100000 + Math.random() * 900000,
        ).toString();

        // Numéro de commande lisible (ex: OB-2026-8492)
        const randomSuffix = Math.floor(1000 + Math.random() * 9000);
        const orderNumber = `OB-${new Date().getFullYear()}-${randomSuffix}`;

        ordersToCreate.push({
          shopId,
          orderNumber,
          subtotalFcfa: shopSubtotal,
          deliveryFeeFcfa,
          discountAmountFcfa,
          couponCode: appliedCouponCode,
          couponId: appliedCouponId,
          totalAmountFcfa,
          buyerProtectionFeeFcfa,
          salesChannel: SalesChannel.MARKETPLACE,
          commissionRate,
          commissionAmountFcfa,
          netVendorAmountFcfa,
          deliveryMethod: dto.deliveryMethod || DeliveryMethod.TIAK_TIAK,
          deliveryAddress: dto.deliveryAddress,
          deliveryCity: dto.deliveryCity || 'Dakar',
          deliveryPhone: dto.deliveryPhone,
          deliveryNotes: dto.deliveryNotes,
          deliveryConfirmationCode,
          items: orderItemsData,
        });
      }

      // Création de la CheckoutSession
      const checkoutSession = await tx.checkoutSession.create({
        data: {
          clientId,
          totalAmountFcfa: grandTotalFcfa,
          paymentProvider: dto.paymentProvider,
          providerReference: `${dto.paymentProvider}_TXN_${Date.now()}`,
          isPaid: true,
          paidAt: new Date(),
        },
      });

      // Création des sous-commandes et de leurs transactions de séquestre
      const results: Order[] = [];
      for (const orderData of ordersToCreate) {
        const orderId = randomUUID();
        const order = await tx.order.create({
          data: {
            id: orderId,
            checkoutSessionId: checkoutSession.id,
            clientId,
            shopId: orderData.shopId,
            orderNumber: orderData.orderNumber,
            invoiceUrl: `/api/v1/orders/${orderId}/invoice`,
            subtotalFcfa: orderData.subtotalFcfa,
            deliveryFeeFcfa: orderData.deliveryFeeFcfa,
            discountAmountFcfa: orderData.discountAmountFcfa,
            couponCode: orderData.couponCode,
            couponId: orderData.couponId,
            totalAmountFcfa: orderData.totalAmountFcfa,
            buyerProtectionFeeFcfa: orderData.buyerProtectionFeeFcfa,
            salesChannel: orderData.salesChannel,
            commissionRate: orderData.commissionRate,
            commissionAmountFcfa: orderData.commissionAmountFcfa,
            netVendorAmountFcfa: orderData.netVendorAmountFcfa,
            deliveryMethod: orderData.deliveryMethod,
            deliveryAddress: orderData.deliveryAddress,
            deliveryCity: orderData.deliveryCity,
            deliveryPhone: orderData.deliveryPhone,
            deliveryNotes: orderData.deliveryNotes,
            deliveryConfirmationCode: orderData.deliveryConfirmationCode,
            status: OrderStatus.PAID_ESCROW, // Paiement validé par le séquestre
            items: {
              create: orderData.items,
            },
            escrow: {
              create: {
                totalAmountFcfa: orderData.totalAmountFcfa,
                commissionAmountFcfa: orderData.commissionAmountFcfa,
                netVendorAmountFcfa: orderData.netVendorAmountFcfa,
                paymentProvider: dto.paymentProvider,
                providerReference: `${dto.paymentProvider}_ORD_${orderData.orderNumber}`,
                status: EscrowStatus.HELD_IN_ESCROW,
                heldAt: new Date(),
              },
            },
          },

          include: {
            items: true,
            escrow: true,
            shop: {
              select: { id: true, name: true, slug: true, whatsappNumber: true },
            },
          },
        });

        // Incrémentation du solde bloqué en séquestre du vendeur
        await tx.vendorWallet.update({
          where: { shopId: orderData.shopId },
          data: {
            escrowBalanceFcfa: { increment: orderData.netVendorAmountFcfa },
          },
        });

        // Historique de suivi initial
        if (tx.orderTracking) {
          await tx.orderTracking.create({
            data: {
              orderId: order.id,
              statusStep: OrderStatus.PAID_ESCROW,
              title: 'Paiement sécurisé sur le séquestre OpenBoutik',
              comment: `Fonds sécurisés sur le compte séquestre via ${dto.paymentProvider}. En attente de préparation par le marchand.`,
            },
          });
        }


        // Audit log
        await tx.auditLog.create({
          data: {
            userId: clientId,
            action: 'ORDER_CREATED_ESCROW_HELD',
            entityType: 'ORDER',
            entityId: order.id,
            metadata: {
              orderNumber: order.orderNumber,
              totalAmountFcfa: order.totalAmountFcfa,
              commissionRate: order.commissionRate,
              netVendorAmountFcfa: order.netVendorAmountFcfa,
            },
          },
        });

        results.push(order);
      }

      return {
        checkoutSession,
        orders: results,
      };
    }, { maxWait: 20000, timeout: 30000 });

    return createdOrders;
  }

  /**
   * Commandes du client connecté (Dev 1 - Espace Client Marketplace)
   */
  async getClientOrders(clientId: string) {
    return this.prisma.order.findMany({
      where: { clientId },
      include: {
        items: true,
        escrow: true,
        dispute: true,
        shop: {
          select: {
            id: true,
            name: true,
            slug: true,
            logoUrl: true,
            whatsappNumber: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Commandes de la boutique du marchand connecté (Dev 2 - Espace Vendeur)
   */
  async getVendorOrders(ownerId: string, status?: OrderStatus) {
    const shop = await this.prisma.shop.findUnique({
      where: { ownerId },
    });

    if (!shop) {
      throw new NotFoundException('Boutique introuvable');
    }

    const where: any = { shopId: shop.id };
    if (status) {
      where.status = status;
    }

    return this.prisma.order.findMany({
      where,
      include: {
        items: true,
        escrow: true,
        dispute: true,
        client: {
          select: { id: true, fullName: true, phone: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Détail d'une commande avec vérification d'accès
   */
  async getOrderById(orderId: string, userId: string, role: Role) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: {
        items: true,
        escrow: true,
        dispute: true,
        shop: true,
        coupon: true,
        notes: role !== Role.CLIENT,
        trackingHistory: {
          orderBy: { timestamp: 'asc' },
        },
        client: {
          select: { id: true, fullName: true, phone: true, email: true },
        },
      },
    });


    if (!order) {
      throw new NotFoundException('Commande introuvable');
    }

    // Vérification d'autorisation (Client propriétaire, Vendeur de la boutique ou Super-Admin)
    if (role === Role.CLIENT && order.clientId !== userId) {
      throw new ForbiddenException('Accès refusé à cette commande');
    }
    if (role === Role.VENDOR && order.shop.ownerId !== userId) {
      throw new ForbiddenException('Accès refusé : cette commande appartient à une autre boutique');
    }

    return order;
  }

  /**
   * Passage en préparation par le vendeur (PREPARING)
   */
  async prepareOrder(orderId: string, ownerId: string) {
    const order = await this.findAndVerifyVendorOrder(orderId, ownerId);

    if (order.status !== OrderStatus.PAID_ESCROW) {
      throw new BadRequestException('Seule une commande payée et séquestrée peut passer en préparation');
    }

    const updated = await this.prisma.order.update({
      where: { id: order.id },
      data: { status: OrderStatus.PREPARING },
    });

    if (this.prisma.orderTracking) {
      await this.prisma.orderTracking.create({
        data: {
          orderId: order.id,
          statusStep: OrderStatus.PREPARING,
          title: 'Commande en cours de préparation chez le vendeur',
          comment: 'Le vendeur a pris en charge la commande et emballe vos articles.',
        },
      });
    }

    return updated;
  }

  /**
   * Prise en charge par le livreur Tiak-Tiak (SHIPPED_TIAK_TIAK)
   */
  async shipOrder(orderId: string, ownerId: string) {
    const order = await this.findAndVerifyVendorOrder(orderId, ownerId);

    if (
      order.status !== OrderStatus.PREPARING &&
      order.status !== OrderStatus.PAID_ESCROW
    ) {
      throw new BadRequestException('La commande doit être payée ou en préparation avant expédition');
    }

    const shippedAt = new Date();
    const autoReleaseHours = Number(process.env.ESCROW_AUTO_RELEASE_HOURS) || 24;
    const autoReleaseAt = new Date(
      shippedAt.getTime() + autoReleaseHours * 60 * 60 * 1000,
    );

    const updated = await this.prisma.order.update({
      where: { id: order.id },
      data: {
        status: OrderStatus.SHIPPED_TIAK_TIAK,
        shippedAt,
        autoReleaseAt,
      },
    });

    if (this.prisma.orderTracking) {
      await this.prisma.orderTracking.create({
        data: {
          orderId: order.id,
          statusStep: OrderStatus.SHIPPED_TIAK_TIAK,
          title: 'Colis remis au livreur Tiak-Tiak',
          comment: 'Votre colis est en route. Veuillez transmettre votre code OTP au livreur à la réception.',
        },
      });
    }

    return updated;
  }



  /**
   * Confirmation de réception et déblocage du séquestre en transaction ACID
   */
  async confirmDelivery(
    orderId: string,
    userId: string,
    userRole: Role,
    dto: ConfirmDeliveryDto,
  ) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: {
        escrow: true,
        shop: true,
      },
    });

    if (!order) {
      throw new NotFoundException('Commande introuvable');
    }

    if (order.status === OrderStatus.PENDING_PAYMENT) {
      throw new BadRequestException('Cette commande n’a pas encore été payée');
    }

    if (
      order.status === OrderStatus.CANCELLED ||
      order.status === OrderStatus.REFUNDED
    ) {
      throw new BadRequestException('Cette commande a été annulée ou remboursée');
    }

    if (order.status === OrderStatus.DELIVERED_CONFIRMED) {
      throw new BadRequestException('Cette commande a déjà été confirmée et livrée');
    }

    if (order.status === OrderStatus.DISPUTED) {
      throw new BadRequestException('Cette commande fait l’objet d’un litige gelé en cours d’arbitrage');
    }

    // Contrôle d'accès et vérification du code OTP
    const isClient = userRole === Role.CLIENT && order.clientId === userId;
    const isVendor = userRole === Role.VENDOR && order.shop.ownerId === userId;
    const isSuperAdmin = userRole === Role.SUPER_ADMIN;

    if (!isClient && !isVendor && !isSuperAdmin) {
      throw new ForbiddenException('Vous n’êtes pas autorisé à valider la livraison de cette commande');
    }

    // Si c'est le vendeur ou un livreur qui valide, le code OTP 6 chiffres est obligatoire
    if (isVendor) {
      if (!dto.confirmationCode) {
        throw new BadRequestException('Le code de confirmation OTP à 6 chiffres est obligatoire pour le vendeur/livreur');
      }
      if (dto.confirmationCode !== order.deliveryConfirmationCode) {
        throw new BadRequestException('Code de confirmation OTP invalide');
      }
    }

    // Transaction ACID : Libération du séquestre et versement vers le VendorWallet
    const updatedOrder = await this.prisma.$transaction(async (tx) => {
      // 1. Mettre à jour la commande avec garde atomique au niveau SQL
      const orderUpdate = await tx.order.updateMany({
        where: {
          id: order.id,
          status: {
            notIn: [
              OrderStatus.DELIVERED_CONFIRMED,
              OrderStatus.DISPUTED,
              OrderStatus.REFUNDED,
              OrderStatus.CANCELLED,
            ],
          },
        },
        data: {
          status: OrderStatus.DELIVERED_CONFIRMED,
          deliveredAt: new Date(),
        },
      });

      if (orderUpdate.count === 0) {
        throw new BadRequestException('Cette commande a déjà été confirmée ou fait l’objet d’un litige');
      }

      // 2. Mettre à jour la transaction de séquestre avec garde atomique
      const escrowUpdate = await tx.escrowTransaction.updateMany({
        where: {
          orderId: order.id,
          status: EscrowStatus.HELD_IN_ESCROW,
        },
        data: {
          status: EscrowStatus.RELEASED_TO_VENDOR,
          releasedAt: new Date(),
        },
      });

      if (escrowUpdate.count === 0) {
        throw new BadRequestException('Le séquestre de cette commande n’est plus en attente de libération');
      }

      // 3. Débloquer l'argent dans le portefeuille du vendeur
      await tx.vendorWallet.update({
        where: { shopId: order.shopId },
        data: {
          escrowBalanceFcfa: { decrement: order.netVendorAmountFcfa },
          availableBalanceFcfa: { increment: order.netVendorAmountFcfa },
          totalEarnedFcfa: { increment: order.netVendorAmountFcfa },
        },
      });

      // 3b. Phase 5 : Cumul des économies de commission réalisées par le marchand (0 % vs 3 %)
      if (order.commissionAmountFcfa === 0 && order.subtotalFcfa > 0) {
        const savedCommission = Math.round(
          (order.subtotalFcfa - order.discountAmountFcfa) * 0.03,
        );
        if (savedCommission > 0) {
          await tx.shop.update({
            where: { id: order.shopId },
            data: {
              totalCommissionSavedFcfa: { increment: savedCommission },
            },
          });
        }
      }

      // 3c. Phase 5 : Auto-Sweep — prélèvement automatique de l'abonnement en souffrance dès encaissement
      await this.subscriptionsService.autoSweepIfDue(order.shopId, tx);

      // 4. Étape de confirmation dans l'historique OrderTracking
      if (tx.orderTracking) {
        await tx.orderTracking.create({
          data: {
            orderId: order.id,
            statusStep: OrderStatus.DELIVERED_CONFIRMED,
            title: 'Livraison confirmée avec succès',
            comment: 'Colis remis, code OTP validé et fonds libérés au marchand.',
          },
        });
      }


      // 5. Audit Log immuable
      await tx.auditLog.create({
        data: {
          userId,
          action: 'ESCROW_RELEASED_TO_VENDOR',
          entityType: 'ORDER',
          entityId: order.id,
          metadata: {
            orderNumber: order.orderNumber,
            netVendorAmountFcfa: order.netVendorAmountFcfa,
            commissionAmountFcfa: order.commissionAmountFcfa,
            validatedByRole: userRole,
          },
        },
      });

      const confirmedOrder = await tx.order.findUnique({
        where: { id: order.id },
        include: { escrow: true, trackingHistory: true },
      });

      return confirmedOrder;
    }, { maxWait: 20000, timeout: 30000 });

    return updatedOrder;
  }

  /**
   * Consultation de la chronologie complète de livraison (Stepper / Timeline)
   */
  async getOrderTracking(orderId: string, userId: string, role: Role) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: {
        shop: true,
        trackingHistory: {
          orderBy: { timestamp: 'asc' },
        },
      },
    });

    if (!order) {
      throw new NotFoundException('Commande introuvable');
    }

    const isClient = order.clientId === userId;
    const isVendor = order.shop.ownerId === userId;
    const isAdmin = role === Role.SUPER_ADMIN;

    if (!isClient && !isVendor && !isAdmin) {
      throw new ForbiddenException('Accès refusé au suivi de cette commande');
    }

    return {
      orderId: order.id,
      orderNumber: order.orderNumber,
      status: order.status,
      deliveryMethod: order.deliveryMethod,
      tracking: order.trackingHistory,
    };
  }


  /**
   * Ajout d'un mémo interne confidentiel vendeur sur une commande
   */
  async addOrderNote(
    orderId: string,
    vendorId: string,
    dto: CreateOrderNoteDto,
  ) {
    const order = await this.findAndVerifyVendorOrder(orderId, vendorId);

    return this.prisma.orderNote.create({
      data: {
        orderId: order.id,
        text: dto.text.trim(),
      },
    });
  }

  /**
   * Consultation des mémos internes (Strictement réservé au vendeur et admin)
   */
  async getOrderNotes(orderId: string, userId: string, role: Role) {
    if (role === Role.CLIENT) {
      throw new ForbiddenException(
        'Accès refusé : les mémos internes sont réservés exclusivement au marchand.',
      );
    }

    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: { shop: true },
    });

    if (!order) {
      throw new NotFoundException('Commande introuvable');
    }

    if (role === Role.VENDOR && order.shop.ownerId !== userId) {
      throw new ForbiddenException(
        'Accès refusé : cette commande appartient à une autre boutique',
      );
    }

    return this.prisma.orderNote.findMany({
      where: { orderId: order.id },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Génération et streaming direct du reçu/facture PDF (Option A)
   */
  async generateInvoicePdf(
    orderId: string,
    userId: string,
    role: Role,
    res: Response,
  ) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: {
        shop: true,
        client: {
          select: { id: true, fullName: true, phone: true, email: true },
        },
        items: true,
        coupon: true,
      },
    });

    if (!order) {
      throw new NotFoundException('Commande introuvable');
    }

    if (role === Role.CLIENT && order.clientId !== userId) {
      throw new ForbiddenException('Accès refusé à cette facture');
    }

    if (role === Role.VENDOR && order.shop.ownerId !== userId) {
      throw new ForbiddenException(
        'Accès refusé : cette commande appartient à une autre boutique',
      );
    }

    if (!order.invoiceUrl) {
      await this.prisma.order.update({
        where: { id: order.id },
        data: { invoiceUrl: `/api/v1/orders/${order.id}/invoice` },
      });
      order.invoiceUrl = `/api/v1/orders/${order.id}/invoice`;
    }

    const doc = new PDFDocument({ margin: 50, size: 'A4' });

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="facture-${order.orderNumber}.pdf"`,
    );

    doc.pipe(res);

    // En-tête OpenBoutik
    doc
      .fontSize(22)
      .fillColor('#10B981')
      .text('OpenBoutik Senegal', 50, 50);
    doc
      .fontSize(10)
      .fillColor('#6B7280')
      .text('Plateforme E-commerce & Séquestre Mobile Money', 50, 75);
    doc.text('Dakar, Sénégal - https://openboutik.sn', 50, 88);

    // Titre Reçu & Date
    doc
      .fontSize(16)
      .fillColor('#111827')
      .text(`REÇU D'ACHAT N° ${order.orderNumber}`, 300, 50, { align: 'right' });
    doc
      .fontSize(10)
      .fillColor('#4B5563')
      .text(
        `Date : ${order.createdAt.toLocaleDateString('fr-FR')} ${order.createdAt.toLocaleTimeString('fr-FR')}`,
        300,
        75,
        { align: 'right' },
      );
    doc.text(`Statut : ${order.status}`, 300, 88, { align: 'right' });

    doc.moveTo(50, 110).lineTo(550, 110).strokeColor('#E5E7EB').stroke();

    // Informations Marchand & Acheteur (2 colonnes)
    const topDetails = 125;
    doc
      .fontSize(11)
      .fillColor('#111827')
      .text('Boutique Vendeuse :', 50, topDetails);
    doc
      .fontSize(10)
      .fillColor('#4B5563')
      .text(order.shop.name, 50, topDetails + 16);
    doc.text(`Ville : ${order.shop.city}`, 50, topDetails + 30);
    if (order.shop.whatsappNumber) {
      doc.text(`WhatsApp : ${order.shop.whatsappNumber}`, 50, topDetails + 44);
    }

    doc
      .fontSize(11)
      .fillColor('#111827')
      .text('Destinataire / Client :', 320, topDetails);
    doc
      .fontSize(10)
      .fillColor('#4B5563')
      .text(order.client.fullName, 320, topDetails + 16);
    doc.text(`Téléphone : ${order.deliveryPhone}`, 320, topDetails + 30);
    doc.text(
      `Adresse : ${order.deliveryAddress}, ${order.deliveryCity}`,
      320,
      topDetails + 44,
    );
    doc.text(`Mode livraison : ${order.deliveryMethod}`, 320, topDetails + 58);

    doc.moveTo(50, 205).lineTo(550, 205).strokeColor('#E5E7EB').stroke();

    // Tableau des articles
    const tableTop = 220;
    doc
      .fontSize(10)
      .fillColor('#111827')
      .text('Article / Produit', 50, tableTop)
      .text('Qté', 310, tableTop, { align: 'center' })
      .text('Prix unitaire', 360, tableTop, { align: 'right' })
      .text('Total FCFA', 470, tableTop, { align: 'right' });

    doc.moveTo(50, tableTop + 14).lineTo(550, tableTop + 14).strokeColor('#D1D5DB').stroke();

    let yPosition = tableTop + 22;
    for (const item of order.items) {
      let displayName = item.productName;
      if (item.variantAttributes && typeof item.variantAttributes === 'object') {
        const attrs = Object.entries(item.variantAttributes as Record<string, any>)
          .map(([k, v]) => `${k}: ${v}`)
          .join(', ');
        if (attrs) {
          displayName += ` (${attrs})`;
        }
      }

      doc
        .fontSize(9)
        .fillColor('#374151')
        .text(displayName, 50, yPosition, { width: 250 })
        .text(item.quantity.toString(), 310, yPosition, { align: 'center' })
        .text(`${item.unitPriceFcfa.toLocaleString('fr-FR')} FCFA`, 360, yPosition, { align: 'right' })
        .text(`${item.totalPriceFcfa.toLocaleString('fr-FR')} FCFA`, 470, yPosition, { align: 'right' });

      yPosition += 20;
    }

    doc.moveTo(50, yPosition + 5).lineTo(550, yPosition + 5).strokeColor('#E5E7EB').stroke();
    yPosition += 18;

    // Récapitulatif financier
    const subtotalText = `${order.subtotalFcfa.toLocaleString('fr-FR')} FCFA`;
    doc.fontSize(10).fillColor('#4B5563').text('Sous-total articles :', 320, yPosition).text(subtotalText, 470, yPosition, { align: 'right' });
    yPosition += 16;

    if (order.discountAmountFcfa > 0) {
      doc
        .fillColor('#059669')
        .text(`Réduction Code Promo (${order.couponCode || 'PROMO'}) :`, 320, yPosition)
        .text(`-${order.discountAmountFcfa.toLocaleString('fr-FR')} FCFA`, 470, yPosition, { align: 'right' });
      yPosition += 16;
    }

    const deliveryText = `${order.deliveryFeeFcfa.toLocaleString('fr-FR')} FCFA`;
    doc
      .fillColor('#4B5563')
      .text(`Frais de livraison (${order.deliveryMethod}) :`, 320, yPosition)
      .text(deliveryText, 470, yPosition, { align: 'right' });
    yPosition += 20;

    doc.rect(310, yPosition - 4, 240, 26).fillColor('#F3F4F6').fill();
    doc
      .fontSize(11)
      .fillColor('#111827')
      .text('TOTAL PAYÉ (TTC) :', 320, yPosition + 3)
      .text(`${order.totalAmountFcfa.toLocaleString('fr-FR')} FCFA`, 470, yPosition + 3, { align: 'right' });

    // Pied de page légal et séquestre
    const footerTop = 700;
    doc.moveTo(50, footerTop).lineTo(550, footerTop).strokeColor('#E5E7EB').stroke();
    doc
      .fontSize(8)
      .fillColor('#9CA3AF')
      .text(
        'Transaction protégée par le service de Séquestre OpenBoutik. Les fonds sont garantis jusqu’à confirmation de livraison.',
        50,
        footerTop + 10,
        { align: 'center', width: 500 },
      )
      .text(
        'OpenBoutik SAS - Plateforme e-commerce sécurisée au Sénégal - Dakar',
        50,
        footerTop + 22,
        { align: 'center', width: 500 },
      );

    doc.end();
  }

  private async findAndVerifyVendorOrder(orderId: string, ownerId: string) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: { shop: true },
    });

    if (!order) {
      throw new NotFoundException('Commande introuvable');
    }

    if (order.shop.ownerId !== ownerId) {
      throw new ForbiddenException('Cette commande n’appartient pas à votre boutique');
    }

    return order;
  }

  private getCommissionRate(plan: SubscriptionPlan): number {
    switch (plan) {
      case SubscriptionPlan.PREMIUM:
      case SubscriptionPlan.PRO:
        return 0;
      case SubscriptionPlan.FREE:
      default:
        return 3;
    }
  }
}
