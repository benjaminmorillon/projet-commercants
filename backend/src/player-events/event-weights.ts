// Moteur d'événements du profil joueur (section 2.1 des specs) : le profil
// n'est pas figé après le questionnaire, il est recalculé à chaque action.

export type PlayerEventType =
  | 'lieu_inedit_visite'
  | 'lieu_habituel_visite'
  | 'mission_solo_terminee'
  | 'mission_groupe_terminee'
  | 'mission_competitive_terminee'
  | 'avis_publie'
  | 'ami_ajoute'
  | 'invitation_acceptee'
  | 'don_effectue';

export interface ArchetypeScores {
  scoreExplorateur: number;
  scoreAccomplisseur: number;
  scoreCompetiteur: number;
  scoreSocialisateur: number;
}

export type EventWeights = ArchetypeScores;

// Inertie du profil : à chaque événement, un score ne parcourt que 8 % de la
// distance qui le sépare de son extrême. Un seul événement bouge donc peu,
// c'est la répétition d'un comportement qui déplace vraiment le profil.
export const INERTIE = 0.08;

const NEUTRE: EventWeights = {
  scoreExplorateur: 0,
  scoreAccomplisseur: 0,
  scoreCompetiteur: 0,
  scoreSocialisateur: 0,
};

// Poids par type d'action, entre -1 et 1. Les exemples du tableau de la
// section 2.1 des specs sont repris tels quels.
export const EVENT_WEIGHTS: Record<PlayerEventType, EventWeights> = {
  // "Lieu jamais visité choisi → +explorateur"
  lieu_inedit_visite: { ...NEUTRE, scoreExplorateur: 1 },
  // Revenir au même endroit dit plutôt l'habitude que la découverte.
  lieu_habituel_visite: { ...NEUTRE, scoreExplorateur: -0.3, scoreAccomplisseur: 0.2 },
  // "Mission solo terminée sans interaction → +accomplisseur"
  mission_solo_terminee: { ...NEUTRE, scoreAccomplisseur: 1, scoreSocialisateur: -0.2 },
  // "Discussion initiée, mission collective rejointe → +socialisateur"
  mission_groupe_terminee: { ...NEUTRE, scoreSocialisateur: 1, scoreAccomplisseur: 0.2 },
  // "Défi avec classement/timer rejoint → +compétiteur"
  mission_competitive_terminee: { ...NEUTRE, scoreCompetiteur: 1, scoreAccomplisseur: 0.3 },
  avis_publie: { ...NEUTRE, scoreExplorateur: 0.4 },
  ami_ajoute: { ...NEUTRE, scoreSocialisateur: 0.8 },
  invitation_acceptee: { ...NEUTRE, scoreSocialisateur: 0.6, scoreExplorateur: 0.3 },
  // Tracé comme comportement, sans effet sur les 4 archétypes : il alimentera
  // le futur axe "impact/générosité" évoqué section 2.5 des specs.
  don_effectue: { ...NEUTRE },
};

export const EVENT_LABELS: Record<PlayerEventType, string> = {
  lieu_inedit_visite: 'Nouveau lieu découvert',
  lieu_habituel_visite: 'Retour dans un lieu connu',
  mission_solo_terminee: 'Mission solo accomplie',
  mission_groupe_terminee: 'Mission à plusieurs accomplie',
  mission_competitive_terminee: 'Défi compétitif relevé',
  avis_publie: 'Avis publié',
  ami_ajoute: 'Nouvel ami',
  invitation_acceptee: 'Invitation acceptée',
  don_effectue: 'Crédit donné à une cause',
};

/**
 * Applique un événement aux scores, en moyenne mobile pondérée : un poids
 * positif rapproche le score de 100, un poids négatif le rapproche de 0,
 * d'autant moins vite qu'on est déjà proche de la borne. Les scores restent
 * donc toujours dans 0–100 sans avoir à les tronquer.
 */
export function applyEventToScores(
  scores: ArchetypeScores,
  weights: EventWeights,
): ArchetypeScores {
  const next = (valeur: number, poids: number): number => {
    if (poids === 0) {
      return arrondi(valeur);
    }
    const cible = poids > 0 ? 100 : 0;
    return arrondi(valeur + (cible - valeur) * INERTIE * Math.abs(poids));
  };

  return {
    scoreExplorateur: next(scores.scoreExplorateur, weights.scoreExplorateur),
    scoreAccomplisseur: next(scores.scoreAccomplisseur, weights.scoreAccomplisseur),
    scoreCompetiteur: next(scores.scoreCompetiteur, weights.scoreCompetiteur),
    scoreSocialisateur: next(scores.scoreSocialisateur, weights.scoreSocialisateur),
  };
}

function arrondi(valeur: number): number {
  return Math.round(valeur * 10) / 10;
}
