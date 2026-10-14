import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger';
import { DisputesService } from './disputes.service';
import { OpenDisputeDto } from './dto/open-dispute.dto';
import { ArbitrateDisputeDto } from './dto/arbitrate-dispute.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Role, DisputeStatus } from '../generated/prisma/client';

@ApiTags('Litiges (Disputes)')
@Controller('disputes')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth('JWT-auth')
export class DisputesController {
  constructor(private readonly disputesService: DisputesService) {}

  @Post(':orderId')
  @Roles(Role.CLIENT)
  @ApiOperation({
    summary: 'Ouvrir un litige sur une commande (Acheteur)',
    description: 'Permet au client de signaler un problème (non-réception, colis non conforme). Gèle immédiatement les fonds du séquestre.',
  })
  @ApiResponse({
    status: 201,
    description: 'Litige ouvert et séquestre gelé avec succès',
  })
  @ApiResponse({
    status: 400,
    description: 'Commande déjà livrée ou déjà en litige',
  })
  async openDispute(
    @CurrentUser('id') clientId: string,
    @Param('orderId') orderId: string,
    @Body() dto: OpenDisputeDto,
  ) {
    return this.disputesService.openDispute(clientId, orderId, dto);
  }

  @Get()
  @Roles(Role.SUPER_ADMIN)
  @ApiOperation({
    summary: 'Liste de tous les litiges ouverts ou archivés (Super-Admin)',
    description: 'Interface de gestion des réclamations pour l’équipe de dev OpenBoutik.',
  })
  @ApiQuery({
    name: 'status',
    required: false,
    enum: DisputeStatus,
    description: 'Filtrer par statut (ex: OPEN, RESOLVED_REFUND_CLIENT)',
  })
  async getAllDisputes(@Query('status') status?: DisputeStatus) {
    return this.disputesService.getAllDisputes(status);
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Consulter un dossier de litige',
    description: 'Accessible par l’acheteur demandeur, le marchand concerné ou le Super-Admin.',
  })
  @ApiResponse({
    status: 200,
    description: 'Dossier de litige récupéré',
  })
  async getDisputeById(
    @Param('id') disputeId: string,
    @CurrentUser('id') userId: string,
    @CurrentUser('role') role: Role,
  ) {
    return this.disputesService.getDisputeById(disputeId, userId, role);
  }

  @Post(':id/arbitrate')
  @Roles(Role.SUPER_ADMIN)
  @ApiOperation({
    summary: 'Trancher un litige (Arbitrage Super-Admin)',
    description: 'Décision officielle de l’équipe OpenBoutik : remboursement de l’acheteur (REFUND_CLIENT) OU déblocage vers le marchand (RELEASE_VENDOR).',
  })
  @ApiResponse({
    status: 200,
    description: 'Litige arbitré et transaction financière exécutée en BDD',
  })
  async arbitrateDispute(
    @CurrentUser('id') superAdminId: string,
    @Param('id') disputeId: string,
    @Body() dto: ArbitrateDisputeDto,
  ) {
    return this.disputesService.arbitrateDispute(superAdminId, disputeId, dto);
  }
}
