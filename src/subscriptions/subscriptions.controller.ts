import { Controller, Get, Post, Body, UseGuards } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { SubscriptionsService } from './subscriptions.service';
import { UpgradeSubscriptionDto } from './dto/upgrade-subscription.dto';
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
    summary: 'Grille tarifaire des abonnements SaaS marchands',
    description: 'Renvoie les forfaits disponibles (FREE à 4%, PRO à 3%, PREMIUM à 2%) avec leurs caractéristiques et tarifs en FCFA.',
  })
  @ApiResponse({
    status: 200,
    description: 'Liste des forfaits récupérée avec succès',
  })
  getAvailablePlans() {
    return this.subscriptionsService.getAvailablePlans();
  }

  @Post('upgrade')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.VENDOR)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Souscrire à un forfait PRO ou PREMIUM',
    description: 'Met à niveau le forfait SaaS du vendeur après paiement Wave ou Orange Money et ajuste immédiatement son taux de commission.',
  })
  @ApiResponse({
    status: 201,
    description: 'Abonnement souscrit et activé avec succès',
  })
  async upgradeSubscription(
    @CurrentUser('id') vendorId: string,
    @Body() dto: UpgradeSubscriptionDto,
  ) {
    return this.subscriptionsService.upgradeSubscription(vendorId, dto);
  }
}
