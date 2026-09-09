import { IsIn, IsOptional, Length } from 'class-validator';

const CHOIX = ['depense', 'don', 'accumulation'] as const;

export class RequestValidationDto {
  @IsIn(CHOIX)
  choix: 'depense' | 'don' | 'accumulation';

  // Requis seulement si la mission n'est pas rattachée à un lieu : pseudo
  // exact de l'autre joueur qui devra valider.
  @IsOptional()
  @Length(2, 40)
  validatorPseudo?: string;
}
