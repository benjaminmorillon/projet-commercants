// Rééquilibrage dynamique de la fréquentation (section 4 des specs) :
// on favorise les lieux qualitatifs mais sous-fréquentés, sans jamais
// avantager un lieu simplement parce qu'il est peu qualitatif.

// Fenêtre glissante sur laquelle on compte les visites.
export const FENETRE_JOURS = 14;

// Capacité retenue quand le commerçant ne l'a pas renseignée.
export const CAPACITE_PAR_DEFAUT = 50;

// Sensibilité et bornes du multiplicateur.
const FACTEUR_ECART = 0.6;
const MULTIPLICATEUR_MIN = 0.7;
const MULTIPLICATEUR_MAX = 1.1;

// La note est normalisée sur la plage utile 2,5–5 plutôt que 0–5 : en
// dessous de 2,5/5 un lieu n'a pas à être poussé, même s'il est vide.
// C'est ce qui produit l'effet attendu par les specs ("lieu moyen et peu
// visité → bonus faible ou nul").
const NOTE_PLANCHER = 2.5;
const NOTE_MAX = 5;

// Qualité retenue quand le lieu n'a encore aucun avis : légèrement
// favorable, il bénéficie du doute sans être traité comme une valeur sûre.
const QUALITE_SANS_AVIS = 0.4;

export interface PlaceBalancing {
  nombreVisites: number;
  tauxOccupation: number;
  scoreQualite: number;
  multiplicateur: number;
}

export interface PlaceBalancingInput {
  nombreVisites: number;
  capaciteEstimee: number | null;
  // Note sur 5 (avis internes, ou note Google en attendant). Null si aucune.
  note: number | null;
}

export function computePlaceBalancing(input: PlaceBalancingInput): PlaceBalancing {
  const capacite = input.capaciteEstimee ?? CAPACITE_PAR_DEFAUT;
  const tauxOccupation = Math.min(1, input.nombreVisites / capacite);

  const scoreQualite =
    input.note === null
      ? QUALITE_SANS_AVIS
      : Math.min(1, Math.max(0, (input.note - NOTE_PLANCHER) / (NOTE_MAX - NOTE_PLANCHER)));

  const ecart = scoreQualite - tauxOccupation;
  const brut = 1 + ecart * FACTEUR_ECART;
  const multiplicateur = Math.min(MULTIPLICATEUR_MAX, Math.max(MULTIPLICATEUR_MIN, brut));

  return {
    nombreVisites: input.nombreVisites,
    tauxOccupation: Math.round(tauxOccupation * 100) / 100,
    scoreQualite: Math.round(scoreQualite * 100) / 100,
    multiplicateur: Math.round(multiplicateur * 100) / 100,
  };
}
