import { Body, Controller, Get, HttpCode, HttpStatus, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiResponse, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Role } from '../generated/prisma/client';
import { StorageService } from './storage.service';
import { CreateUploadTicketDto } from './dto/upload-ticket.dto';
import { UploadTicketResponseDto } from './dto/upload-ticket-response.dto';

@ApiTags('Stockage Cloud & Médias')
@Controller('storage')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class StorageController {
  constructor(private readonly storageService: StorageService) {}

  @Post('upload-ticket')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Demander un ticket d’upload direct signé (Cloudinary / Sécurisé)',
    description:
      'Génère une URL d’upload direct temporaire avec signature cryptographique. Le fichier transite directement du client au Cloud sans charger la mémoire du serveur API.',
  })
  @ApiResponse({
    status: 200,
    description: 'Ticket d’upload généré avec succès (valable 15 minutes).',
    type: UploadTicketResponseDto,
  })
  getUploadTicket(
    @CurrentUser('id') userId: string,
    @Body() dto: CreateUploadTicketDto,
  ): UploadTicketResponseDto {
    return this.storageService.generateUploadTicket(userId, dto);
  }

  @Get('secure-view')
  @Roles(Role.SUPER_ADMIN)
  @ApiOperation({
    summary: 'Générer un lien de visualisation éphémère (Super-Admin uniquement)',
    description:
      'Crée une URL signée valable 15 minutes pour consulter en toute sécurité une pièce d’identité KYC (CNI/Passeport).',
  })
  @ApiQuery({ name: 'fileUrl', description: 'URL du document stocké' })
  @ApiResponse({
    status: 200,
    description: 'Lien sécurisé temporaire généré.',
  })
  getSecureViewUrl(
    @Query('fileUrl') fileUrl: string,
    @CurrentUser('role') role: string,
  ): { expiringUrl: string; validitySeconds: number } {
    const expiringUrl = this.storageService.generateExpiringViewUrl(fileUrl, role);
    return {
      expiringUrl,
      validitySeconds: 900,
    };
  }
}
