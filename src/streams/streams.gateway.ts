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

@WebSocketGateway({
  cors: {
    origin: '*',
    credentials: true,
  },
  namespace: '/streams',
})
export class StreamsGateway
  implements OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server!: Server;

  private readonly logger = new Logger(StreamsGateway.name);

  constructor(private readonly jwtService: JwtService) {}

  async handleConnection(client: Socket) {
    try {
      const token =
        client.handshake.auth?.token ||
        client.handshake.headers?.authorization?.replace('Bearer ', '');

      if (token) {
        const secret =
          process.env.JWT_ACCESS_SECRET ||
          'openboutik_jwt_access_super_secret_local_dev_key_2026';
        const payload = this.jwtService.verify(token, { secret });
        if (payload && payload.sub) {
          client.data.userId = payload.sub;
          client.data.role = payload.role;
        }
      }
      this.logger.log(`Spectateur connecté au flux : ${client.id}`);
    } catch {
      // Les spectateurs anonymes peuvent regarder le live, mais avec clientId restreint
      this.logger.log(`Spectateur anonyme connecté : ${client.id}`);
    }
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Spectateur déconnecté : ${client.id}`);
  }

  /**
   * Rejoindre la room d'un Live Shopping
   */
  @SubscribeMessage('join_stream')
  async handleJoinStream(
    @ConnectedSocket() client: Socket,
    @MessageBody('streamId') streamId: string,
  ) {
    if (!streamId) {
      return { error: 'streamId requis' };
    }
    const room = `stream_${streamId}`;
    await client.join(room);
    this.logger.log(`Client ${client.id} a rejoint la room ${room}`);
    return { success: true, room };
  }

  /**
   * Quitter la room d'un Live Shopping
   */
  @SubscribeMessage('leave_stream')
  async handleLeaveStream(
    @ConnectedSocket() client: Socket,
    @MessageBody('streamId') streamId: string,
  ) {
    if (!streamId) {
      return { error: 'streamId requis' };
    }
    const room = `stream_${streamId}`;
    await client.leave(room);
    this.logger.log(`Client ${client.id} a quitté la room ${room}`);
    return { success: true, room };
  }

  /**
   * Diffuser un message dans le chat du direct
   */
  @SubscribeMessage('stream_chat_message')
  async handleStreamChatMessage(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: { streamId: string; message: string; senderName?: string },
  ) {
    if (!payload.streamId || !payload.message) {
      return { error: 'streamId et message sont obligatoires.' };
    }

    const room = `stream_${payload.streamId}`;
    const chatData = {
      streamId: payload.streamId,
      message: payload.message,
      senderId: client.data?.userId || null,
      senderName: payload.senderName || 'Spectateur',
      timestamp: new Date(),
    };

    if (this.server) {
      this.server.to(room).emit('stream_new_chat_message', chatData);
    }

    return { success: true, chatData };
  }

  /**
   * Émission temps réel quand le vendeur épingle un produit en direct
   */
  broadcastProductPopup(streamId: string, product: unknown) {
    if (this.server) {
      this.server.to(`stream_${streamId}`).emit('live_product_popup', {
        streamId,
        product,
        timestamp: new Date(),
      });
    }
  }
}
