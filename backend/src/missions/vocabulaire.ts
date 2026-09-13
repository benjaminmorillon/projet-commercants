// ---------------------------------------------------------------------------
// Le vocabulaire d'une mission.
//
// Ces listes servaient uniquement à valider ce qu'un commerçant envoie. Elles
// servent maintenant AUSSI à construire les listes déroulantes du back-office.
// Elles vivent donc ici, à un seul endroit : une valeur ajoutée à la liste
// apparaît du même coup dans le formulaire d'administration, et une valeur
// retirée cesse d'être acceptée. Les deux ne peuvent plus diverger.
//
// Chaque entrée porte son libellé lisible, parce qu'« humour_insolite » est
// une valeur technique et « Humour et insolite » ce qu'on veut lire à l'écran.
// ---------------------------------------------------------------------------

export interface Terme {
  valeur: string;
  libelle: string;
}

export const ARCHETYPES: Terme[] = [
  { valeur: 'explorateur', libelle: 'Explorateur' },
  { valeur: 'accomplisseur', libelle: 'Accomplisseur' },
  { valeur: 'competiteur', libelle: 'Compétiteur' },
  { valeur: 'socialisateur', libelle: 'Socialisateur' },
  { valeur: 'mixte', libelle: 'Mixte' },
];

export const DUREES: Terme[] = [
  { valeur: 'courte', libelle: 'Courte' },
  { valeur: 'moyenne', libelle: 'Moyenne' },
  { valeur: 'longue', libelle: 'Longue' },
];

export const THEMES: Terme[] = [
  { valeur: 'culture', libelle: 'Culture' },
  { valeur: 'gastronomie', libelle: 'Gastronomie' },
  { valeur: 'musique', libelle: 'Musique' },
  { valeur: 'art', libelle: 'Art' },
  { valeur: 'humour_insolite', libelle: 'Humour et insolite' },
  { valeur: 'sport', libelle: 'Sport' },
  { valeur: 'jeux_esprit', libelle: "Jeux d'esprit" },
];

export const MODES_INTERACTION: Terme[] = [
  { valeur: 'solo', libelle: 'Seul' },
  { valeur: 'duo_affinite_naturelle', libelle: 'En duo (affinité)' },
  { valeur: 'duo_defi_complementarite', libelle: 'En duo (complémentarité)' },
  { valeur: 'groupe', libelle: 'En groupe' },
];

/** Les valeurs seules, pour les décorateurs de validation. */
export const valeursDe = (termes: Terme[]): string[] => termes.map((t) => t.valeur);

/** Le libellé lisible d'une valeur technique, ou la valeur si elle est inconnue. */
export function libelleDe(termes: Terme[], valeur: string | null): string {
  if (!valeur) return '—';
  return termes.find((t) => t.valeur === valeur)?.libelle ?? valeur;
}

/** Tout le vocabulaire d'un coup, tel que le back-office le consomme. */
export const VOCABULAIRE = {
  archetypes: ARCHETYPES,
  durees: DUREES,
  themes: THEMES,
  modesInteraction: MODES_INTERACTION,
};
