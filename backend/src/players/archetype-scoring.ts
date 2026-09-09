import { SubmitQuestionnaireDto } from './dto/submit-questionnaire.dto';

export interface ArchetypeScores {
  scoreExplorateur: number;
  scoreAccomplisseur: number;
  scoreCompetiteur: number;
  scoreSocialisateur: number;
}

/**
 * Constitution initiale du profil archétype (section 2.1 des specs) à partir
 * des 4 sliders par paires opposées. Chaque archétype est la moyenne de ses
 * deux composantes les plus liées, chacune ramenée sur 0-100 dans le sens
 * qui pousse vers cet archétype.
 *
 * Ce n'est qu'un point de départ : le score évoluera ensuite en continu via
 * le moteur d'événements (section 2.1, "Évolution du score"), pas encore
 * implémenté à ce stade.
 */
export function computeInitialArchetypeScores(
  sliders: SubmitQuestionnaireDto,
): ArchetypeScores {
  const {
    decouverteHabitude,
    competitionCooperation,
    seulGroupe,
    objectifImprovisation,
  } = sliders;

  const versDecouverte = 100 - decouverteHabitude;
  const versHabitude = decouverteHabitude;
  const versCompetition = 100 - competitionCooperation;
  const versCooperation = competitionCooperation;
  const versSeul = 100 - seulGroupe;
  const versGroupe = seulGroupe;
  const versObjectifClair = 100 - objectifImprovisation;
  const versImprovisation = objectifImprovisation;

  return {
    scoreExplorateur: average(versDecouverte, versImprovisation),
    scoreAccomplisseur: average(versHabitude, versObjectifClair),
    scoreCompetiteur: average(versCompetition, versSeul),
    scoreSocialisateur: average(versCooperation, versGroupe),
  };
}

function average(a: number, b: number): number {
  return Math.round(((a + b) / 2) * 10) / 10;
}
