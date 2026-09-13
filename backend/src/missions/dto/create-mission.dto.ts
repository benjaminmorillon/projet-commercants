import { IsIn, IsNumber, IsPositive, Length } from 'class-validator';
import {
  ARCHETYPES,
  DUREES,
  MODES_INTERACTION,
  THEMES,
  Terme,
  valeursDe,
} from '../vocabulaire';

// « theme must be one of the following values: culture, gastronomie… » n'est
// pas une phrase qu'on montre à quelqu'un. On fabrique le message à partir
// des libellés lisibles du vocabulaire.
const parmi = (quoi: string, termes: Terme[]) =>
  `${quoi} doit être : ${termes.map((t) => t.libelle).join(', ')}.`;

export class CreateMissionDto {
  @Length(2, 100, { message: 'Le titre doit faire entre 2 et 100 caractères.' })
  titre: string;

  @Length(10, 1000, {
    message: 'La description doit faire entre 10 et 1000 caractères.',
  })
  description: string;

  @IsIn(valeursDe(ARCHETYPES), { message: parmi("L'archétype", ARCHETYPES) })
  archetypeDominant: string;

  @IsIn(valeursDe(DUREES), { message: parmi('La durée', DUREES) })
  duree: string;

  @IsIn(valeursDe(THEMES), { message: parmi('Le thème', THEMES) })
  theme: string;

  @IsIn(valeursDe(MODES_INTERACTION), { message: parmi('Le mode', MODES_INTERACTION) })
  modeInteraction: string;

  @IsNumber({}, { message: 'La récompense doit être un nombre.' })
  @IsPositive({ message: 'La récompense doit être supérieure à zéro.' })
  recompenseBase: number;
}
