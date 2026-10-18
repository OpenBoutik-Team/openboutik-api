import {
  Controller,
  Post,
  Get,
  Patch,
  Body,
  Param,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
} from '@nestjs/swagger';
import { MessagesService } from './messages.service';
import { SendMessageDto } from './dto/send-message.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Role } from '../generated/prisma/client';

@ApiTags('Messagerie Directe Acheteur-Vendeur')
@Controller()
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth('JWT-auth')
export class MessagesController {
  constructor(private readonly messagesService: MessagesService) {}

  @Post('messages')
  @ApiOperation({
    summary: 'Envoyer un message direct (Acheteur <-> Vendeur)',
    description:
      'Envoie un message texte interne. Si la commande n’est pas encore payée sur le séquestre, tout numéro de téléphone sénégalais est automatiquement masqué.',
  })
  @ApiResponse({
    status: 201,
    description: 'Message enregistré et émis en temps réel',
  })
  async sendMessage(
    @CurrentUser('id') senderId: string,
    @Body() dto: SendMessageDto,
  ) {
    return this.messagesService.sendMessage(senderId, dto);
  }

  @Get('messages/conversations')
  @ApiOperation({
    summary: 'Lister les conversations actives',
    description:
      'Retourne toutes les conversations de l’utilisateur connecté avec le dernier message et le compteur de messages non lus.',
  })
  @ApiResponse({
    status: 200,
    description: 'Liste des conversations retournée avec succès',
  })
  async getConversations(@CurrentUser('id') userId: string) {
    return this.messagesService.getConversations(userId);
  }

  @Get('messages/thread/:otherUserId')
  @ApiOperation({
    summary: 'Historique de discussion avec un interlocuteur',
    description:
      'Retourne l’intégralité des échanges chronologiques entre l’utilisateur connecté et un autre utilisateur (protection BOLA).',
  })
  @ApiParam({
    name: 'otherUserId',
    description: 'Identifiant UUID de l’interlocuteur',
  })
  @ApiResponse({
    status: 200,
    description: 'Fil de discussion complet',
  })
  async getThread(
    @CurrentUser('id') userId: string,
    @Param('otherUserId') otherUserId: string,
  ) {
    return this.messagesService.getThread(userId, otherUserId);
  }

  @Patch('messages/read/:otherUserId')
  @ApiOperation({
    summary: 'Marquer les messages d’un interlocuteur comme lus',
    description:
      'Passe isRead à true pour tous les messages reçus de cet interlocuteur et notifie en temps réel.',
  })
  @ApiParam({
    name: 'otherUserId',
    description: 'Identifiant UUID de l’expéditeur des messages',
  })
  @ApiResponse({
    status: 200,
    description: 'Messages marqués comme lus',
  })
  async markAsRead(
    @CurrentUser('id') readerId: string,
    @Param('otherUserId') otherUserId: string,
  ) {
    return this.messagesService.markAsRead(readerId, otherUserId);
  }

  @Get('admin/messages/order/:orderId')
  @Roles(Role.SUPER_ADMIN)
  @ApiOperation({
    summary: 'Arbitrage Litige : Consulter les échanges d’une commande (Super-Admin)',
    description:
      'Permet à l’équipe d’arbitrage OpenBoutik de lire l’intégralité des messages échangés entre acheteur et vendeur pour une commande en litige.',
  })
  @ApiParam({
    name: 'orderId',
    description: 'Identifiant UUID de la commande',
  })
  @ApiResponse({
    status: 200,
    description: 'Historique des messages de la commande',
  })
  async getOrderMessagesForAdmin(@Param('orderId') orderId: string) {
    return this.messagesService.getOrderMessagesForAdmin(orderId);
  }
}
