import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCouponDto } from './dto/create-coupon.dto';
import { UpdateCouponDto } from './dto/update-coupon.dto';
import { ValidateCouponDto } from './dto/validate-coupon.dto';
import { CouponType } from '../generated/prisma/client';

@Injectable()
export class CouponsService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Création d'un code promotionnel par le marchand pour sa boutique
   */
  async createCoupon(userId: string, dto: CreateCouponDto) {
    const shop = await this.prisma.shop.findUnique({
      where: { ownerId: userId },
    });

    if (!shop) {
      throw new ForbiddenException(
        'Vous devez posséder une boutique pour créer un code promotionnel.',
      );
    }

    const normalizedCode = dto.code.trim().toUpperCase();

    // Vérifier l'unicité du code dans la boutique
    const existing = await this.prisma.coupon.findUnique({
      where: {
        shopId_code: {
          shopId: shop.id,
          code: normalizedCode,
        },
      },
    });

    if (existing) {
      throw new BadRequestException(
        `Le code promo "${normalizedCode}" existe déjà pour votre boutique.`,
      );
    }

    // Validation des valeurs selon le type
    if (dto.type === CouponType.PERCENTAGE) {
      if (dto.value < 1 || dto.value > 90) {
        throw new BadRequestException(
          'Le pourcentage de réduction doit être compris entre 1% et 90%.',
        );
      }
    } else if (dto.type === CouponType.FIXED_FCFA) {
      if (dto.value < 100) {
        throw new BadRequestException(
          'Le montant de réduction fixe doit être d’au moins 100 FCFA.',
        );
      }
    }

    const expiry = new Date(dto.expiryDate);
    if (isNaN(expiry.getTime()) || expiry.getTime() <= Date.now()) {
      throw new BadRequestException(
        'La date d’expiration doit être une date valide située dans le futur.',
      );
    }

    return this.prisma.coupon.create({
      data: {
        shopId: shop.id,
        code: normalizedCode,
        type: dto.type,
        value: dto.value,
        expiryDate: expiry,
        maxUses: dto.maxUses ?? null,
        isActive: true,
      },
    });
  }

  /**
   * Liste de tous les codes promotionnels créés par le marchand
   */
  async getShopCoupons(userId: string) {
    const shop = await this.prisma.shop.findUnique({
      where: { ownerId: userId },
    });

    if (!shop) {
      throw new ForbiddenException(
        'Vous devez posséder une boutique pour consulter vos codes promotionnels.',
      );
    }

    return this.prisma.coupon.findMany({
      where: { shopId: shop.id },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Mise à jour d'un code promotionnel (valeur, date d'expiration, statut actif)
   */
  async updateCoupon(userId: string, couponId: string, dto: UpdateCouponDto) {
    const shop = await this.prisma.shop.findUnique({
      where: { ownerId: userId },
    });

    if (!shop) {
      throw new ForbiddenException(
        'Vous devez posséder une boutique pour modifier un code promotionnel.',
      );
    }

    const coupon = await this.prisma.coupon.findUnique({
      where: { id: couponId },
    });

    if (!coupon) {
      throw new NotFoundException('Code promotionnel introuvable.');
    }

    if (coupon.shopId !== shop.id) {
      throw new ForbiddenException(
        'Action non autorisée sur ce code promotionnel.',
      );
    }

    if (dto.value !== undefined) {
      if (coupon.type === CouponType.PERCENTAGE) {
        if (dto.value < 1 || dto.value > 90) {
          throw new BadRequestException(
            'Le pourcentage de réduction doit être compris entre 1% et 90%.',
          );
        }
      } else if (coupon.type === CouponType.FIXED_FCFA) {
        if (dto.value < 100) {
          throw new BadRequestException(
            'Le montant fixe de réduction doit être d’au moins 100 FCFA.',
          );
        }
      }
    }

    let expiryDate: Date | undefined;
    if (dto.expiryDate !== undefined) {
      expiryDate = new Date(dto.expiryDate);
      if (isNaN(expiryDate.getTime()) || expiryDate.getTime() <= Date.now()) {
        throw new BadRequestException(
          'La date d’expiration doit être située dans le futur.',
        );
      }
    }

    return this.prisma.coupon.update({
      where: { id: couponId },
      data: {
        ...(dto.value !== undefined && { value: dto.value }),
        ...(expiryDate !== undefined && { expiryDate }),
        ...(dto.maxUses !== undefined && { maxUses: dto.maxUses }),
        ...(dto.isActive !== undefined && { isActive: dto.isActive }),
      },
    });
  }

  /**
   * Suppression d'un code promo (BOLA)
   */
  async deleteCoupon(userId: string, couponId: string) {
    const shop = await this.prisma.shop.findUnique({
      where: { ownerId: userId },
    });

    if (!shop) {
      throw new ForbiddenException(
        'Vous devez posséder une boutique pour supprimer un code promotionnel.',
      );
    }

    const coupon = await this.prisma.coupon.findUnique({
      where: { id: couponId },
    });

    if (!coupon) {
      throw new NotFoundException('Code promotionnel introuvable.');
    }

    if (coupon.shopId !== shop.id) {
      throw new ForbiddenException(
        'Action non autorisée sur ce code promotionnel.',
      );
    }

    await this.prisma.coupon.delete({
      where: { id: couponId },
    });

    return { message: 'Code promotionnel supprimé avec succès.' };
  }

  /**
   * Validation d'un code promo par un client avant paiement
   */
  async validateCoupon(dto: ValidateCouponDto) {
    const normalizedCode = dto.code.trim().toUpperCase();

    const coupon = await this.prisma.coupon.findUnique({
      where: {
        shopId_code: {
          shopId: dto.shopId,
          code: normalizedCode,
        },
      },
    });

    if (!coupon || !coupon.isActive) {
      throw new BadRequestException('Code promotionnel invalide ou inactif.');
    }

    if (new Date(coupon.expiryDate).getTime() < Date.now()) {
      throw new BadRequestException('Ce code promotionnel a expiré.');
    }

    if (coupon.maxUses !== null && coupon.usedCount >= coupon.maxUses) {
      throw new BadRequestException(
        'Ce code promotionnel a atteint son quota maximal d’utilisations.',
      );
    }

    let discountAmountFcfa = 0;
    if (coupon.type === CouponType.PERCENTAGE) {
      discountAmountFcfa = Math.round(
        dto.subtotalFcfa * (coupon.value / 100),
      );
    } else {
      discountAmountFcfa = Math.min(dto.subtotalFcfa, coupon.value);
    }

    discountAmountFcfa = Math.min(discountAmountFcfa, dto.subtotalFcfa);
    const newSubtotalFcfa = dto.subtotalFcfa - discountAmountFcfa;

    return {
      valid: true,
      couponId: coupon.id,
      code: coupon.code,
      type: coupon.type,
      value: coupon.value,
      discountAmountFcfa,
      newSubtotalFcfa,
    };
  }
}
