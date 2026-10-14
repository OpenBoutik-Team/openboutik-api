import {
  Controller,
  Post,
  Get,
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
import { AuthService } from './auth.service';
import { RegisterClientDto } from './dto/register-client.dto';
import { RegisterVendorDto } from './dto/register-vendor.dto';
import { LoginDto } from './dto/login.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@ApiTags('Authentification')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register/client')
  @ApiOperation({
    summary: 'Inscription d’un client acheteur',
    description: 'Crée un nouveau compte client avec un numéro de téléphone sénégalais (+221...) et délivre les tokens JWT.',
  })
  @ApiResponse({
    status: 201,
    description: 'Compte client créé avec succès',
  })
  @ApiResponse({
    status: 409,
    description: 'Numéro de téléphone ou email déjà utilisé',
  })
  async registerClient(@Body() dto: RegisterClientDto) {
    return this.authService.registerClient(dto);
  }

  @Post('register/vendor')
  @ApiOperation({
    summary: 'Inscription d’un commerçant (vendeur SaaS)',
    description: 'Crée le compte marchand, sa boutique avec son URL personnalisée (slug) et initialise son portefeuille en transaction ACID.',
  })
  @ApiResponse({
    status: 201,
    description: 'Boutique et compte marchand créés avec succès',
  })
  @ApiResponse({
    status: 409,
    description: 'Téléphone, email ou slug de boutique déjà réservé',
  })
  async registerVendor(@Body() dto: RegisterVendorDto) {
    return this.authService.registerVendor(dto);
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Connexion unifiée (Client, Vendeur ou Super-Admin)',
    description: 'Authentification via numéro de téléphone (+221...) ou adresse email avec mot de passe.',
  })
  @ApiResponse({
    status: 200,
    description: 'Authentification réussie, retourne le profil et la paire de tokens JWT',
  })
  @ApiResponse({
    status: 401,
    description: 'Identifiants incorrects ou compte suspendu',
  })
  async login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Renouvellement des tokens JWT',
    description: 'Permet de générer un nouvel Access Token avant expiration sans redemander le mot de passe.',
  })
  @ApiResponse({
    status: 200,
    description: 'Nouveaux tokens générés avec succès',
  })
  @ApiResponse({
    status: 401,
    description: 'Refresh token invalide ou révoqué',
  })
  async refresh(@Body() dto: RefreshTokenDto) {
    return this.authService.refreshTokens(dto);
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Profil de l’utilisateur actuellement connecté',
    description: 'Renvoie les données sécurisées de l’utilisateur authentifié, incluant son rôle et sa boutique s’il s’agit d’un vendeur.',
  })
  @ApiResponse({
    status: 200,
    description: 'Données du profil récupérées avec succès',
  })
  @ApiResponse({
    status: 401,
    description: 'Token JWT manquant, invalide ou expiré',
  })
  async getProfile(@CurrentUser('id') userId: string) {
    return this.authService.getProfile(userId);
  }

  @Post('logout')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Déconnexion et révocation de session',
    description: 'Invalide le refresh token en base de données pour clore la session en cours.',
  })
  @ApiResponse({
    status: 200,
    description: 'Déconnexion réussie',
  })
  async logout(@CurrentUser('id') userId: string) {
    return this.authService.logout(userId);
  }
}
