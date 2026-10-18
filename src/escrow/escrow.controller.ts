import {
  Controller,
  Get,
  Post,
  Body,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { EscrowService } from './escrow.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { Public } from '../common/decorators/public.decorator';
import { Role } from '../generated/prisma/client';
import { WaveWebhookGuard } from './guards/wave-webhook.guard';
import { OrangeMoneyWebhookGuard } from './guards/orange-money-webhook.guard';

@ApiTags('Commandes & Séquestre')
@Controller('escrow')
export class EscrowController {
  constructor(private readonly escrowService: EscrowService) {}

  @Get('overview')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.SUPER_ADMIN)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Vue d’ensemble de la trésorerie séquestrée (Super-Admin)',
    description: 'Affiche la somme totale des fonds actuellement bloqués, gelés sous litige et reversés aux commerçants.',
  })
  @ApiResponse({
    status: 200,
    description: 'Trésorerie globale du séquestre retournée avec succès',
  })
  async getEscrowOverview() {
    return this.escrowService.getEscrowOverview();
  }

  @Post('auto-release')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.SUPER_ADMIN)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Déclencher l’auto-déblocage des commandes expédiées depuis plus de 24h (Filet de sécurité)',
    description: 'Scanne et libère automatiquement les commandes en cours de livraison depuis plus de 24h sans aucun litige ouvert.',
  })
  @ApiResponse({
    status: 200,
    description: 'Commandes expirées débloquées avec succès',
  })
  async triggerAutoRelease() {
    return this.escrowService.autoReleaseExpiredOrders();
  }

  @Public()
  @UseGuards(WaveWebhookGuard)
  @Post('webhooks/wave')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Webhook de notification Wave Sénégal',
    description: 'Reçoit et traite les confirmations de paiements de transactions de séquestre de manière idempotente avec validation HMAC.',
  })
  async handleWaveWebhook(@Body() payload: Record<string, unknown>) {
    return this.escrowService.handleWaveWebhook(payload);
  }

  @Public()
  @UseGuards(OrangeMoneyWebhookGuard)
  @Post('webhooks/orange-money')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Webhook de notification Orange Money Sénégal',
    description: 'Reçoit et traite les notifications de débit client Orange Money de manière idempotente avec validation HMAC.',
  })
  async handleOrangeMoneyWebhook(@Body() payload: Record<string, unknown>) {
    return this.escrowService.handleOrangeMoneyWebhook(payload);
  }
}
