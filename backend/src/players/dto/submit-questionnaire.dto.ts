import { IsInt, Max, Min } from 'class-validator';

// Les 4 sliders par paires opposées (section 2.1 des specs).
// Chaque slider va de 0 (pôle gauche) à 100 (pôle droit).
export class SubmitQuestionnaireDto {
  // 0 = Découverte, 100 = Habitude
  @IsInt()
  @Min(0)
  @Max(100)
  decouverteHabitude: number;

  // 0 = Compétition, 100 = Coopération
  @IsInt()
  @Min(0)
  @Max(100)
  competitionCooperation: number;

  // 0 = Seul, 100 = En groupe
  @IsInt()
  @Min(0)
  @Max(100)
  seulGroupe: number;

  // 0 = Objectif clair, 100 = Improvisation
  @IsInt()
  @Min(0)
  @Max(100)
  objectifImprovisation: number;
}
