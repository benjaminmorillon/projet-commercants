import { IsIn, IsNumber, IsPositive, Length } from 'class-validator';

const ARCHETYPES = [
  'explorateur',
  'accomplisseur',
  'competiteur',
  'socialisateur',
  'mixte',
];
const DUREES = ['courte', 'moyenne', 'longue'];
const THEMES = [
  'culture',
  'gastronomie',
  'musique',
  'art',
  'humour_insolite',
  'sport',
  'jeux_esprit',
];
const MODES_INTERACTION = [
  'solo',
  'duo_affinite_naturelle',
  'duo_defi_complementarite',
  'groupe',
];

export class CreateMissionDto {
  @Length(2, 100)
  titre: string;

  @Length(10, 1000)
  description: string;

  @IsIn(ARCHETYPES)
  archetypeDominant: string;

  @IsIn(DUREES)
  duree: string;

  @IsIn(THEMES)
  theme: string;

  @IsIn(MODES_INTERACTION)
  modeInteraction: string;

  @IsNumber()
  @IsPositive()
  recompenseBase: number;
}
