import {
  Controller,
  Post,
  Get,
  Patch,
  Body,
  Param,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
} from '@nestjs/swagger';
import { BnplService } from './bnpl.service';
import { InitBnplDto } from './dto/init-bnpl.dto';
import { SubmitKycDto } from './dto/submit-kyc.dto';
import { ReviewKycDto } from './dto/review-kyc.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Role } from '../generated/prisma/client';

@ApiTags('Paiement Fractionné / BNPL (3x ou 4x) & KYC Acheteur')
@Controller('bnpl')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth('JWT-auth')
export class BnplController {
  constructor(private readonly bnplService: BnplService) {}

  @Post('kyc')
  @Roles(Role.CLIENT)
  @ApiOperation({
    summary: 'Soumettre son dossier KYC Acheteur (CNI / Passeport)',
    description:
      'Requis obligatoirement avant toute souscription à un paiement en plusieurs fois.',
  })
  @ApiResponse({
    status: 201,
    description: 'Dossier KYC enregistré en attente de vérification (statut PENDING)',
  })
  async submitKyc(
    @CurrentUser('id') userId: string,
    @Body() dto: SubmitKycDto,
  ) {
    return this.bnplService.submitBuyerKyc(userId, dto);
  }

  @Patch('admin/kyc/:targetUserId')
  @Roles(Role.SUPER_ADMIN)
  @ApiOperation({
    summary: 'Valider ou rejeter un KYC Acheteur (Super-Admin)',
    description:
      'Passe le KYC acheteur en VERIFIED pour débloquer l’accès au BNPL, ou en REJECTED avec motif.',
  })
  @ApiParam({
    name: 'targetUserId',
    description: 'Identifiant UUID de l’acheteur',
  })
  @ApiResponse({
    status: 200,
    description: 'Statut KYC mis à jour par l’administration',
  })
  async reviewKyc(
    @Param('targetUserId') targetUserId: string,
    @Body() dto: ReviewKycDto,
  ) {
    return this.bnplService.reviewBuyerKyc(targetUserId, dto);
  }

  @Post('orders/:orderId/init')
  @Roles(Role.CLIENT)
  @ApiOperation({
    summary: 'Échelonner une commande en 3 ou 4 fois (Client vérifié KYC)',
    description:
      'Calcule les échéances mensuelles exactes sans perte de centime FCFA et crée l’échéancier.',
  })
  @ApiParam({
    name: 'orderId',
    description: 'Identifiant UUID de la commande',
  })
  @ApiResponse({
    status: 201,
    description: 'Échéancier BNPL initialisé avec succès',
  })
  @ApiResponse({
    status: 403,
    description: 'KYC non vérifié ou plan impayé existant en retard',
  })
  @ApiResponse({
    status: 400,
    description: 'Commande inférieure à 20 000 FCFA ou déjà réglée',
  })
  async initInstallmentPlan(
    @CurrentUser('id') userId: string,
    @Param('orderId') orderId: string,
    @Body() dto: { installmentsCount: number },
  ) {
    return this.bnplService.initInstallmentPlan(userId, {
      orderId,
      installmentsCount: dto.installmentsCount,
    });
  }

  @Post('installments/:installmentId/pay')
  @HttpCode(HttpStatus.OK)
  @Roles(Role.CLIENT)
  @ApiOperation({
    summary: 'Régler une mensualité BNPL (Client)',
    description:
      'Valide le paiement de l’échéance. Si première échéance : commande passée en PAID_ESCROW et fonds séquestrés.',
  })
  @ApiParam({
    name: 'installmentId',
    description: 'Identifiant UUID de l’échéance à régler',
  })
  @ApiResponse({
    status: 200,
    description: 'Mensualité acquittée avec succès',
  })
  async payInstallment(
    @CurrentUser('id') userId: string,
    @Param('installmentId') installmentId: string,
  ) {
    return this.bnplService.payInstallment(userId, installmentId);
  }

  @Get('my-plans')
  @Roles(Role.CLIENT)
  @ApiOperation({
    summary: 'Consulter mes plans de paiement fractionné (Client)',
    description:
      'Retourne tous les échéanciers de l’acheteur avec les montants payés, restants et les dates d’échéance.',
  })
  @ApiResponse({
    status: 200,
    description: 'Liste des plans retournée avec succès',
  })
  async getMyPlans(@CurrentUser('id') userId: string) {
    return this.bnplService.getMyPlans(userId);
  }

  @Get('plans/:planId')
  @ApiOperation({
    summary: 'Consulter le détail d’un plan BNPL',
    description:
      'Accessible par le client débiteur, le commerçant de la boutique ou l’administration (protection BOLA).',
  })
  @ApiParam({
    name: 'planId',
    description: 'Identifiant UUID du plan',
  })
  @ApiResponse({
    status: 200,
    description: 'Détails du plan et historique de ses mensualités',
  })
  @ApiResponse({
    status: 403,
    description: 'Accès non autorisé à ce plan',
  })
  async getPlanById(
    @CurrentUser('id') userId: string,
    @CurrentUser('role') userRole: Role,
    @Param('planId') planId: string,
  ) {
    return this.bnplService.getPlanById(userId, userRole, planId);
  }
}
