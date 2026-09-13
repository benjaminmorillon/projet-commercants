import { randomBytes, scryptSync, timingSafeEqual } from 'crypto';

// Hachage des mots de passe avec scrypt, fourni par Node lui-même : pas de
// dépendance supplémentaire, et c'est une fonction volontairement lente,
// conçue pour rendre les attaques par force brute coûteuses.

// Coût : ~100 ms par vérification sur une machine de bureau. Assez lent pour
// décourager une attaque, assez rapide pour une connexion.
const COUT = 16384; // N
const TAILLE_BLOC = 8; // r
const PARALLELISATION = 1; // p
const LONGUEUR_CLE = 64;
const LONGUEUR_SEL = 16;

export const LONGUEUR_MINIMALE_MOT_DE_PASSE = 8;

/**
 * Renvoie une empreinte à stocker en base, de la forme
 * `scrypt$<sel en hexa>$<empreinte en hexa>`. Le sel est tiré au hasard pour
 * chaque mot de passe : deux personnes ayant le même mot de passe n'ont pas
 * la même empreinte.
 */
export function hacherMotDePasse(motDePasse: string): string {
  const sel = randomBytes(LONGUEUR_SEL);
  const empreinte = scryptSync(motDePasse.normalize('NFKC'), sel, LONGUEUR_CLE, {
    N: COUT,
    r: TAILLE_BLOC,
    p: PARALLELISATION,
  });
  return `scrypt$${sel.toString('hex')}$${empreinte.toString('hex')}`;
}

/**
 * Vérifie un mot de passe contre l'empreinte stockée. La comparaison est
 * faite en temps constant : le temps de réponse ne révèle pas combien de
 * caractères de l'empreinte étaient corrects.
 */
export function verifierMotDePasse(motDePasse: string, stocke: string): boolean {
  const parties = stocke.split('$');
  if (parties.length !== 3 || parties[0] !== 'scrypt') {
    return false;
  }

  let sel: Buffer;
  let attendu: Buffer;
  try {
    sel = Buffer.from(parties[1], 'hex');
    attendu = Buffer.from(parties[2], 'hex');
  } catch {
    return false;
  }
  if (sel.length === 0 || attendu.length !== LONGUEUR_CLE) {
    return false;
  }

  const candidat = scryptSync(motDePasse.normalize('NFKC'), sel, LONGUEUR_CLE, {
    N: COUT,
    r: TAILLE_BLOC,
    p: PARALLELISATION,
  });
  return timingSafeEqual(candidat, attendu);
}

/** Jeton de session : 256 bits tirés au hasard, impossibles à deviner. */
export function genererJetonSession(): string {
  return randomBytes(32).toString('hex');
}
