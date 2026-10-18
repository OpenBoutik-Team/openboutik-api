import { Test, TestingModule } from '@nestjs/testing';
import { ConflictException, BadRequestException, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { AuthService } from './auth.service';
import { UsersService } from '../users/users.service';
import { PrismaService } from '../prisma/prisma.service';
import { Role } from '../generated/prisma/client';
import * as bcrypt from 'bcryptjs';

describe('AuthService (Unit Tests)', () => {
  let authService: AuthService;
  let mockPrismaService: any;
  let mockUsersService: any;
  let mockJwtService: any;

  beforeEach(async () => {
    mockPrismaService = {
      user: {
        create: jest.fn(),
        findUnique: jest.fn(),
      },
      shop: {
        findUnique: jest.fn(),
        create: jest.fn(),
      },
      $transaction: jest.fn(async (cb) => {
        if (typeof cb === 'function') {
          return cb(mockPrismaService);
        }
        return Promise.all(cb);
      }),
    };

    mockUsersService = {
      findByPhone: jest.fn(),
      findByEmail: jest.fn(),
      findById: jest.fn(),
      updateRefreshToken: jest.fn(),
    };

    mockJwtService = {
      signAsync: jest.fn().mockResolvedValue('mocked.jwt.token'),
      verify: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: UsersService, useValue: mockUsersService },
        { provide: JwtService, useValue: mockJwtService },
      ],
    }).compile();

    authService = module.get<AuthService>(AuthService);
  });

  describe('registerClient', () => {
    it('doit créer un compte client avec téléphone sénégalais et retourner tokens', async () => {
      mockUsersService.findByPhone.mockResolvedValue(null);
      mockUsersService.findByEmail.mockResolvedValue(null);

      const fakeUser = {
        id: 'user-client-1',
        phone: '+221770001122',
        fullName: 'Fatou Sow',
        email: 'fatou@gmail.com',
        role: Role.CLIENT,
        passwordHash: 'hashedSecret',
      };
      mockPrismaService.user.create.mockResolvedValue(fakeUser);

      const result = await authService.registerClient({
        phone: '+221770001122',
        fullName: 'Fatou Sow',
        email: 'fatou@gmail.com',
        password: 'Password123!',
      });

      expect(result.user).toBeDefined();
      expect((result.user as any).passwordHash).toBeUndefined();
      expect(result.tokens).toBeDefined();
      expect(result.tokens.accessToken).toBe('mocked.jwt.token');
    });

    it('doit rejeter avec ConflictException si le téléphone existe déjà', async () => {
      mockUsersService.findByPhone.mockResolvedValue({ id: 'existing-id' });

      await expect(
        authService.registerClient({
          phone: '+221770001122',
          fullName: 'Fatou Sow',
          password: 'Password123!',
        }),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('registerVendor (Étape 0 Onboarding)', () => {
    it('doit rejeter si acceptTerms est faux', async () => {
      await expect(
        authService.registerVendor({
          phone: '+221770001122',
          fullName: 'Moussa Diop',
          password: 'Password123!',
          acceptTerms: false,
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('doit créer le compte marchand et sa boutique de manière atomique', async () => {
      mockUsersService.findByPhone.mockResolvedValue(null);
      mockPrismaService.shop.findUnique.mockResolvedValue(null);

      const fakeUser = {
        id: 'vendor-1',
        phone: '+221770001122',
        fullName: 'Moussa Diop',
        role: Role.VENDOR,
        passwordHash: 'hashedPass',
      };
      const fakeShop = {
        id: 'shop-1',
        name: 'Teranga Mode',
        slug: 'teranga-mode',
      };

      mockPrismaService.user.create.mockResolvedValue(fakeUser);
      mockPrismaService.shop.create.mockResolvedValue(fakeShop);

      const result = await authService.registerVendor({
        phone: '+221770001122',
        fullName: 'Moussa Diop',
        password: 'Password123!',
        acceptTerms: true,
        shopName: 'Teranga Mode',
        shopSlug: 'teranga-mode',
      });

      expect(result.user).toBeDefined();
      expect((result.user as any).passwordHash).toBeUndefined();
      expect(result.user.shop).toBeDefined();
      expect(result.tokens).toBeDefined();
    });
  });

  describe('login', () => {
    it('doit authentifier avec succès un mot de passe valide', async () => {
      const plainPass = 'Password123!';
      const salt = await bcrypt.genSalt(10);
      const passwordHash = await bcrypt.hash(plainPass, salt);

      const fakeUser = {
        id: 'usr-1',
        phone: '+221770001122',
        passwordHash,
        isActive: true,
        role: Role.CLIENT,
      };

      mockUsersService.findByPhone.mockResolvedValue(fakeUser);

      const result = await authService.login({
        identifier: '+221770001122',
        password: plainPass,
      });

      expect(result.user).toBeDefined();
      expect((result.user as any).passwordHash).toBeUndefined();
      expect(result.tokens.accessToken).toBe('mocked.jwt.token');
    });

    it('doit rejeter avec UnauthorizedException si mot de passe incorrect', async () => {
      const salt = await bcrypt.genSalt(10);
      const passwordHash = await bcrypt.hash('CorrectPass123', salt);

      mockUsersService.findByPhone.mockResolvedValue({
        id: 'usr-1',
        phone: '+221770001122',
        passwordHash,
        isActive: true,
      });

      await expect(
        authService.login({
          identifier: '+221770001122',
          password: 'WrongPassword',
        }),
      ).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('getProfile', () => {
    it('doit retourner le profil sans fuite de hash', async () => {
      mockUsersService.findById.mockResolvedValue({
        id: 'usr-1',
        phone: '+221770001122',
        fullName: 'Awa Diop',
        role: Role.CLIENT,
        passwordHash: 'secret-hash',
        refreshTokenHash: 'refresh-hash',
      });

      const profile = await authService.getProfile('usr-1');
      expect((profile as any).passwordHash).toBeUndefined();
      expect((profile as any).refreshTokenHash).toBeUndefined();
      expect(profile.phone).toBe('+221770001122');
    });
  });
});
