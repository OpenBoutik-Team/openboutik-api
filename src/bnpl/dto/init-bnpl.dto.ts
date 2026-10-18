import { ApiProperty } from '@nestjs/swagger';
import { IsUUID, IsIn, IsInt } from 'class-validator';
import { Type } from 'class-transformer';

export class InitBnplDto {
  @ApiProperty({
    description: 'Identifiant UUID de la commande à échelonner',
    example: 'order-uuid-12345',
  })
  @IsUUID('all', { message: 'L’identifiant de commande doit être un UUID valide.' })
  orderId!: string;

  @ApiProperty({
    description: 'Nombre de mensualités souhaité (3 ou 4 fois uniquement)',
    example: 4,
    enum: [3, 4],
  })
  @Type(() => Number)
  @IsInt({ message: 'Le nombre d’échéances doit être un entier.' })
  @IsIn([3, 4], {
    message: 'Le paiement fractionné est disponible uniquement en 3 ou 4 fois.',
  })
  installmentsCount!: number;
}
