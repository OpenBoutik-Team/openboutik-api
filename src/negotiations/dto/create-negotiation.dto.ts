import { ApiProperty } from '@nestjs/swagger';
import { IsUUID, IsInt, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateNegotiationDto {
  @ApiProperty({
    description: 'Identifiant UUID du produit à négocier',
    example: 'prod-boubou-bazin-001',
  })
  @IsUUID('all', { message: 'L’identifiant du produit doit être un UUID valide.' })
  productId!: string;

  @ApiProperty({
    description:
      'Prix proposé par le client en FCFA (doit être >= 50% du prix et < prix du produit)',
    example: 45000,
  })
  @Type(() => Number)
  @IsInt({ message: 'Le prix proposé doit être un nombre entier en FCFA.' })
  @Min(100, { message: 'Le montant proposé doit être d’au moins 100 FCFA.' })
  proposedPriceFcfa!: number;
}
