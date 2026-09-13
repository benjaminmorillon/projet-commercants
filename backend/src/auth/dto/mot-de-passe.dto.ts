import { IsEmail, Length, MinLength } from 'class-validator';
import { LONGUEUR_MINIMALE_MOT_DE_PASSE } from '../password';

export class MotDePasseOublieDto {
  @IsEmail()
  email: string;
}

export class ReinitialiserDto {
  @Length(20, 200)
  jeton: string;

  @MinLength(LONGUEUR_MINIMALE_MOT_DE_PASSE, {
    message: `Le mot de passe doit faire au moins ${LONGUEUR_MINIMALE_MOT_DE_PASSE} caractères.`,
  })
  motDePasse: string;
}
