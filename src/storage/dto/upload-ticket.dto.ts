import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsNotEmpty, IsNumber, IsString, Max, Min } from 'class-validator';

export enum StorageCategory {
  KYC_DOCUMENT = 'KYC_DOCUMENT',
  STREAM_MEDIA = 'STREAM_MEDIA',
  PRODUCT_IMAGE = 'PRODUCT_IMAGE',
  SHOP_BANNER = 'SHOP_BANNER',
}

export class CreateUploadTicketDto {
  @ApiProperty({ example: 'cni_recto.jpg', description: 'Nom original du fichier' })
  @IsString()
  @IsNotEmpty()
  filename: string;

  @ApiProperty({
    example: 'image/jpeg',
    description: 'Type MIME autorisé (image/jpeg, image/png, application/pdf, video/mp4)',
  })
  @IsString()
  @IsNotEmpty()
  fileType: string;

  @ApiProperty({
    example: 1048576,
    description: 'Taille du fichier en octets (max 50 Mo pour vidéo, 10 Mo pour image/document)',
  })
  @IsNumber()
  @Min(100)
  @Max(52428800) // 50 MB max
  fileSize: number;

  @ApiProperty({ enum: StorageCategory, example: StorageCategory.KYC_DOCUMENT })
  @IsEnum(StorageCategory)
  category: StorageCategory;
}
