import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { OpenDisputeDto } from './dto/open-dispute.dto';
import { ArbitrateDisputeDto, DisputeDecision } from './dto/arbitrate-dispute.dto';
import {
  Prisma,
  OrderStatus,
  EscrowStatus,
  DisputeStatus,
  Role,
} from '../generated/prisma/client';

@Injectable()
export class DisputesService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Ouverture d'un litige par l'acheteur (Gel automatique du séquestre)
   */
  async openDispute(clientId: string, orderId: string, dto: OpenDisputeDto) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: {
        escrow: true,
        dispute: true,
      },
    });

    if (!order) {
      throw new NotFoundException('Commande introuvable');
    }

    if (order.clientId !== clientId) {
      throw new ForbiddenException('Vous ne pouvez ouvrir un litige que sur vos propres commandes');
    }

    if (order.dispute) {
      throw new BadRequestException('Un litige est déjà ouvert ou a été traité pour cette commande');
    }

    if (order.status === OrderStatus.REFUNDED) {
      throw new BadRequestException('Cette commande a déjà été remboursée');
    }

    if (order.status === OrderStatus.DELIVERED_CONFIRMED) {
      throw new BadRequestException(
        'La commande a déjà été confirmée comme livrée et les fonds ont été débloqués au marchand. Veuillez contacter le support direct.',
      );
    }

    // Transaction ACID : Gel du séquestre et passage de la commande en litige
    const dispute = await this.prisma.$transaction(async (tx) => {
      // 1. Passer la commande en DISPUTED avec garde atomique au niveau SQL
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
        data: { status: OrderStatus.DISPUTED },
      });

      if (orderUpdate.count === 0) {
        throw new BadRequestException('Impossible d’ouvrir un litige : la commande est déjà confirmée livrée ou déjà en litige');
      }

      // 2. Geler le séquestre avec garde atomique (neutralise tout déblocage)
      const escrowUpdate = await tx.escrowTransaction.updateMany({
        where: {
          orderId: order.id,
          status: EscrowStatus.HELD_IN_ESCROW,
        },
        data: {
          status: EscrowStatus.FROZEN_BY_DISPUTE,
          frozenAt: new Date(),
        },
      });

      if (escrowUpdate.count === 0) {
        throw new BadRequestException('Le séquestre de cette commande ne peut plus être gelé');
      }

      // 3. Créer l'enregistrement du litige
      const createdDispute = await tx.dispute.create({
        data: {
          orderId: order.id,
          clientId,
          reason: dto.reason,
          evidenceUrls: dto.evidenceUrls || [],
          status: DisputeStatus.OPEN,
        },
        include: {
          order: {
            include: {
              shop: { select: { id: true, name: true, slug: true } },
            },
          },
        },
      });

      // 4. Étape de litige dans l'historique OrderTracking
      if (tx.orderTracking) {
        await tx.orderTracking.create({
          data: {
            orderId: order.id,
            statusStep: OrderStatus.DISPUTED,
            title: 'Litige ouvert par le client - Séquestre gelé',
            comment: `Motif : ${dto.reason}`,
          },
        });
      }


      // 5. Audit Log immuable
      await tx.auditLog.create({
        data: {
          userId: clientId,
          action: 'DISPUTE_OPENED_ESCROW_FROZEN',
          entityType: 'DISPUTE',
          entityId: createdDispute.id,
          metadata: {
            orderNumber: order.orderNumber,
            reason: dto.reason,
            totalAmountFcfa: order.totalAmountFcfa,
          },
        },
      });

      return createdDispute;
    }, { maxWait: 20000, timeout: 30000 });

    return dispute;
  }

  /**
   * Liste complète des litiges pour le back-office Super-Admin
   */
  async getAllDisputes(status?: DisputeStatus) {
    const where: Prisma.DisputeWhereInput = {};
    if (status) {
      where.status = status;
    }

    return this.prisma.dispute.findMany({
      where,
      include: {
        order: {
          include: {
            shop: { select: { id: true, name: true, slug: true, whatsappNumber: true } },
            escrow: true,
          },
        },
        client: {
          select: { id: true, fullName: true, phone: true, email: true },
        },
        arbitratedBy: {
          select: { id: true, fullName: true, email: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Consultation détaillée d'un dossier de litige
   */
  async getDisputeById(disputeId: string, userId: string, role: Role) {
    const dispute = await this.prisma.dispute.findUnique({
      where: { id: disputeId },
      include: {
        order: {
          include: {
            shop: true,
            escrow: true,
            items: true,
          },
        },
        client: {
          select: { id: true, fullName: true, phone: true, email: true },
        },
        arbitratedBy: {
          select: { id: true, fullName: true, email: true },
        },
      },
    });

    if (!dispute) {
      throw new NotFoundException('Dossier de litige introuvable');
    }

    if (role === Role.CLIENT && dispute.clientId !== userId) {
      throw new ForbiddenException('Accès refusé à ce litige');
    }

    if (role === Role.VENDOR && dispute.order.shop.ownerId !== userId) {
      throw new ForbiddenException('Accès refusé : ce litige ne concerne pas votre boutique');
    }

    return dispute;
  }

  /**
   * Arbitrage officiel par le Super-Admin (Équipe Dev OpenBoutik)
   */
  async arbitrateDispute(
    superAdminId: string,
    disputeId: string,
    dto: ArbitrateDisputeDto,
  ) {
    const dispute = await this.prisma.dispute.findUnique({
      where: { id: disputeId },
      include: {
        order: {
          include: { escrow: true },
        },
      },
    });

    if (!dispute) {
      throw new NotFoundException('Dossier de litige introuvable');
    }

    if (dispute.status !== DisputeStatus.OPEN && dispute.status !== DisputeStatus.UNDER_REVIEW) {
      throw new BadRequestException('Ce litige a déjà été arbitré et clôturé');
    }

    const now = new Date();

    const resolved = await this.prisma.$transaction(async (tx) => {
      if (dto.decision === DisputeDecision.REFUND_CLIENT) {
        // --- CAS 1 : REMBOURSEMENT DU CLIENT ---
        const updatedDispute = await tx.dispute.update({
          where: { id: dispute.id },
          data: {
            status: DisputeStatus.RESOLVED_REFUND_CLIENT,
            arbitratedById: superAdminId,
            decisionNotes: dto.decisionNotes,
            resolvedAt: now,
          },
        });

        await tx.order.update({
          where: { id: dispute.orderId },
          data: { status: OrderStatus.REFUNDED },
        });

        await tx.escrowTransaction.update({
          where: { orderId: dispute.orderId },
          data: {
            status: EscrowStatus.REFUNDED_TO_CLIENT,
            refundedAt: now,
          },
        });

        // Déduction des fonds bloqués du vendeur (l'argent n'est jamais versé au marchand)
        await tx.vendorWallet.update({
          where: { shopId: dispute.order.shopId },
          data: {
            escrowBalanceFcfa: { decrement: dispute.order.netVendorAmountFcfa },
          },
        });

        await tx.auditLog.create({
          data: {
            userId: superAdminId,
            action: 'DISPUTE_ARBITRATED_REFUND_CLIENT',
            entityType: 'DISPUTE',
            entityId: dispute.id,
            metadata: {
              orderNumber: dispute.order.orderNumber,
              refundAmountFcfa: dispute.order.totalAmountFcfa,
              notes: dto.decisionNotes,
            },
          },
        });

        return updatedDispute;
      } else {
        // --- CAS 2 : LIBÉRATION VERS LE MARCHAND ---
        const updatedDispute = await tx.dispute.update({
          where: { id: dispute.id },
          data: {
            status: DisputeStatus.RESOLVED_RELEASE_VENDOR,
            arbitratedById: superAdminId,
            decisionNotes: dto.decisionNotes,
            resolvedAt: now,
          },
        });

        await tx.order.update({
          where: { id: dispute.orderId },
          data: {
            status: OrderStatus.DELIVERED_CONFIRMED,
            deliveredAt: now,
          },
        });

        await tx.escrowTransaction.update({
          where: { orderId: dispute.orderId },
          data: {
            status: EscrowStatus.RELEASED_TO_VENDOR,
            releasedAt: now,
          },
        });

        // Libération des fonds vers le solde disponible du vendeur
        await tx.vendorWallet.update({
          where: { shopId: dispute.order.shopId },
          data: {
            escrowBalanceFcfa: { decrement: dispute.order.netVendorAmountFcfa },
            availableBalanceFcfa: { increment: dispute.order.netVendorAmountFcfa },
            totalEarnedFcfa: { increment: dispute.order.netVendorAmountFcfa },
          },
        });

        await tx.auditLog.create({
          data: {
            userId: superAdminId,
            action: 'DISPUTE_ARBITRATED_RELEASE_VENDOR',
            entityType: 'DISPUTE',
            entityId: dispute.id,
            metadata: {
              orderNumber: dispute.order.orderNumber,
              netVendorAmountFcfa: dispute.order.netVendorAmountFcfa,
              notes: dto.decisionNotes,
            },
          },
        });

        return updatedDispute;
      }
    }, { maxWait: 20000, timeout: 30000 });

    return resolved;
  }
}
