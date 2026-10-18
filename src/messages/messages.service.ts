import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';

import { PrismaService } from '../prisma/prisma.service';
import { SendMessageDto } from './dto/send-message.dto';
import { ChatGateway } from './chat.gateway';
import { OrderStatus } from '../generated/prisma/client';

@Injectable()
export class MessagesService {
  // Regex pour détecter les numéros sénégalais (formats: +221 77 123 45 67, 771234567, 76.543.21.09, etc.)
  private static readonly SENEGAL_PHONE_REGEX =
    /(?:(?:\+221|00221)[\s.-]*)?(?:70|75|76|77|78)(?:[\s.-]*\d){7}/gi;

  private static readonly MASKED_NOTICE =
    '[Numéro masqué par sécurité OpenBoutik - Veuillez finaliser la commande sur le séquestre]';

  constructor(
    private readonly prisma: PrismaService,
    private readonly chatGateway: ChatGateway,
  ) {}


  /**
   * Filtrage et masquage des numéros de téléphone sénégalais si non payé
   */
  private maskPhoneNumbers(text: string): string {
    return text.replace(MessagesService.SENEGAL_PHONE_REGEX, MessagesService.MASKED_NOTICE);
  }

  /**
   * 1. Envoyer un message interne avec protection anti-fuite séquestre
   */
  async sendMessage(senderId: string, dto: SendMessageDto) {
    if (senderId === dto.receiverId) {
      throw new BadRequestException('Vous ne pouvez pas vous envoyer un message à vous-même');
    }

    const receiver = await this.prisma.user.findUnique({
      where: { id: dto.receiverId },
    });

    if (!receiver) {
      throw new NotFoundException('Destinataire introuvable');
    }

    // Vérification de la commande pour l'anti-fuite
    let shouldAllowPhone = false;

    if (dto.orderId) {
      const order = await this.prisma.order.findUnique({
        where: { id: dto.orderId },
      });

      if (
        order &&
        (
          [
            OrderStatus.PAID_ESCROW,
            OrderStatus.PREPARING,
            OrderStatus.SHIPPED_TIAK_TIAK,
            OrderStatus.DELIVERED_CONFIRMED,
          ] as OrderStatus[]
        ).includes(order.status)
      ) {
        shouldAllowPhone = true;
      }
    }

    // Si pas de commande payée, masquage immédiat des numéros de téléphone
    const finalContent = shouldAllowPhone
      ? dto.content
      : this.maskPhoneNumbers(dto.content);

    const message = await this.prisma.message.create({
      data: {
        senderId,
        receiverId: dto.receiverId,
        shopId: dto.shopId,
        productId: dto.productId,
        orderId: dto.orderId,
        content: finalContent,
      },
      include: {
        sender: {
          select: { id: true, fullName: true, role: true },
        },
        receiver: {
          select: { id: true, fullName: true, role: true },
        },
        product: {
          select: { id: true, name: true, slug: true, priceFcfa: true, images: true },
        },
      },
    });

    // Émission temps réel via Socket.io vers la room du destinataire
    this.chatGateway.emitNewMessage(dto.receiverId, message);

    return message;
  }

  /**
   * 2. Lister toutes les conversations actives de l'utilisateur
   */
  async getConversations(userId: string) {
    // Récupération de tous les messages impliquant l'utilisateur
    const allMessages = await this.prisma.message.findMany({
      where: {
        OR: [{ senderId: userId }, { receiverId: userId }],
      },
      orderBy: { createdAt: 'desc' },
      include: {
        sender: {
          select: { id: true, fullName: true, role: true },
        },
        receiver: {
          select: { id: true, fullName: true, role: true },
        },
      },
    });

    // Regroupement par interlocuteur
    const conversationMap = new Map<string, {
      interlocutor: { id: string; fullName: string; role: string };
      lastMessage: {
        id: string;
        content: string;
        senderId: string;
        createdAt: Date;
        isRead: boolean;
      };
      unreadCount: number;
    }>();

    for (const msg of allMessages) {
      const partner = msg.senderId === userId ? msg.receiver : msg.sender;
      if (!conversationMap.has(partner.id)) {
        conversationMap.set(partner.id, {
          interlocutor: partner,
          lastMessage: {
            id: msg.id,
            content: msg.content,
            senderId: msg.senderId,
            createdAt: msg.createdAt,
            isRead: msg.isRead,
          },
          unreadCount: 0,
        });
      }

      // Incrémentation du compteur de messages non lus reçus par l'utilisateur
      if (msg.receiverId === userId && !msg.isRead) {
        const conv = conversationMap.get(partner.id)!;
        conv.unreadCount += 1;
      }
    }

    return Array.from(conversationMap.values());
  }

  /**
   * 3. Récupérer le fil de discussion complet entre deux utilisateurs (BOLA strict)
   */
  async getThread(userId: string, otherUserId: string) {
    const messages = await this.prisma.message.findMany({
      where: {
        OR: [
          { senderId: userId, receiverId: otherUserId },
          { senderId: otherUserId, receiverId: userId },
        ],
      },
      orderBy: { createdAt: 'asc' },
      include: {
        sender: {
          select: { id: true, fullName: true, role: true },
        },
        receiver: {
          select: { id: true, fullName: true, role: true },
        },
        product: {
          select: { id: true, name: true, slug: true, priceFcfa: true, images: true },
        },
      },
    });

    return messages;
  }

  /**
   * 4. Marquer les messages d'une conversation comme lus
   */
  async markAsRead(readerId: string, otherUserId: string) {
    const updateResult = await this.prisma.message.updateMany({
      where: {
        receiverId: readerId,
        senderId: otherUserId,
        isRead: false,
      },
      data: {
        isRead: true,
        readAt: new Date(),
      },
    });

    // Notification temps réel à l'expéditeur d'origine
    this.chatGateway.emitMessageRead(otherUserId, {
      readerId,
      readAt: new Date(),
    });

    return {
      readCount: updateResult.count,
    };
  }

  /**
   * 5. Consultation des messages liés à une commande pour arbitrage Super-Admin
   */
  async getOrderMessagesForAdmin(orderId: string) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
    });

    if (!order) {
      throw new NotFoundException(`Commande ${orderId} introuvable`);
    }

    const messages = await this.prisma.message.findMany({
      where: { orderId },
      orderBy: { createdAt: 'asc' },
      include: {
        sender: {
          select: { id: true, fullName: true, role: true, phone: true },
        },
        receiver: {
          select: { id: true, fullName: true, role: true, phone: true },
        },
      },
    });

    return {
      orderId: order.id,
      orderNumber: order.orderNumber,
      totalMessages: messages.length,
      messages,
    };
  }
}
