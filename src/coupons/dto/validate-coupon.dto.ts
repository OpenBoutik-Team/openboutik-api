import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsNotEmpty, IsString, Min } from 'class-validator';

export class ValidateCouponDto {
  @ApiProperty({
    example: 'TABASKI20',
    description: 'Code promotionnel à valider',
  })
  @IsNotEmpty({ message: 'Le code promo est requis' })
  @IsString({ message: 'Le code promo doit être une chaîne' })
  code: string;

  @ApiProperty({
    example: 'uuid-de-la-boutique',
    description: 'Identifiant de la boutique émettrice',
  })
  @IsNotEmpty({ message: 'L’identifiant de la boutique est requis' })
  @IsString({ message: 'L’identifiant de la boutique doit être valide' })
  shopId: string;

  @ApiProperty({
    example: 25000,
    description: 'Sous-total des articles du panier pour cette boutique en FCFA',
  })
  @IsNotEmpty({ message: 'Le sous-total est requis' })
  @IsInt({ message: 'Le sous-total doit être un entier' })
  @Min(0, { message: 'Le sous-total doit être supérieur ou égal à 0' })
  subtotalFcfa: number;
}
