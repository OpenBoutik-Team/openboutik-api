import {
  Injectable,
  ConflictException,
  UnauthorizedException,
  NotFoundException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '../prisma/prisma.service';
import { UsersService } from '../users/users.service';
import { RegisterClientDto } from './dto/register-client.dto';
import { RegisterVendorDto } from './dto/register-vendor.dto';
import { LoginDto } from './dto/login.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { Role } from '../generated/prisma/client';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
  ) {}

  /**
   * Inscription d'un acheteur / client
   */
  async registerClient(dto: RegisterClientDto) {
    const existingPhone = await this.usersService.findByPhone(dto.phone);
    if (existingPhone) {
      throw new ConflictException('Un compte existe déjà avec ce numéro de téléphone');
    }

    if (dto.email) {
      const existingEmail = await this.usersService.findByEmail(dto.email);
      if (existingEmail) {
        throw new ConflictException('Un compte existe déjà avec cette adresse email');
      }
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(dto.password, salt);

    const user = await this.prisma.user.create({
      data: {
        phone: dto.phone,
        fullName: dto.fullName,
        email: dto.email,
        passwordHash,
        role: Role.CLIENT,
      },
    });

    const tokens = await this.generateTokens(user.id, user.phone, user.role);
    await this.usersService.updateRefreshToken(user.id, tokens.refreshToken);

    return {
      user: this.sanitizeUser(user),
      tokens,
    };
  }

  /**
   * Inscription d'un marchand (Transaction ACID : User + Shop + VendorWallet)
   */
  async registerVendor(dto: RegisterVendorDto) {
    const existingPhone = await this.usersService.findByPhone(dto.phone);
    if (existingPhone) {
      throw new ConflictException('Un compte existe déjà avec ce numéro de téléphone');
    }

    if (dto.email) {
      const existingEmail = await this.usersService.findByEmail(dto.email);
      if (existingEmail) {
        throw new ConflictException('Un compte existe déjà avec cette adresse email');
      }
    }

    const existingSlug = await this.prisma.shop.findUnique({
      where: { slug: dto.shopSlug.toLowerCase().trim() },
    });
    if (existingSlug) {
      throw new ConflictException('Ce nom d’URL / slug de boutique est déjà réservé par un autre marchand');
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(dto.password, salt);

    // Transaction ACID complète pour garantir la cohérence financière du vendeur
    const result = await this.prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          phone: dto.phone,
          fullName: dto.fullName,
          email: dto.email,
          passwordHash,
          role: Role.VENDOR,
        },
      });

      const shop = await tx.shop.create({
        data: {
          ownerId: user.id,
          name: dto.shopName,
          slug: dto.shopSlug.toLowerCase().trim(),
          whatsappNumber: dto.whatsappNumber,
          address: dto.address,
          city: dto.city || 'Dakar',
          wallet: {
            create: {
              escrowBalanceFcfa: 0,
              availableBalanceFcfa: 0,
              totalEarnedFcfa: 0,
            },
          },
        },
        include: {
          wallet: true,
        },
      });

      return { user, shop };
    });

    const tokens = await this.generateTokens(result.user.id, result.user.phone, result.user.role);
    await this.usersService.updateRefreshToken(result.user.id, tokens.refreshToken);

    return {
      user: {
        ...this.sanitizeUser(result.user),
        shop: result.shop,
      },
      tokens,
    };
  }

  /**
   * Connexion unifiée (CLIENT, VENDOR, SUPER_ADMIN)
   */
  async login(dto: LoginDto) {
    const identifier = dto.identifier.trim();
    let user = await this.usersService.findByPhone(identifier);

    if (!user && identifier.includes('@')) {
      user = await this.usersService.findByEmail(identifier);
    }

    if (!user) {
      throw new UnauthorizedException('Identifiants incorrects (numéro/email ou mot de passe)');
    }

    if (!user.isActive) {
      throw new UnauthorizedException('Votre compte a été suspendu. Veuillez contacter le support OpenBoutik');
    }

    const isMatch = await bcrypt.compare(dto.password, user.passwordHash);
    if (!isMatch) {
      throw new UnauthorizedException('Identifiants incorrects (numéro/email ou mot de passe)');
    }

    const tokens = await this.generateTokens(user.id, user.phone, user.role);
    await this.usersService.updateRefreshToken(user.id, tokens.refreshToken);

    return {
      user: this.sanitizeUser(user),
      tokens,
    };
  }

  /**
   * Renouvellement du token d'accès
   */
  async refreshTokens(dto: RefreshTokenDto) {
    try {
      const payload = this.jwtService.verify(dto.refreshToken, {
        secret: process.env.JWT_REFRESH_SECRET || 'openboutik_jwt_refresh_super_secret_local_dev_key_2026',
      });

      const user = await this.prisma.user.findUnique({
        where: { id: payload.sub },
      });

      if (!user || !user.refreshTokenHash || !user.isActive) {
        throw new UnauthorizedException('Session expirée ou invalide');
      }

      const isTokenMatching = await bcrypt.compare(dto.refreshToken, user.refreshTokenHash);
      if (!isTokenMatching) {
        throw new UnauthorizedException('Session révoquée');
      }

      const tokens = await this.generateTokens(user.id, user.phone, user.role);
      await this.usersService.updateRefreshToken(user.id, tokens.refreshToken);

      return tokens;
    } catch {
      throw new UnauthorizedException('Refresh token invalide ou expiré');
    }
  }

  /**
   * Profil complet de l'utilisateur connecté
   */
  async getProfile(userId: string) {
    const user = await this.usersService.findById(userId);
    if (!user) {
      throw new NotFoundException('Utilisateur introuvable');
    }
    return this.sanitizeUser(user);
  }

  /**
   * Déconnexion (révocation du refresh token)
   */
  async logout(userId: string) {
    await this.usersService.updateRefreshToken(userId, null);
    return { message: 'Déconnexion réussie' };
  }

  private async generateTokens(userId: string, phone: string, role: string) {
    const payload = { sub: userId, phone, role };

    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(payload, {
        secret: process.env.JWT_ACCESS_SECRET || 'openboutik_jwt_access_super_secret_local_dev_key_2026',
        expiresIn: (process.env.JWT_ACCESS_EXPIRES_IN || '15m') as any,
      }),
      this.jwtService.signAsync(payload, {
        secret: process.env.JWT_REFRESH_SECRET || 'openboutik_jwt_refresh_super_secret_local_dev_key_2026',
        expiresIn: (process.env.JWT_REFRESH_EXPIRES_IN || '7d') as any,
      }),
    ]);

    return {
      accessToken,
      refreshToken,
      tokenType: 'Bearer',
      expiresIn: process.env.JWT_ACCESS_EXPIRES_IN || '15m',
    };
  }

  private sanitizeUser(user: any) {
    const { passwordHash: _passwordHash, refreshTokenHash: _refreshTokenHash, ...safeUser } = user;
    return safeUser;
  }
}
