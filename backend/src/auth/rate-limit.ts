// Limitation des tentatives de connexion.
//
// Sans elle, rien n'empêche d'essayer des milliers de mots de passe : le
// hachage scrypt rend chaque essai lent, mais un attaquant patient finirait
// par passer. On compte les échecs et on ferme la porte un moment.

// Valeurs de repli, modifiables depuis le back-office (groupe « La sécurité
// des comptes »). La fenêtre de comptage et la durée de blocage sont un seul
// réglage : les séparer n'apporte rien et double les façons de se tromper.
export const MAX_ECHECS = 5;
export const FENETRE_MS = 15 * 60 * 1000; // on ne retient que 15 minutes d'échecs
export const DUREE_BLOCAGE_MS = 15 * 60 * 1000;

/** Les valeurs réglables. Omises, ce sont celles écrites juste au-dessus. */
export interface ReglesBlocage {
  maxEchecs?: number;
  dureeMs?: number;
}

export interface EtatTentatives {
  /** Horodatage des échecs encore dans la fenêtre. */
  echecs: number[];
  blocageJusqua: number | null;
}

export function etatVide(): EtatTentatives {
  return { echecs: [], blocageJusqua: null };
}

/** Ne garde que les échecs encore dans la fenêtre glissante. */
function echecsRecents(echecs: number[], maintenant: number, fenetreMs: number): number[] {
  return echecs.filter((moment) => maintenant - moment < fenetreMs);
}

export interface Verdict {
  bloque: boolean;
  /** Secondes restantes avant de pouvoir réessayer. */
  secondesRestantes: number;
}

export function verifier(etat: EtatTentatives, maintenant: number): Verdict {
  if (etat.blocageJusqua && etat.blocageJusqua > maintenant) {
    return {
      bloque: true,
      secondesRestantes: Math.ceil((etat.blocageJusqua - maintenant) / 1000),
    };
  }
  return { bloque: false, secondesRestantes: 0 };
}

/** Enregistre un échec et bloque si le compte est atteint. */
export function enregistrerEchec(
  etat: EtatTentatives,
  maintenant: number,
  regles: ReglesBlocage = {},
): EtatTentatives {
  const maxEchecs = regles.maxEchecs ?? MAX_ECHECS;
  const dureeMs = regles.dureeMs ?? DUREE_BLOCAGE_MS;

  // Un blocage écoulé repart de zéro : on ne punit pas deux fois les mêmes
  // échecs.
  const base = etat.blocageJusqua && etat.blocageJusqua <= maintenant ? etatVide() : etat;
  const echecs = [...echecsRecents(base.echecs, maintenant, dureeMs), maintenant];

  return {
    echecs,
    blocageJusqua: echecs.length >= maxEchecs ? maintenant + dureeMs : null,
  };
}

/** Une connexion réussie efface l'ardoise. */
export function reinitialiser(): EtatTentatives {
  return etatVide();
}

/** Combien d'essais il reste avant le blocage. */
export function essaisRestants(
  etat: EtatTentatives,
  maintenant: number,
  regles: ReglesBlocage = {},
): number {
  if (etat.blocageJusqua && etat.blocageJusqua > maintenant) {
    return 0;
  }
  const maxEchecs = regles.maxEchecs ?? MAX_ECHECS;
  const dureeMs = regles.dureeMs ?? DUREE_BLOCAGE_MS;
  return Math.max(0, maxEchecs - echecsRecents(etat.echecs, maintenant, dureeMs).length);
}
