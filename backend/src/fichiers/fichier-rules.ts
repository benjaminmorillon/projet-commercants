// ---------------------------------------------------------------------------
// Lire une pièce jointe envoyée par un navigateur ou par l'application.
//
// Une pièce jointe, c'est la carte d'un restaurant, une affiche, une liste de
// tarifs : une photo ou un PDF que le commerçant dépose et que les joueurs
// peuvent consulter.
//
// Comme pour les photos de profil, le fichier arrive sous forme de « data
// URL » : un texte qui commence par `data:application/pdf;base64,` suivi du
// contenu encodé. C'est donc du TEXTE venu de l'extérieur, et tout ce qui
// suit existe pour ne jamais lui faire confiance.
//
// Trois dangers, trois réponses :
//
//  1. un fichier qui MENT sur ce qu'il est — on vérifie ses premiers octets,
//     pas ce qu'il prétend être ;
//  2. un fichier qui remplit la base — un plafond par type, parce qu'une
//     photo de 5 Mo est une photo mal exportée, alors qu'un PDF de 5 Mo est
//     une carte de restaurant tout à fait normale ;
//  3. un NOM DE FICHIER hostile — c'est le plus vicieux : le nom repart dans
//     un en-tête HTTP au moment du téléchargement, et un retour à la ligne
//     glissé dedans permettrait d'inventer des en-têtes. Le nom est donc
//     nettoyé, pas seulement raccourci.
//
// Fonctions pures : du texte entre, un fichier ou un refus expliqué sort.
// ---------------------------------------------------------------------------

/**
 * Ce qu'on accepte.
 *
 * Toujours pas de SVG : c'est un document qui peut contenir du script, et le
 * servir depuis notre domaine reviendrait à laisser déposer du code sur le
 * site. Le PDF, lui, est servi en TÉLÉCHARGEMENT et jamais affiché dans la
 * page — c'est ce qui le rend acceptable.
 */
export interface TypeAccepte {
  format: string;
  extension: string;
  libelle: string;
  /** Poids maximum, en octets. */
  maximum: number;
  /** Le fichier s'affiche dans la page, ou se télécharge ? */
  affichable: boolean;
}

const MO = 1024 * 1024;

export const TYPES_ACCEPTES: TypeAccepte[] = [
  { format: 'image/jpeg', extension: 'jpg', libelle: 'JPEG', maximum: 2 * MO, affichable: true },
  { format: 'image/png', extension: 'png', libelle: 'PNG', maximum: 2 * MO, affichable: true },
  { format: 'image/webp', extension: 'webp', libelle: 'WebP', maximum: 2 * MO, affichable: true },
  { format: 'application/pdf', extension: 'pdf', libelle: 'PDF', maximum: 5 * MO, affichable: false },
];

/** Combien de pièces jointes un commerce peut garder. Valeur de repli. */
export const PIECES_MAXIMUM = 10;

export const LONGUEUR_NOM_MAXIMALE = 80;

export function typeDe(format: string): TypeAccepte | undefined {
  return TYPES_ACCEPTES.find((t) => t.format === format.toLowerCase());
}

export function formatsLisibles(): string {
  return TYPES_ACCEPTES.map((t) => t.libelle).join(', ');
}

// ---------------------------------------------------------------------------
// Le nom du fichier.
// ---------------------------------------------------------------------------

/**
 * Les caractères de contrôle, séparateurs de chemin et guillemets.
 *
 * Construit à partir de leurs codes plutôt qu'écrit en clair : un caractère
 * de contrôle tapé littéralement dans le fichier source est invisible à la
 * relecture, et c'est exactement le genre de chose qui se perd à la première
 * copie.
 */
const CARACTERES_INTERDITS = new RegExp(
  `[${String.fromCharCode(0)}-${String.fromCharCode(31)}${String.fromCharCode(127)}\\\\/"']`,
  'g',
);

/**
 * Nettoie le nom proposé par la personne qui envoie le fichier.
 *
 * Ce nom repart dans un en-tête `Content-Disposition` au téléchargement. Un
 * retour à la ligne glissé dedans permettrait d'ajouter des en-têtes de son
 * choix à la réponse — on les retire donc, avec tous les caractères de
 * contrôle. Les séparateurs de chemin disparaissent aussi : un nom n'est pas
 * un chemin, et « ../../etc » n'a rien à faire là.
 */
export function nettoyerNom(propose: unknown, extensionParDefaut: string): string {
  const brut = typeof propose === 'string' ? propose : '';

  const propre = brut
    .replace(CARACTERES_INTERDITS, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, LONGUEUR_NOM_MAXIMALE)
    .trim();

  if (propre === '' || propre === '.' || propre === '..') {
    return `document.${extensionParDefaut}`;
  }

  // Le nom doit finir par l'extension du VRAI format, pas par celle que
  // quelqu'un a tapée : un PDF nommé « carte.png » s'ouvrirait de travers.
  const sansExtension = propre.replace(/\.[A-Za-z0-9]{1,8}$/, '').trim();
  const base = sansExtension.replace(/^\.+/, '').trim();
  return `${base === '' ? 'document' : base}.${extensionParDefaut}`;
}

/** Un poids tel qu'on le dit : « 340 Ko », « 2,1 Mo ». */
export function poidsLisible(octets: number): string {
  if (octets < 1024) {
    return `${octets} o`;
  }
  if (octets < MO) {
    return `${Math.round(octets / 1024)} Ko`;
  }
  const dixiemes = Math.round(octets / (MO / 10));
  return `${Math.floor(dixiemes / 10)},${dixiemes % 10} Mo`;
}

// ---------------------------------------------------------------------------
// La lecture.
// ---------------------------------------------------------------------------

export interface FichierLu {
  format: string;
  extension: string;
  nom: string;
  donnees: Buffer;
}

export type LectureFichier = { ok: true; fichier: FichierLu } | { ok: false; erreur: string };

const PREFIXE = /^data:([a-z]+\/[a-z0-9.+-]+);base64,(.*)$/is;

export function lireFichier(brut: unknown, nomPropose?: unknown): LectureFichier {
  if (typeof brut !== 'string' || brut.trim() === '') {
    return { ok: false, erreur: 'Aucun fichier reçu.' };
  }

  const morceaux = PREFIXE.exec(brut.trim());
  if (!morceaux) {
    return { ok: false, erreur: `Formats acceptés : ${formatsLisibles()}.` };
  }

  const type = typeDe(morceaux[1]);
  if (!type) {
    return { ok: false, erreur: `Formats acceptés : ${formatsLisibles()}.` };
  }

  const encodee = morceaux[2];
  if (encodee.length === 0) {
    return { ok: false, erreur: 'Aucun fichier reçu.' };
  }

  // On refuse tout ce qui n'est pas du base64 valide : sans ce contrôle, Node
  // ignore silencieusement les caractères illégaux, et on stockerait un
  // fichier tronqué qui ne s'ouvrirait jamais.
  if (!/^[A-Za-z0-9+/]+={0,2}$/.test(encodee)) {
    return { ok: false, erreur: 'Le fichier est abîmé : réessaie avec un autre.' };
  }

  const donnees = Buffer.from(encodee, 'base64');
  if (donnees.length === 0) {
    return { ok: false, erreur: 'Aucun fichier reçu.' };
  }

  if (donnees.length > type.maximum) {
    return {
      ok: false,
      erreur: `Fichier trop lourd (${poidsLisible(donnees.length)}, maximum ${poidsLisible(type.maximum)} pour un ${type.libelle}).`,
    };
  }

  if (!enTeteCorrespond(donnees, type.format)) {
    return { ok: false, erreur: `Ce fichier ne ressemble pas à un ${type.libelle}.` };
  }

  return {
    ok: true,
    fichier: {
      format: type.format,
      extension: type.extension,
      nom: nettoyerNom(nomPropose, type.extension),
      donnees,
    },
  };
}

/** Les premiers octets d'un fichier disent ce qu'il est vraiment. */
export function enTeteCorrespond(donnees: Buffer, format: string): boolean {
  if (format === 'image/jpeg') {
    return donnees.length > 3 && donnees[0] === 0xff && donnees[1] === 0xd8 && donnees[2] === 0xff;
  }

  if (format === 'image/png') {
    return (
      donnees.length > 8 &&
      donnees[0] === 0x89 &&
      donnees[1] === 0x50 &&
      donnees[2] === 0x4e &&
      donnees[3] === 0x47
    );
  }

  if (format === 'image/webp') {
    return (
      donnees.length > 12 &&
      donnees.subarray(0, 4).toString('ascii') === 'RIFF' &&
      donnees.subarray(8, 12).toString('ascii') === 'WEBP'
    );
  }

  // Un PDF commence toujours par « %PDF- ».
  return donnees.length > 5 && donnees.subarray(0, 5).toString('ascii') === '%PDF-';
}
