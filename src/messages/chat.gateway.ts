import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  ConnectedSocket,
  MessageBody,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { JwtService } from '@nestjs/jwt';
import { Logger } from '@nestjs/common';
import { ModuleRef } from '@nestjs/core';
import { SendMessageDto } from './dto/send-message.dto';

@WebSocketGateway({
  cors: {
    origin: '*',
    credentials: true,
  },
  namespace: '/chat',
})
export class ChatGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server!: Server;

  private readonly logger = new Logger(ChatGateway.name);

  constructor(
    private readonly jwtService: JwtService,
    private readonly moduleRef: ModuleRef,
  ) {}


  /**
   * Authentification et connexion du socket
   */
  async handleConnection(client: Socket) {
    try {
      const token =
        client.handshake.auth?.token ||
        client.handshake.headers?.authorization?.replace('Bearer ', '');

      if (!token) {
        this.logger.warn(`Client déconnecté (absence de token) : ${client.id}`);
        client.disconnect();
        return;
      }

      const secret =
        process.env.JWT_ACCESS_SECRET ||
        'openboutik_jwt_access_super_secret_local_dev_key_2026';
      const payload = this.jwtService.verify(token, { secret });

      if (!payload || !payload.sub) {
        client.disconnect();
        return;
      }

      // Attachement de l'ID utilisateur au socket et adhésion à sa room personnelle
      client.data.userId = payload.sub;
      const room = `user_${payload.sub}`;
      await client.join(room);

      this.logger.log(`Utilisateur ${payload.sub} connecté sur le socket ${client.id} (room: ${room})`);
    } catch {
      this.logger.warn(`Échec d'authentification WebSocket pour le socket ${client.id}`);
      client.disconnect();
    }
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Socket déconnecté : ${client.id}`);
  }

  /**
   * Émission temps réel vers le destinataire
   */
  emitNewMessage(receiverId: string, message: unknown) {
    if (this.server) {
      this.server.to(`user_${receiverId}`).emit('new_message', message);
    }
  }

  /**
   * Émission temps réel lors de la lecture d'un message
   */
  emitMessageRead(senderId: string, payload: unknown) {
    if (this.server) {
      this.server.to(`user_${senderId}`).emit('message_read', payload);
    }
  }

  /**
   * Réception d'un message direct via WebSocket
   */
  @SubscribeMessage('send_message')
  async handleSendMessage(
    @ConnectedSocket() client: Socket,
    @MessageBody() dto: SendMessageDto,
  ) {
    const senderId = client.data.userId;
    if (!senderId) {
      return { error: 'Non authentifié' };
    }

    const messagesService = this.moduleRef.get<any>('MESSAGES_SERVICE', {
      strict: false,
    });
    const message = await messagesService.sendMessage(senderId, dto);
    return { success: true, message };
  }

  /**
   * Accusé de lecture envoyé par WebSocket
   */
  @SubscribeMessage('mark_as_read')
  async handleMarkAsRead(
    @ConnectedSocket() client: Socket,
    @MessageBody('otherUserId') otherUserId: string,
  ) {
    const readerId = client.data.userId;
    if (!readerId) {
      return { error: 'Non authentifié' };
    }

    const messagesService = this.moduleRef.get<any>('MESSAGES_SERVICE', {
      strict: false,
    });
    const result = await messagesService.markAsRead(readerId, otherUserId);
    return { success: true, ...result };
  }
}

