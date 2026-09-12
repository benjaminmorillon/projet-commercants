// Matching des missions duo (section 2.2 des specs et docs/guide-missions-sociales.md).
// Deux modes : une "affinité naturelle" qui rend la rencontre fluide, ou un
// "défi de complémentarité" entre profils a priori peu compatibles.

export type Archetype = 'explorateur' | 'accomplisseur' | 'competiteur' | 'socialisateur';
export type TypeMatching = 'affinite_naturelle' | 'defi_complementarite';
export type CombinaisonType = 'naturelle' | 'defi' | 'meme_profil';

export interface ProfilScores {
  scoreExplorateur: number;
  scoreAccomplisseur: number;
  scoreCompetiteur: number;
  scoreSocialisateur: number;
}

export function archetypeDominant(profil: ProfilScores): Archetype {
  const paires: [Archetype, number][] = [
    ['explorateur', profil.scoreExplorateur],
    ['accomplisseur', profil.scoreAccomplisseur],
    ['competiteur', profil.scoreCompetiteur],
    ['socialisateur', profil.scoreSocialisateur],
  ];
  return paires.reduce((meilleur, actuel) => (actuel[1] > meilleur[1] ? actuel : meilleur))[0];
}

// Clé stable pour une paire d'archétypes, indépendante de l'ordre.
export function cleCombinaison(a: Archetype, b: Archetype): string {
  return [a, b].sort().join('+');
}

// Tableau des combinaisons du guide des missions sociales. Les deux paires
// que le guide ne couvre pas (explorateur+compétiteur, accomplisseur+
// socialisateur) opposent aussi deux moteurs très différents : on les traite
// comme des défis de complémentarité.
const COMBINAISONS_NATURELLES = new Set([
  cleCombinaison('explorateur', 'socialisateur'),
  cleCombinaison('accomplisseur', 'competiteur'),
]);

export function typeCombinaison(a: Archetype, b: Archetype): CombinaisonType {
  if (a === b) {
    return 'meme_profil';
  }
  return COMBINAISONS_NATURELLES.has(cleCombinaison(a, b)) ? 'naturelle' : 'defi';
}

// À quel point cette combinaison colle au mode demandé.
const PERTINENCE: Record<TypeMatching, Record<CombinaisonType, number>> = {
  affinite_naturelle: { naturelle: 1, meme_profil: 0.7, defi: 0.2 },
  defi_complementarite: { defi: 1, meme_profil: 0.3, naturelle: 0.2 },
};

// Distance entre deux profils, ramenée sur 0–1 (0 = profils identiques).
export function distanceProfils(a: ProfilScores, b: ProfilScores): number {
  const ecarts = [
    a.scoreExplorateur - b.scoreExplorateur,
    a.scoreAccomplisseur - b.scoreAccomplisseur,
    a.scoreCompetiteur - b.scoreCompetiteur,
    a.scoreSocialisateur - b.scoreSocialisateur,
  ];
  const somme = ecarts.reduce((total, e) => total + e * e, 0);
  return Math.min(1, Math.sqrt(somme) / 200);
}

export interface HistoriqueCombinaison {
  // Taux de réussite passé de cette combinaison d'archétypes, entre 0 et 1.
  tauxReussite: number;
  nombreDuos: number;
}

/**
 * Score d'affinité d'un candidat, entre 0 et 1. Il mélange trois choses :
 * la pertinence de la combinaison pour le mode demandé, l'écart de profil
 * (qu'on veut faible en affinité et fort en défi), et ce que l'historique
 * dit de cette combinaison — c'est le "fonctionnent bien ensemble
 * historiquement" des specs.
 */
export function scoreAffinite(
  joueur: ProfilScores,
  candidat: ProfilScores,
  mode: TypeMatching,
  historique?: HistoriqueCombinaison,
): number {
  const combinaison = typeCombinaison(archetypeDominant(joueur), archetypeDominant(candidat));
  const pertinence = PERTINENCE[mode][combinaison];

  const distance = distanceProfils(joueur, candidat);
  const proximite = mode === 'affinite_naturelle' ? 1 - distance : distance;

  // L'historique ne pèse que s'il repose sur quelques duos : sinon il dirait
  // surtout du bruit. Il ne peut ni sauver ni couler un appariement, juste
  // départager des candidats proches.
  const poidsHistorique = historique ? Math.min(1, historique.nombreDuos / 5) : 0;
  const apportHistorique = historique ? (historique.tauxReussite - 0.5) * 2 : 0;

  const score = pertinence * 0.6 + proximite * 0.4 + apportHistorique * poidsHistorique * 0.15;
  return Math.round(Math.min(1, Math.max(0, score)) * 100) / 100;
}

export interface LieuCandidat {
  id: string;
  multiplicateur: number;
}

/**
 * Point de rendez-vous : l'IA privilégie les lieux sous-fréquentés mais
 * qualitatifs (section 2.2 des specs), que le multiplicateur identifie déjà.
 */
export function choisirLieuRendezVous(lieux: LieuCandidat[]): LieuCandidat | null {
  if (lieux.length === 0) {
    return null;
  }
  return [...lieux].sort((a, b) => b.multiplicateur - a.multiplicateur)[0];
}
