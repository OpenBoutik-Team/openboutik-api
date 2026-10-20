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
import { SubscriptionsService } from './subscriptions.service';
import { UpgradeSubscriptionDto } from './dto/upgrade-subscription.dto';
import {
  StartTrialDto,
  ReactivateSubscriptionDto,
} from './dto/start-trial.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Role } from '../generated/prisma/client';

@ApiTags('Boutiques (SaaS)')
@Controller('subscriptions')
export class SubscriptionsController {
  constructor(private readonly subscriptionsService: SubscriptionsService) {}

  @Get('plans')
  @ApiOperation({
    summary: 'Grille tarifaire des abonnements SaaS marchands (Phase 5)',
    description:
      'Renvoie les forfaits (FREE à 3% sur marketplace, PRO à 5 000 FCFA à 0% avec sous-domaine, PREMIUM à 15 000 FCFA avec domaine custom et BNPL).',
  })
  @ApiResponse({
    status: 200,
    description: 'Liste des forfaits récupérée avec succès',
  })
  getAvailablePlans() {
    return this.subscriptionsService.getAvailablePlans();
  }

  @Post('start-trial')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.VENDOR)
  @ApiBearerAuth('JWT-auth')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Activer le mois d’essai gratuit de 30 jours (PRO ou PREMIUM)',
    description:
      'Accorde immédiatement 30 jours à 0% de commission et sous-domaine dédié. Protégé contre la fraude multi-comptes via UsedTrialRegistry.',
  })
  @ApiResponse({
    status: 200,
    description: 'Période d’essai de 30 jours activée avec succès',
  })
  @ApiResponse({
    status: 403,
    description: 'Vous avez déjà bénéficié de votre mois d’essai gratuit sur OpenBoutik',
  })
  async startFreeTrial(
    @CurrentUser('id') vendorId: string,
    @Body() dto: StartTrialDto,
  ) {
    return this.subscriptionsService.startFreeTrial(vendorId, dto.plan);
  }

  @Post('reactivate')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.VENDOR)
  @ApiBearerAuth('JWT-auth')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Réactiver ou souscrire à un forfait PRO ou PREMIUM depuis le Wallet',
    description:
      'Débite immédiatement le solde disponible du portefeuille marchand et rétablit instantanément le sous-domaine et le 0% de commission.',
  })
  @ApiResponse({
    status: 200,
    description: 'Abonnement réactivé avec succès',
  })
  async reactivateSubscription(
    @CurrentUser('id') vendorId: string,
    @Body() dto: ReactivateSubscriptionDto,
  ) {
    return this.subscriptionsService.reactivateSubscription(vendorId, dto.plan);
  }

  @Post('run-billing-cycle')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.SUPER_ADMIN, Role.VENDOR)
  @ApiBearerAuth('JWT-auth')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Déclencher manuellement un cycle de facturation Dunning (Super-Admin / Tests)',
    description:
      'Scanne les abonnements échus, tente les prélèvements sur Wallet et applique les règles de relance 6 tentatives/3 jours.',
  })
  async runBillingCycle() {
    return this.subscriptionsService.processDueSubscriptions();
  }

  @Post('run-upcoming-reminders')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.SUPER_ADMIN, Role.VENDOR)
  @ApiBearerAuth('JWT-auth')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary:
      'Déclencher manuellement l’envoi des rappels préventifs WhatsApp & SMS (Super-Admin / Tests)',
    description:
      'Scanne les boutiques arrivant à échéance dans les 72h et expédie les messages WhatsApp & SMS préventifs.',
  })
  async runUpcomingReminders() {
    return this.subscriptionsService.sendUpcomingRenewalReminders(3);
  }

  @Post('upgrade')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.VENDOR)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Souscrire à un forfait PRO ou PREMIUM (Rétrocompatibilité)',
  })
  async upgradeSubscription(
    @CurrentUser('id') vendorId: string,
    @Body() dto: UpgradeSubscriptionDto,
  ) {
    return this.subscriptionsService.upgradeSubscription(vendorId, dto);
  }
}
