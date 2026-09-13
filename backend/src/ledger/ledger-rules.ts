// Les règles de l'économie de jetons, en fonctions pures.
//
// Principe : un jeton ne se crée ni ne se perd par accident. Chaque mouvement
// part d'un compte et arrive dans un autre. Les seules exceptions sont
// l'émission (la plateforme crée des jetons pour récompenser une mission) et
// le rechargement (un commerçant convertit un paiement en jetons) — les deux
// sont explicites et tracées.

export type TypeCompte = 'joueur' | 'commercant' | 'plateforme' | 'cause';

export type MotifMouvement =
  | 'recompense_mission'
  | 'recompense_duo'
  | 'ciblage_part_joueur'
  | 'ciblage_commission'
  | 'depense_chez_partenaire'
  | 'don_a_une_cause'
  | 'rechargement';

// Un jeton vaut un centime d'euro : on arrondit tout au centime pour qu'un
// solde ne parte jamais en décimales infinies.
export const DECIMALES = 2;

/**
 * Arrondit au centime.
 *
 * Le `1 + EPSILON` n'est pas une coquetterie : un ordinateur ne stocke pas
 * 1,005 exactement mais 1,00499999999999989, si bien qu'un arrondi naïf
 * rendrait 1,00 au lieu de 1,01. On corrige d'un cheveu avant d'arrondir.
 *
 * (La parade définitive serait de tout compter en centimes entiers ; ce sera
 * à faire le jour où de vrais montants circuleront.)
 */
export function arrondir(montant: number): number {
  const facteur = 10 ** DECIMALES;
  return Math.round(montant * facteur * (1 + Number.EPSILON)) / facteur;
}

/** Le même montant, exprimé en centimes entiers — pour comparer sans risque. */
export function enCentimes(montant: number): number {
  return Math.round(montant * 100 * (1 + Number.EPSILON));
}

// Valeur de repli, modifiable depuis le back-office
// (réglage « jetons.montantMinimum »).
export const MONTANT_MINIMUM = 0.01;

export interface VerificationMontant {
  valide: boolean;
  raison?: string;
}

export function verifierMontant(
  montant: number,
  minimum = MONTANT_MINIMUM,
): VerificationMontant {
  if (!Number.isFinite(montant)) {
    return { valide: false, raison: 'Le montant doit être un nombre.' };
  }
  if (montant < minimum) {
    return { valide: false, raison: `Le montant minimum est de ${minimum} jeton.` };
  }
  return { valide: true };
}

export function soldeSuffisant(solde: number, montant: number): boolean {
  // On compare en centimes entiers pour éviter les surprises du calcul à
  // virgule flottante : 0,1 + 0,2 ne vaut pas exactement 0,3 pour un ordinateur.
  return enCentimes(solde) >= enCentimes(montant);
}

// Libellés affichés dans les historiques, des deux côtés du mouvement.
const LIBELLES: Record<MotifMouvement, { sortie: string; entree: string }> = {
  recompense_mission: { sortie: 'Récompense de mission', entree: 'Mission accomplie' },
  recompense_duo: { sortie: 'Récompense de duo', entree: 'Duo accompli' },
  ciblage_part_joueur: { sortie: 'Ciblage — part joueur', entree: 'Invitation reçue' },
  ciblage_commission: { sortie: 'Ciblage — commission', entree: 'Commission de ciblage' },
  depense_chez_partenaire: { sortie: 'Dépense chez un partenaire', entree: 'Paiement d’un client' },
  don_a_une_cause: { sortie: 'Don à une cause', entree: 'Don reçu' },
  rechargement: { sortie: 'Rechargement', entree: 'Rechargement du compte' },
};

export function libelleMouvement(motif: MotifMouvement, sens: 'entree' | 'sortie'): string {
  return LIBELLES[motif]?.[sens] ?? 'Mouvement';
}

/**
 * Répartition d'un ciblage : le joueur touche sa part, la plateforme garde sa
 * commission. Les deux parts sont arrondies, et la commission absorbe le
 * reliquat pour que la somme fasse exactement le total facturé.
 */
export function repartirCiblage(
  coutTotal: number,
  partJoueur: number,
): { versJoueurs: number; versPlateforme: number } {
  const versJoueurs = arrondir(coutTotal * partJoueur);
  return { versJoueurs, versPlateforme: arrondir(coutTotal - versJoueurs) };
}
