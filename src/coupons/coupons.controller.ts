import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { CouponsService } from './coupons.service';
import { CreateCouponDto } from './dto/create-coupon.dto';
import { UpdateCouponDto } from './dto/update-coupon.dto';
import { ValidateCouponDto } from './dto/validate-coupon.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Role } from '../generated/prisma/client';

@ApiTags('Codes Promo & Marketing Vendeur')
@Controller('coupons')
export class CouponsController {
  constructor(private readonly couponsService: CouponsService) {}

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.VENDOR, Role.SUPER_ADMIN)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Créer un nouveau code promotionnel',
    description: 'Permet à un marchand de créer un code promo (%) ou réduction fixe FCFA avec quota d’utilisations.',
  })
  @ApiResponse({ status: 201, description: 'Code promo créé avec succès' })
  @ApiResponse({ status: 400, description: 'Données invalides ou code déjà existant' })
  @ApiResponse({ status: 403, description: 'Non autorisé' })
  createCoupon(
    @CurrentUser('id') userId: string,
    @Body() dto: CreateCouponDto,
  ) {
    return this.couponsService.createCoupon(userId, dto);
  }

  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.VENDOR, Role.SUPER_ADMIN)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Consulter la liste de ses codes promotionnels',
    description: 'Retourne la liste des codes promo actifs et expirés pour la boutique du vendeur connecté.',
  })
  @ApiResponse({ status: 200, description: 'Liste des codes promo retournée' })
  getShopCoupons(@CurrentUser('id') userId: string) {
    return this.couponsService.getShopCoupons(userId);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.VENDOR, Role.SUPER_ADMIN)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Mettre à jour un code promotionnel',
    description: 'Permet d’ajuster la réduction, la date limite d’expiration, le quota max ou le statut actif.',
  })
  @ApiResponse({ status: 200, description: 'Code promo mis à jour avec succès' })
  @ApiResponse({ status: 404, description: 'Code promo introuvable' })
  updateCoupon(
    @CurrentUser('id') userId: string,
    @Param('id') couponId: string,
    @Body() dto: UpdateCouponDto,
  ) {
    return this.couponsService.updateCoupon(userId, couponId, dto);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.VENDOR, Role.SUPER_ADMIN)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Supprimer un code promotionnel',
    description: 'Supprime définitivement un code promotionnel de la boutique.',
  })
  @ApiResponse({ status: 200, description: 'Code promo supprimé avec succès' })
  @ApiResponse({ status: 404, description: 'Code promo introuvable' })
  deleteCoupon(
    @CurrentUser('id') userId: string,
    @Param('id') couponId: string,
  ) {
    return this.couponsService.deleteCoupon(userId, couponId);
  }

  @Post('validate')
  @ApiOperation({
    summary: 'Tester et valider un code promotionnel (Public / Panier Client)',
    description: 'Vérifie la validité d’un code promo pour une boutique donnée et retourne la réduction exacte calculée en FCFA.',
  })
  @ApiResponse({ status: 200, description: 'Code promo valide avec montant déduit' })
  @ApiResponse({ status: 400, description: 'Code expiré, invalide ou quota atteint' })
  validateCoupon(@Body() dto: ValidateCouponDto) {
    return this.couponsService.validateCoupon(dto);
  }
}
