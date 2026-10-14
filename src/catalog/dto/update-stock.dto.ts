import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsNotEmpty, Min } from 'class-validator';

export class UpdateStockDto {
  @ApiProperty({
    example: 15,
    description: 'Nouveau stock disponible pour ce produit (entier >= 0)',
  })
  @IsNotEmpty({ message: 'Le stock est requis' })
  @IsInt({ message: 'Le stock doit être un entier' })
  @Min(0, { message: 'Le stock ne peut être négatif' })
  stock: number;
}
