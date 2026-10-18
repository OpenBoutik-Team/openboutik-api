import {
  Controller,
  Get,
  Post,
  Body,
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
import { WalletsService } from './wallets.service';
import { RequestPayoutDto } from './dto/request-payout.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Role, PayoutStatus } from '../generated/prisma/client';

@ApiTags('Portefeuille Vendeur')
@Controller('wallets')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth('JWT-auth')
export class WalletsController {
  constructor(private readonly walletsService: WalletsService) {}

  @Get('me')
  @Roles(Role.VENDOR)
  @ApiOperation({
    summary: 'Consulter son portefeuille marchand et historique des retraits',
    description: 'Affiche le solde séquestre (bloqué), le solde disponible au retrait net de commissions et la liste des décaissements Mobile Money récents.',
  })
  @ApiResponse({
    status: 200,
    description: 'Portefeuille récupéré avec succès',
  })
  async getVendorWallet(@CurrentUser('id') vendorId: string) {
    return this.walletsService.getVendorWallet(vendorId);
  }

  @Post('payout')
  @Roles(Role.VENDOR)
  @ApiOperation({
    summary: 'Demander un retrait de fonds vers Wave ou Orange Money',
    description: 'Transfère une partie ou la totalité du solde disponible vers le numéro de téléphone sénégalais spécifié en transaction ACID.',
  })
  @ApiResponse({
    status: 201,
    description: 'Demande de retrait enregistrée et traitée avec succès',
  })
  @ApiResponse({
    status: 400,
    description: 'Solde disponible insuffisant ou montant inférieur à 1 000 FCFA',
  })
  async requestPayout(
    @CurrentUser('id') vendorId: string,
    @Body() dto: RequestPayoutDto,
  ) {
    return this.walletsService.requestPayout(vendorId, dto);
  }

  @Get('admin/payouts')
  @Roles(Role.SUPER_ADMIN)
  @ApiOperation({
    summary: 'Historique global des décaissements et retraits (Super-Admin)',
    description: 'Permet à l’équipe de dev OpenBoutik de superviser tous les flux de retraits marchands vers Wave et Orange Money.',
  })
  @ApiQuery({
    name: 'status',
    required: false,
    enum: PayoutStatus,
    description: 'Filtrer par statut de retrait (PENDING, PROCESSED, REJECTED)',
  })
  async getAllPayouts(@Query('status') status?: PayoutStatus) {
    return this.walletsService.getAllPayouts(status);
  }
}
