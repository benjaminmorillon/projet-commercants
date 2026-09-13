import { IsEmail, IsIn, IsOptional, Length, MinLength } from 'class-validator';
import { LONGUEUR_MINIMALE_MOT_DE_PASSE } from '../password';

export class InscriptionDto {
  @IsEmail({}, { message: 'Cette adresse email ne semble pas valide.' })
  email: string;

  @Length(2, 40, { message: 'Le pseudo doit faire entre 2 et 40 caractères.' })
  pseudo: string;

  @MinLength(LONGUEUR_MINIMALE_MOT_DE_PASSE, {
    message: `Le mot de passe doit faire au moins ${LONGUEUR_MINIMALE_MOT_DE_PASSE} caractères.`,
  })
  motDePasse: string;

  // Un compte joueur par défaut ; « commercant » pour un établissement.
  @IsOptional()
  @IsIn(['particulier', 'commercant'])
  type?: 'particulier' | 'commercant';
}
