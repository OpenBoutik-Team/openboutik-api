import { ApiProperty } from '@nestjs/swagger';

export class UploadTicketResponseDto {
  @ApiProperty({ example: '840f6b4b-9e4b-4a52-9b24-9694294d1df0' })
  ticketId: string;

  @ApiProperty({ enum: ['CLOUDINARY', 'SECURE_STORAGE'], example: 'SECURE_STORAGE' })
  provider: 'CLOUDINARY' | 'SECURE_STORAGE';

  @ApiProperty({ example: 'https://openboutik-api.onrender.com/api/v1/storage/upload/ticket-id' })
  uploadUrl: string;

  @ApiProperty({ example: 'https://openboutik-api.onrender.com/storage/files/openboutik/kyc/user_123.jpg' })
  publicUrl: string;

  @ApiProperty({ example: { timestamp: 1730000000, token: 'hmac_sha256_hash' } })
  signedParams: Record<string, any>;

  @ApiProperty({ example: '2026-10-18T23:59:59.000Z' })
  expiresAt: string;

  @ApiProperty({ example: true, description: 'True pour les documents d’identité KYC privés' })
  isPrivate: boolean;
}
