import { lireImage, POIDS_MAXIMUM_OCTETS } from './photo-rules';

/** Une vraie image, réduite au minimum : l'en-tête suffit à la reconnaître. */
function image(format: 'jpeg' | 'png' | 'webp', octetsSupplementaires = 20): string {
  const entetes: Record<string, number[]> = {
    jpeg: [0xff, 0xd8, 0xff, 0xe0],
    png: [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00],
    webp: [...Buffer.from('RIFF'), 0, 0, 0, 0, ...Buffer.from('WEBP'), 0],
  };
  const corps = Buffer.concat([
    Buffer.from(entetes[format]),
    Buffer.alloc(octetsSupplementaires, 0x42),
  ]);
  return `data:image/${format};base64,${corps.toString('base64')}`;
}

describe('lireImage', () => {
  it('accepte les trois formats que produisent les navigateurs', () => {
    for (const format of ['jpeg', 'png', 'webp'] as const) {
      const lecture = lireImage(image(format));
      expect(lecture.ok).toBe(true);
      if (lecture.ok) {
        expect(lecture.format).toBe(`image/${format}`);
        expect(lecture.donnees.length).toBeGreaterThan(0);
      }
    }
  });

  it('refuse ce qui n’est pas une image', () => {
    expect(lireImage('bonjour')).toEqual({
      ok: false,
      erreur: "Ce fichier n'est pas une image que le site sait lire.",
    });
    expect(lireImage(null).ok).toBe(false);
    expect(lireImage(42).ok).toBe(false);
    expect(lireImage('').ok).toBe(false);
  });

  // Un SVG est un document qui peut contenir du script. Le servir depuis
  // notre domaine reviendrait à laisser déposer du code sur le site.
  it('refuse le SVG, même correctement encodé', () => {
    const svg = Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"></svg>').toString('base64');
    const lecture = lireImage(`data:image/svg+xml;base64,${svg}`);
    expect(lecture).toEqual({ ok: false, erreur: 'Formats acceptés : JPEG, PNG ou WebP.' });
  });

  it('refuse un fichier PDF déguisé en image', () => {
    const pdf = Buffer.from('%PDF-1.7 …').toString('base64');
    expect(lireImage(`data:image/png;base64,${pdf}`)).toEqual({
      ok: false,
      erreur: "Ce fichier ne ressemble pas à l'image qu'il prétend être.",
    });
  });

  // Annoncer un format et en envoyer un autre est exactement ce qu'on
  // essaierait pour faire servir un fichier arbitraire par notre domaine.
  it('refuse un format annoncé qui ne correspond pas au contenu', () => {
    const vraiPng = image('png');
    const menteur = vraiPng.replace('data:image/png', 'data:image/jpeg');
    expect(lireImage(menteur).ok).toBe(false);
  });

  it('refuse une image trop lourde, en disant son poids', () => {
    const enorme = Buffer.concat([
      Buffer.from([0xff, 0xd8, 0xff, 0xe0]),
      Buffer.alloc(POIDS_MAXIMUM_OCTETS, 0x42),
    ]);
    const lecture = lireImage(`data:image/jpeg;base64,${enorme.toString('base64')}`);
    expect(lecture.ok).toBe(false);
    if (!lecture.ok) {
      expect(lecture.erreur).toMatch(/^Image trop lourde \(\d+ Ko, maximum 400 Ko\)\.$/);
    }
  });

  it('accepte une image juste sous la limite', () => {
    const juste = Buffer.concat([
      Buffer.from([0xff, 0xd8, 0xff, 0xe0]),
      Buffer.alloc(POIDS_MAXIMUM_OCTETS - 4, 0x42),
    ]);
    expect(lireImage(`data:image/jpeg;base64,${juste.toString('base64')}`).ok).toBe(true);
  });

  // Sans ce contrôle, Node ignore silencieusement les caractères illégaux et
  // on stockerait une image tronquée qui ne s'afficherait jamais.
  it('refuse un encodage abîmé au lieu de stocker une image tronquée', () => {
    expect(lireImage('data:image/png;base64,pas du base64 !!')).toEqual({
      ok: false,
      erreur: "L'image est abîmée : réessayez avec un autre fichier.",
    });
  });

  it('accepte une majuscule dans l’en-tête', () => {
    expect(lireImage(image('png').replace('data:', 'DATA:')).ok).toBe(true);
  });
});
