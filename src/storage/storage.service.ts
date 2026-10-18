import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import * as crypto from 'crypto';
import { CreateUploadTicketDto, StorageCategory } from './dto/upload-ticket.dto';
import { UploadTicketResponseDto } from './dto/upload-ticket-response.dto';

@Injectable()
export class StorageService {
  private readonly logger = new Logger(StorageService.name);
  private readonly secretKey = process.env.STORAGE_SIGNING_SECRET || process.env.JWT_SECRET || 'openboutik-storage-secret-key-2026';

  private readonly allowedMimeTypes: Record<StorageCategory, string[]> = {
    [StorageCategory.KYC_DOCUMENT]: ['image/jpeg', 'image/png', 'application/pdf'],
    [StorageCategory.STREAM_MEDIA]: ['video/mp4', 'video/webm', 'image/jpeg', 'image/png'],
    [StorageCategory.PRODUCT_IMAGE]: ['image/jpeg', 'image/png', 'image/webp'],
    [StorageCategory.SHOP_BANNER]: ['image/jpeg', 'image/png', 'image/webp'],
  };

  /**
   * Génère un ticket d'upload direct avec signature sécurisée
   */
  generateUploadTicket(userId: string, dto: CreateUploadTicketDto): UploadTicketResponseDto {
    // 1. Validation du type MIME par rapport à la catégorie
    const allowed = this.allowedMimeTypes[dto.category] || [];
    if (!allowed.includes(dto.fileType.toLowerCase())) {
      throw new BadRequestException(
        `Type de fichier non autorisé pour la catégorie ${dto.category}. Types acceptés : ${allowed.join(', ')}`,
      );
    }

    // 2. Limitation stricte des tailles
    if (dto.category === StorageCategory.STREAM_MEDIA && dto.fileSize > 52428800) {
      throw new BadRequestException('Les fichiers vidéo ne peuvent excéder 50 Mo.');
    } else if (dto.category !== StorageCategory.STREAM_MEDIA && dto.fileSize > 10485760) {
      throw new BadRequestException('Les documents et images ne peuvent excéder 10 Mo.');
    }

    const ticketId = crypto.randomUUID();
    const timestamp = Math.floor(Date.now() / 1000);
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString(); // 15 minutes
    const cleanFilename = dto.filename.replace(/[^a-zA-Z0-9.-]/g, '_');
    const cloudPath = `openboutik/${dto.category.toLowerCase()}/${userId}/${Date.now()}_${cleanFilename}`;

    // Le document KYC est toujours privé (accès sécurisé sous mandat admin)
    const isPrivate = dto.category === StorageCategory.KYC_DOCUMENT;

    // 3. Détection Cloudinary si variables d'environnement configurées
    const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
    const apiKey = process.env.CLOUDINARY_API_KEY;
    const apiSecret = process.env.CLOUDINARY_API_SECRET;

    if (cloudName && apiKey && apiSecret) {
      this.logger.log(`Génération ticket Cloudinary pour ${dto.category} (${userId})`);
      const paramsToSign = `folder=openboutik/${dto.category.toLowerCase()}&public_id=${userId}_${Date.now()}&timestamp=${timestamp}${apiSecret}`;
      const signature = crypto.createHash('sha1').update(paramsToSign).digest('hex');

      return {
        ticketId,
        provider: 'CLOUDINARY',
        uploadUrl: `https://api.cloudinary.com/v1_1/${cloudName}/auto/upload`,
        publicUrl: `https://res.cloudinary.com/${cloudName}/image/upload/openboutik/${dto.category.toLowerCase()}/${userId}_${Date.now()}`,
        signedParams: {
          api_key: apiKey,
          timestamp,
          signature,
          folder: `openboutik/${dto.category.toLowerCase()}`,
        },
        expiresAt,
        isPrivate,
      };
    }

    // 4. Mode Standard Sécurisé (Standalone Storage avec HMAC SHA-256)
    const signaturePayload = `${ticketId}:${userId}:${cloudPath}:${timestamp}:${dto.fileSize}`;
    const hmacSignature = crypto
      .createHmac('sha256', this.secretKey)
      .update(signaturePayload)
      .digest('hex');

    const baseUrl = process.env.APP_URL || 'https://openboutik-api.onrender.com';
    const publicUrl = `${baseUrl}/storage/files/${cloudPath}`;

    return {
      ticketId,
      provider: 'SECURE_STORAGE',
      uploadUrl: `${baseUrl}/api/v1/storage/upload/${ticketId}`,
      publicUrl,
      signedParams: {
        token: hmacSignature,
        path: cloudPath,
        timestamp,
        userId,
      },
      expiresAt,
      isPrivate,
    };
  }

  /**
   * Génère une URL de visualisation éphémère (15 min) pour le Super-Admin (ex: examen CNI KYC)
   */
  generateExpiringViewUrl(fileUrl: string, requestedByRole: string): string {
    if (requestedByRole !== 'SUPER_ADMIN') {
      throw new BadRequestException('Seul un Super-Administrateur peut générer un accès sécurisé temporaire aux pièces d’identité.');
    }

    const expires = Math.floor(Date.now() / 1000) + 900; // 15 minutes
    const token = crypto
      .createHmac('sha256', this.secretKey)
      .update(`${fileUrl}:${expires}`)
      .digest('hex');

    return `${fileUrl}?token=${token}&expires=${expires}`;
  }
}
