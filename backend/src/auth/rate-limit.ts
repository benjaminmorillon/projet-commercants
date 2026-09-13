// Limitation des tentatives de connexion.
//
// Sans elle, rien n'empêche d'essayer des milliers de mots de passe : le
// hachage scrypt rend chaque essai lent, mais un attaquant patient finirait
// par passer. On compte les échecs et on ferme la porte un moment.

export const MAX_ECHECS = 5;
export const FENETRE_MS = 15 * 60 * 1000; // on ne retient que 15 minutes d'échecs
export const DUREE_BLOCAGE_MS = 15 * 60 * 1000;

export interface EtatTentatives {
  /** Horodatage des échecs encore dans la fenêtre. */
  echecs: number[];
  blocageJusqua: number | null;
}

export function etatVide(): EtatTentatives {
  return { echecs: [], blocageJusqua: null };
}

/** Ne garde que les échecs encore dans la fenêtre glissante. */
function echecsRecents(echecs: number[], maintenant: number): number[] {
  return echecs.filter((moment) => maintenant - moment < FENETRE_MS);
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
export function enregistrerEchec(etat: EtatTentatives, maintenant: number): EtatTentatives {
  // Un blocage écoulé repart de zéro : on ne punit pas deux fois les mêmes
  // échecs.
  const base = etat.blocageJusqua && etat.blocageJusqua <= maintenant ? etatVide() : etat;
  const echecs = [...echecsRecents(base.echecs, maintenant), maintenant];

  return {
    echecs,
    blocageJusqua: echecs.length >= MAX_ECHECS ? maintenant + DUREE_BLOCAGE_MS : null,
  };
}

/** Une connexion réussie efface l'ardoise. */
export function reinitialiser(): EtatTentatives {
  return etatVide();
}

/** Combien d'essais il reste avant le blocage. */
export function essaisRestants(etat: EtatTentatives, maintenant: number): number {
  if (etat.blocageJusqua && etat.blocageJusqua > maintenant) {
    return 0;
  }
  return Math.max(0, MAX_ECHECS - echecsRecents(etat.echecs, maintenant).length);
}
