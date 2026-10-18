import { Controller, Get, UseGuards, NotFoundException } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { UsersService } from './users.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@ApiTags('Utilisateurs')
@Controller('users')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('JWT-auth')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('me')
  @ApiOperation({
    summary: 'Profil de l’utilisateur connecté',
    description: 'Retourne le profil sans informations sensibles (passwordHash et refreshTokenHash exclus).',
  })
  @ApiResponse({ status: 200, description: 'Profil récupéré avec succès' })
  @ApiResponse({ status: 401, description: 'Non authentifié' })
  async getMe(@CurrentUser('id') userId: string) {
    const user = await this.usersService.findById(userId);
    if (!user) {
      throw new NotFoundException('Utilisateur introuvable');
    }
    const { passwordHash: _passwordHash, refreshTokenHash: _refreshTokenHash, ...safeUser } = user;
    return safeUser;
  }
}
