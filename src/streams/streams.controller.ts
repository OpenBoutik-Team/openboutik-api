import {
  Controller,
  Post,
  Get,
  Patch,
  Delete,
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
  ApiParam,
} from '@nestjs/swagger';
import { StreamsService } from './streams.service';
import { CreateStreamDto } from './dto/create-stream.dto';
import { UpdateStreamStatusDto } from './dto/update-stream-status.dto';
import { QueryStreamsDto } from './dto/query-streams.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Public } from '../common/decorators/public.decorator';
import { Role } from '../generated/prisma/client';

@ApiTags('Live Shopping & Vidéos Courtes (Streams)')
@Controller('streams')
export class StreamsController {
  constructor(private readonly streamsService: StreamsService) {}

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.VENDOR)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Créer une session de Live Shopping ou une vidéo courte (Vendeur)',
    description:
      'Enregistre un flux vidéo et y associe une sélection de produits cliquables de la boutique du marchand (protection BOLA stricte).',
  })
  @ApiResponse({
    status: 201,
    description: 'Flux vidéo ou Live créé avec succès',
  })
  @ApiResponse({
    status: 403,
    description:
      'Tentative d’associer les produits d’une autre boutique ou marchand non authentifié',
  })
  async createStream(
    @CurrentUser('id') vendorId: string,
    @Body() dto: CreateStreamDto,
  ) {
    return this.streamsService.createStream(vendorId, dto);
  }

  @Get()
  @Public()
  @ApiOperation({
    summary: 'Lister les vidéos courtes et les Lives Shopping (Public)',
    description:
      'Renvoie la liste paginée des vidéos ou des directs avec filtres par type, statut et boutique.',
  })
  @ApiResponse({
    status: 200,
    description: 'Liste des flux retournée avec succès',
  })
  async getStreams(@Query() query: QueryStreamsDto) {
    return this.streamsService.getStreams(query);
  }

  @Get(':id')
  @Public()
  @ApiOperation({
    summary: 'Consulter un flux et ses produits cliquables (Public)',
    description:
      'Récupère le média vidéo, le statut du direct et la liste des articles affichés dans la vidéo.',
  })
  @ApiParam({
    name: 'id',
    description: 'Identifiant UUID du flux',
  })
  @ApiResponse({
    status: 200,
    description: 'Détails du flux retournés',
  })
  @ApiResponse({
    status: 404,
    description: 'Flux introuvable',
  })
  async getStreamById(@Param('id') streamId: string) {
    return this.streamsService.getStreamById(streamId);
  }

  @Patch(':id/status')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.VENDOR)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Démarrer ou terminer un Live (Vendeur propriétaire)',
    description:
      'Permet au commerçant de lancer son Live (statut LIVE) ou de le clore (statut ENDED).',
  })
  @ApiParam({
    name: 'id',
    description: 'Identifiant UUID du flux',
  })
  @ApiResponse({
    status: 200,
    description: 'Statut du flux mis à jour',
  })
  @ApiResponse({
    status: 403,
    description: 'Accès refusé : vous n’êtes pas le propriétaire de ce flux',
  })
  async updateStreamStatus(
    @CurrentUser('id') vendorId: string,
    @Param('id') streamId: string,
    @Body() dto: UpdateStreamStatusDto,
  ) {
    return this.streamsService.updateStreamStatus(vendorId, streamId, dto);
  }

  @Patch(':id/pin-product/:productId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.VENDOR)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Épingler un produit en direct pendant le Live (Vendeur)',
    description:
      'Affiche instantanément le produit en pop-up sur les écrans de tous les spectateurs connectés via WebSocket.',
  })
  @ApiParam({
    name: 'id',
    description: 'Identifiant UUID du flux',
  })
  @ApiParam({
    name: 'productId',
    description: 'Identifiant UUID du produit à épingler en direct',
  })
  @ApiResponse({
    status: 200,
    description: 'Produit épinglé et diffusé en direct sur le socket',
  })
  async pinProduct(
    @CurrentUser('id') vendorId: string,
    @Param('id') streamId: string,
    @Param('productId') productId: string,
  ) {
    return this.streamsService.pinProduct(vendorId, streamId, productId);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.VENDOR)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Supprimer un flux vidéo (Vendeur propriétaire)',
  })
  @ApiParam({
    name: 'id',
    description: 'Identifiant UUID du flux',
  })
  @ApiResponse({
    status: 200,
    description: 'Flux supprimé avec succès',
  })
  async deleteStream(
    @CurrentUser('id') vendorId: string,
    @Param('id') streamId: string,
  ) {
    return this.streamsService.deleteStream(vendorId, streamId);
  }
}
