import { IsEmail, MinLength } from 'class-validator';

export class ConnexionDto {
  @IsEmail()
  email: string;

  @MinLength(1)
  motDePasse: string;
}
