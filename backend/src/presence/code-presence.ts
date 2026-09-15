// ---------------------------------------------------------------------------
// Le code de présence.
//
// Le joueur montre un code au commerçant, qui le scanne (ou le tape). Ce
// geste remplace l'ancien pointage GPS : un GPS se laisse tromper depuis le
// trottoir d'en face, pas un code présenté à quelqu'un derrière un comptoir.
//
// Trois propriétés, et c'est tout ce qui fait la sécurité du dispositif :
//
//   1. le code est ÉPHÉMÈRE — une capture d'écran envoyée à un ami ne vaut
//      plus rien deux minutes plus tard ;
//   2. il est À USAGE UNIQUE — il ne peut pas servir deux fois, ni dans deux
//      commerces ;
//   3. il est LISIBLE À VOIX HAUTE — pas de I, L, O, 0 ni 1, qu'on confond en
//      les lisant. Le scan de l'appareil photo est le chemin normal, mais
//      quand la caméra refuse, il faut pouvoir taper les huit caractères
//      sans se tromper.
//
// Tout ici est pur : aucune base, aucune horloge implicite. Le service passe
// l'heure et l'état, ces fonctions décident.
// ---------------------------------------------------------------------------

/**
 * Les caractères d'un code.
 *
 * Retirés volontairement : I et L (confondus avec 1), O (confondu avec 0),
 * et donc aussi 0 et 1 eux-mêmes. Il reste 31 caractères, ce qui donne
 * 31^8 ≈ 850 milliards de codes — largement assez pour que deviner un code
 * valide pendant sa fenêtre de deux minutes soit hors de portée.
 */
export const ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';

export const LONGUEUR_CODE = 8;

/** Les caractères qu'on ne génère jamais, et qu'on sait donc mal lus. */
export const CARACTERES_AMBIGUS = 'ILO01';

/** Combien de temps un code reste valable. Valeur de repli (réglable). */
export const DUREE_CODE_SECONDES = 120;

/**
 * Fabrique un code.
 *
 * `hasard` est injectable pour que les tests puissent produire un code
 * prévisible. En vrai c'est `crypto.randomInt` qui est passé : `Math.random`
 * n'est pas fait pour ça, et un générateur devinable rendrait le code
 * devinable avec lui.
 */
export function fabriquerCode(
  hasard: (borne: number) => number,
  longueur = LONGUEUR_CODE,
): string {
  let code = '';
  for (let i = 0; i < longueur; i += 1) {
    code += ALPHABET[hasard(ALPHABET.length)];
  }
  return code;
}

/** Le code tel qu'on l'affiche : « K7M2 P9QR », plus facile à lire et à dicter. */
export function codeLisible(code: string): string {
  const milieu = Math.ceil(code.length / 2);
  return `${code.slice(0, milieu)} ${code.slice(milieu)}`;
}

export type LectureCode =
  | { ok: true; code: string }
  | { ok: false; raison: string };

/**
 * Ce que le commerçant a tapé, ramené à un code.
 *
 * Espaces et tirets sautent : les gens recopient ce qu'ils voient, et ce
 * qu'ils voient contient une espace. La casse aussi : personne ne tape en
 * majuscules spontanément.
 */
export function lireCodeSaisi(saisi: unknown, longueur = LONGUEUR_CODE): LectureCode {
  if (typeof saisi !== 'string') {
    return { ok: false, raison: 'Aucun code saisi.' };
  }

  const propre = saisi.replace(/[\s-]/g, '').toUpperCase();

  if (propre === '') {
    return { ok: false, raison: 'Aucun code saisi.' };
  }

  // Le message nomme les caractères fautifs plutôt que de dire « code
  // invalide » : dans neuf cas sur dix c'est un 0 tapé pour un O, et le
  // commerçant doit pouvoir corriger sans redemander le téléphone.
  const ambigu = [...propre].find((c) => CARACTERES_AMBIGUS.includes(c));
  if (ambigu) {
    return {
      ok: false,
      raison: `Nos codes ne contiennent jamais la lettre ou le chiffre « ${ambigu} » (ni I, L, O, 0 ou 1) : vérifie la saisie.`,
    };
  }

  if ([...propre].some((c) => !ALPHABET.includes(c))) {
    return { ok: false, raison: 'Ce code contient un caractère qui n’en fait pas partie.' };
  }

  if (propre.length !== longueur) {
    return {
      ok: false,
      raison: `Un code fait ${longueur} caractères, celui-ci en fait ${propre.length}.`,
    };
  }

  return { ok: true, code: propre };
}

// ---------------------------------------------------------------------------
// Le verdict du scan.
// ---------------------------------------------------------------------------

export interface ContexteScan {
  /** Le code existe-t-il ? */
  trouve: boolean;
  /** Sa date d'expiration, si on l'a trouvé. */
  expireLe: Date | null;
  /** A-t-il déjà servi ? */
  dejaUtilise: boolean;
  /** Le joueur qui le présente est-il le propriétaire du commerce ? */
  estSonPropreCommerce: boolean;
  maintenant: Date;
}

export type CodeRefus =
  | 'inconnu'
  | 'expire'
  | 'deja_utilise'
  | 'son_propre_commerce';

export type VerdictScan =
  | { accepte: true }
  | { accepte: false; code: CodeRefus; raison: string };

export function verdictDuScan(contexte: ContexteScan): VerdictScan {
  if (!contexte.trouve) {
    return {
      accepte: false,
      code: 'inconnu',
      raison: "Ce code n'existe pas. Demande au client d'en afficher un nouveau.",
    };
  }

  if (contexte.dejaUtilise) {
    return {
      accepte: false,
      code: 'deja_utilise',
      raison: 'Ce code a déjà servi. Chaque code ne vaut qu’une fois.',
    };
  }

  if (!contexte.expireLe || contexte.expireLe.getTime() <= contexte.maintenant.getTime()) {
    return {
      accepte: false,
      code: 'expire',
      raison: 'Ce code a expiré. Demande au client de rafraîchir son écran.',
    };
  }

  // Sans ça, un commerçant scannerait son propre compte joueur tous les
  // matins pour se fabriquer des visites — et donc des offres payées.
  if (contexte.estSonPropreCommerce) {
    return {
      accepte: false,
      code: 'son_propre_commerce',
      raison: 'Tu ne peux pas enregistrer ta propre venue dans ton commerce.',
    };
  }

  return { accepte: true };
}

/** Dans combien de secondes ce code expire. Zéro s'il est déjà mort. */
export function secondesRestantes(expireLe: Date, maintenant: Date): number {
  return Math.max(0, Math.floor((expireLe.getTime() - maintenant.getTime()) / 1000));
}
