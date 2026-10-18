import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  Headers,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiHeader,
  ApiParam,
} from '@nestjs/swagger';
import { PaymentsService } from './payments.service';
import { InitiatePaymentDto } from './dto/initiate-payment.dto';
import { WebhookPayloadDto } from './dto/webhook-payload.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Public } from '../common/decorators/public.decorator';
import { PaymentProvider, Role } from '../generated/prisma/client';

@ApiTags('Paiements & Webhooks Mobile Money')
@Controller('payments')
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Post('initiate')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Initier un paiement Mobile Money (Wave, Orange Money, Free Money)',
    description:
      'Génère une transaction de paiement liée à une commande en attente et retourne les instructions de règlement.',
  })
  @ApiResponse({
    status: 201,
    description: 'Transaction de paiement initiée avec succès',
  })
  async initiatePayment(
    @CurrentUser('id') clientId: string,
    @Body() dto: InitiatePaymentDto,
  ) {
    return this.paymentsService.initiatePayment(clientId, dto);
  }

  @Post('webhook/:provider')
  @HttpCode(HttpStatus.OK)
  @Public()

  @ApiOperation({
    summary: 'Webhook opérateur Mobile Money (Notification instantanée de paiement)',
    description:
      'Endpoint sécurisé par signature permettant à Wave, Orange Money ou Free Money de confirmer un paiement avec idempotence.',
  })
  @ApiParam({
    name: 'provider',
    enum: PaymentProvider,
    description: 'Opérateur source (WAVE, ORANGE_MONEY, FREE_MONEY)',
  })
  @ApiHeader({
    name: 'x-webhook-secret',
    required: false,
    description: 'Signature ou clé secrète du webhook opérateur',
  })
  @ApiResponse({
    status: 200,
    description: 'Paiement confirmé, commande passée en PAID_ESCROW',
  })
  async handleWebhook(
    @Param('provider') provider: PaymentProvider,
    @Body() payload: WebhookPayloadDto,
    @Headers('x-webhook-secret') secretHeader?: string,
  ) {
    return this.paymentsService.handleWebhook(provider, payload, secretHeader);
  }

  @Get('order/:orderId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Historique des transactions d’une commande',
    description: 'Consulte toutes les tentatives et validations de paiement d’une commande (protégé BOLA).',
  })
  @ApiResponse({
    status: 200,
    description: 'Liste des transactions retournée avec succès',
  })
  async getOrderTransactions(
    @CurrentUser('id') userId: string,
    @CurrentUser('role') userRole: Role,
    @Param('orderId') orderId: string,
  ) {
    return this.paymentsService.getOrderTransactions(userId, userRole, orderId);
  }
}
