import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class LoginDto {
  @ApiProperty({
    example: '+221771234567',
    description: 'Numéro de téléphone (+221...) ou adresse email de connexion',
  })
  @IsNotEmpty({ message: 'L’identifiant (téléphone ou email) est requis' })
  @IsString()
  identifier: string;

  @ApiProperty({
    example: 'Passer123!',
    description: 'Mot de passe du compte',
  })
  @IsNotEmpty({ message: 'Le mot de passe est requis' })
  @IsString()
  password: string;
}
