import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { RequestPayoutDto } from './dto/request-payout.dto';
import { Prisma, PayoutStatus, KycStatus } from '../generated/prisma/client';

@Injectable()
export class WalletsService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Consultation du portefeuille de la boutique du marchand connecté
   */
  async getVendorWallet(ownerId: string) {
    const shop = await this.prisma.shop.findUnique({
      where: { ownerId },
      include: {
        wallet: {
          include: {
            payouts: {
              orderBy: { createdAt: 'desc' },
              take: 20,
            },
          },
        },
      },
    });

    if (!shop || !shop.wallet) {
      throw new NotFoundException('Portefeuille introuvable pour ce marchand');
    }

    return {
      shopId: shop.id,
      shopName: shop.name,
      wallet: shop.wallet,
    };
  }

  /**
   * Demande de retrait de fonds disponibles vers Wave ou Orange Money
   */
  async requestPayout(ownerId: string, dto: RequestPayoutDto) {
    const shop = await this.prisma.shop.findUnique({
      where: { ownerId },
      include: { wallet: true },
    });

    if (!shop || !shop.wallet) {
      throw new NotFoundException('Boutique ou portefeuille introuvable');
    }

    // Verrouillage de sécurité financière : KYC CNI obligatoire au retrait
    if (shop.kycStatus !== KycStatus.VERIFIED) {
      throw new ForbiddenException(
        "Retrait impossible : Votre compte marchand doit être certifié (KYC) avant tout décaissement de vos fonds. Veuillez soumettre votre pièce d'identité (CNI) dans votre espace vendeur.",
      );
    }

    if (!dto.amountFcfa || dto.amountFcfa <= 0) {
      throw new BadRequestException('Le montant du retrait doit être un entier strictement supérieur à 0 FCFA');
    }

    if (dto.amountFcfa > shop.wallet.availableBalanceFcfa) {
      throw new BadRequestException(
        `Solde insuffisant. Vous disposez de ${shop.wallet.availableBalanceFcfa} FCFA disponibles, mais vous avez demandé un retrait de ${dto.amountFcfa} FCFA.`,
      );
    }

    const providerReference = `${dto.provider}_PAYOUT_${Date.now()}_${Math.floor(1000 + Math.random() * 9000)}`;

    const result = await this.prisma.$transaction(async (tx) => {
      // 1. Débiter immédiatement le solde disponible avec contrôle atomique anti-double-dépense
      const updatedWallet = await tx.vendorWallet.update({
        where: { id: shop.wallet!.id },
        data: {
          availableBalanceFcfa: { decrement: dto.amountFcfa },
        },
      });

      if (updatedWallet.availableBalanceFcfa < 0) {
        throw new BadRequestException(
          `Solde insuffisant lors du traitement de retrait concurrent. Le solde ne peut pas être négatif.`,
        );
      }

      // 2. Créer l'enregistrement de décaissement (statut PROCESSED pour sandbox/dev immédiat)
      const payout = await tx.walletPayout.create({
        data: {
          walletId: shop.wallet!.id,
          amountFcfa: dto.amountFcfa,
          provider: dto.provider,
          recipientPhone: dto.recipientPhone,
          status: PayoutStatus.PROCESSED,
          providerReference,
          processedAt: new Date(),
        },
      });

      // 3. Journal d'audit immuable
      await tx.auditLog.create({
        data: {
          userId: ownerId,
          action: 'WALLET_PAYOUT_PROCESSED',
          entityType: 'WALLET',
          entityId: shop.wallet!.id,
          metadata: {
            amountFcfa: dto.amountFcfa,
            provider: dto.provider,
            recipientPhone: dto.recipientPhone,
            providerReference,
          },
        },
      });

      return {
        payout,
        remainingBalanceFcfa: updatedWallet.availableBalanceFcfa,
      };
    });

    return result;
  }

  /**
   * Supervision globale de tous les retraits pour le Super-Admin
   */
  async getAllPayouts(status?: PayoutStatus) {
    const where: Prisma.WalletPayoutWhereInput = {};
    if (status) {
      where.status = status;
    }

    return this.prisma.walletPayout.findMany({
      where,
      include: {
        wallet: {
          include: {
            shop: {
              select: { id: true, name: true, slug: true, ownerId: true },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }
}
