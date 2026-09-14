// ---------------------------------------------------------------------------
// Lire une image envoyée par un navigateur.
//
// Le navigateur envoie l'image sous forme de « data URL » : un texte qui
// commence par `data:image/jpeg;base64,` suivi de l'image encodée. C'est
// pratique (une seule requête JSON, pas de formulaire multipart) mais ça veut
// dire qu'on reçoit du TEXTE fourni par l'extérieur, et qu'il faut le
// vérifier avant d'en faire quoi que ce soit.
//
// Fonction pure : du texte entre, une image ou un refus expliqué sort. Aucune
// base de données, donc facile à tester.
// ---------------------------------------------------------------------------

// Les formats qu'un navigateur produit et qu'un navigateur sait réafficher.
// Surtout : pas de SVG. Un SVG est un document qui peut contenir du script ;
// le servir depuis notre propre domaine reviendrait à laisser n'importe qui
// déposer du code sur le site.
export const FORMATS_ACCEPTES = ['image/jpeg', 'image/png', 'image/webp'] as const;
export type FormatImage = (typeof FORMATS_ACCEPTES)[number];

// La page réduit l'image avant de l'envoyer ; cette limite n'est donc pas ce
// qui gêne un utilisateur normal, c'est ce qui empêche quelqu'un de remplir
// la base en contournant la page.
export const POIDS_MAXIMUM_OCTETS = 400 * 1024;

export type LectureImage =
  | { ok: true; format: FormatImage; donnees: Buffer }
  | { ok: false; erreur: string };

const PREFIXE = /^data:([a-z]+\/[a-z0-9.+-]+);base64,(.*)$/is;

export function lireImage(brut: unknown): LectureImage {
  if (typeof brut !== 'string' || brut.trim() === '') {
    return { ok: false, erreur: 'Aucune image reçue.' };
  }

  const morceaux = PREFIXE.exec(brut.trim());
  if (!morceaux) {
    return { ok: false, erreur: "Ce fichier n'est pas une image que le site sait lire." };
  }

  const format = morceaux[1].toLowerCase();
  if (!(FORMATS_ACCEPTES as readonly string[]).includes(format)) {
    return {
      ok: false,
      erreur: 'Formats acceptés : JPEG, PNG ou WebP.',
    };
  }

  const encodee = morceaux[2];
  if (encodee.length === 0) {
    return { ok: false, erreur: 'Aucune image reçue.' };
  }

  // On décode en refusant tout ce qui n'est pas du base64 valide. Sans le
  // contrôle, Node accepte silencieusement les caractères illégaux en les
  // ignorant, et on stockerait une image tronquée qui ne s'afficherait jamais.
  if (!/^[A-Za-z0-9+/]+={0,2}$/.test(encodee)) {
    return { ok: false, erreur: "L'image est abîmée : réessayez avec un autre fichier." };
  }

  const donnees = Buffer.from(encodee, 'base64');
  if (donnees.length === 0) {
    return { ok: false, erreur: 'Aucune image reçue.' };
  }

  if (donnees.length > POIDS_MAXIMUM_OCTETS) {
    const ko = Math.round(donnees.length / 1024);
    const max = Math.round(POIDS_MAXIMUM_OCTETS / 1024);
    return { ok: false, erreur: `Image trop lourde (${ko} Ko, maximum ${max} Ko).` };
  }

  // Dernière vérification : l'en-tête du fichier doit correspondre au format
  // annoncé. Sans elle, il suffirait d'écrire « data:image/png » devant
  // n'importe quoi pour le faire servir comme une image par notre domaine.
  if (!enTeteCorrespond(donnees, format as FormatImage)) {
    return {
      ok: false,
      erreur: "Ce fichier ne ressemble pas à l'image qu'il prétend être.",
    };
  }

  return { ok: true, format: format as FormatImage, donnees };
}

/** Les premiers octets d'un fichier disent ce qu'il est vraiment. */
function enTeteCorrespond(donnees: Buffer, format: FormatImage): boolean {
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

  // WebP : « RIFF » puis, quatre octets plus loin, « WEBP ».
  return (
    donnees.length > 12 &&
    donnees.subarray(0, 4).toString('ascii') === 'RIFF' &&
    donnees.subarray(8, 12).toString('ascii') === 'WEBP'
  );
}
