import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsOptional, IsString, Matches, MinLength } from 'class-validator';

export class RegisterClientDto {
  @ApiProperty({
    example: '+221776543210',
    description: 'Numéro de téléphone sénégalais au format international (+221XXXXXXXXX)',
  })
  @IsNotEmpty({ message: 'Le numéro de téléphone est requis' })
  @IsString()
  @Matches(/^\+221[0-9]{9}$/, {
    message: 'Le numéro de téléphone doit être un numéro sénégalais valide au format +221XXXXXXXXX (ex: +221771234567)',
  })
  phone: string;

  @ApiProperty({
    example: 'Fatou Ndiaye',
    description: 'Nom complet du client',
  })
  @IsNotEmpty({ message: 'Le nom complet est requis' })
  @IsString()
  fullName: string;

  @ApiPropertyOptional({
    example: 'fatou.ndiaye@example.sn',
    description: 'Adresse email optionnelle',
  })
  @IsOptional()
  @IsEmail({}, { message: 'Adresse email invalide' })
  email?: string;

  @ApiProperty({
    example: 'Passer123!',
    description: 'Mot de passe sécurisé (au moins 6 caractères)',
  })
  @IsNotEmpty({ message: 'Le mot de passe est requis' })
  @IsString()
  @MinLength(6, { message: 'Le mot de passe doit comporter au moins 6 caractères' })
  password: string;
}
