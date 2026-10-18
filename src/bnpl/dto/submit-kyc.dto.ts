import { ApiProperty } from '@nestjs/swagger';
import { IsString, MinLength, MaxLength } from 'class-validator';

export class SubmitKycDto {
  @ApiProperty({
    description: 'Numéro de la Carte Nationale d’Identité (CNI) sénégalaise ou passeport',
    example: '1755199501234',
  })
  @IsString()
  @MinLength(5, { message: 'Le numéro de CNI doit comporter au moins 5 caractères.' })
  @MaxLength(30, { message: 'Le numéro de CNI ne peut pas dépasser 30 caractères.' })
  idCardNumber!: string;

  @ApiProperty({
    description: 'URL de la pièce d’identité numérisée (recto/verso)',
    example: 'https://cdn.openboutik.sn/kyc/cni-fatou-ndiaye.jpg',
  })
  @IsString()
  idCardUrl!: string;
}
