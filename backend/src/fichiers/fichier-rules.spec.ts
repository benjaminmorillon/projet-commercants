import {
  LONGUEUR_NOM_MAXIMALE,
  enTeteCorrespond,
  lireFichier,
  nettoyerNom,
  poidsLisible,
  typeDe,
} from './fichier-rules';

// --- Des fichiers minuscules mais authentiques ------------------------------
// Chacun commence par les octets que son format impose : c'est justement ce
// que la lecture vérifie.

const JPEG = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10]);
const PNG = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00]);
const WEBP = Buffer.concat([
  Buffer.from('RIFF', 'ascii'),
  Buffer.from([0, 0, 0, 0]),
  Buffer.from('WEBP', 'ascii'),
  Buffer.from([0, 0]),
]);
const PDF = Buffer.from('%PDF-1.7\nquelque chose', 'ascii');

function dataUrl(format: string, contenu: Buffer): string {
  return `data:${format};base64,${contenu.toString('base64')}`;
}

describe('les types acceptés', () => {
  it('connaît les trois images et le PDF', () => {
    expect(typeDe('image/jpeg')?.extension).toBe('jpg');
    expect(typeDe('image/png')?.extension).toBe('png');
    expect(typeDe('image/webp')?.extension).toBe('webp');
    expect(typeDe('application/pdf')?.extension).toBe('pdf');
  });

  it('ne connaît pas le SVG', () => {
    // Un SVG est un document qui peut contenir du script : le servir depuis
    // notre domaine reviendrait à laisser déposer du code sur le site.
    expect(typeDe('image/svg+xml')).toBeUndefined();
  });

  it('accepte un format écrit en majuscules', () => {
    expect(typeDe('IMAGE/PNG')?.extension).toBe('png');
  });

  it('laisse un PDF plus lourd qu’une image', () => {
    const pdf = typeDe('application/pdf');
    const png = typeDe('image/png');
    expect(pdf!.maximum).toBeGreaterThan(png!.maximum);
  });

  it('ne montre jamais un PDF dans la page', () => {
    expect(typeDe('application/pdf')?.affichable).toBe(false);
    expect(typeDe('image/png')?.affichable).toBe(true);
  });
});

describe('le nom du fichier', () => {
  it('garde un nom normal et lui remet la bonne extension', () => {
    expect(nettoyerNom('Carte des vins.pdf', 'pdf')).toBe('Carte des vins.pdf');
  });

  it('corrige une extension qui ment sur le format', () => {
    // Un PDF nommé « carte.png » s'ouvrirait de travers.
    expect(nettoyerNom('carte.png', 'pdf')).toBe('carte.pdf');
  });

  it('retire les caractères de contrôle, qui permettraient d’inventer des en-têtes', () => {
    // Le nom repart dans un en-tête HTTP au téléchargement : un retour à la
    // ligne glissé dedans laisserait ajouter des en-têtes de son choix.
    const hostile = `carte${String.fromCharCode(13)}${String.fromCharCode(10)}Set-Cookie: a=b`;
    const propre = nettoyerNom(hostile, 'pdf');
    expect(propre).not.toContain(String.fromCharCode(13));
    expect(propre).not.toContain(String.fromCharCode(10));
    expect(propre.endsWith('.pdf')).toBe(true);
  });

  it('retire les séparateurs de chemin', () => {
    expect(nettoyerNom('../../etc/passwd', 'pdf')).not.toContain('/');
    expect(nettoyerNom('dossier\\fichier.pdf', 'pdf')).not.toContain('\\');
  });

  it('retire les guillemets, qui fermeraient l’en-tête', () => {
    expect(nettoyerNom('carte".pdf', 'pdf')).not.toContain('"');
  });

  it('donne un nom de repli quand il ne reste rien', () => {
    expect(nettoyerNom('', 'pdf')).toBe('document.pdf');
    expect(nettoyerNom('   ', 'pdf')).toBe('document.pdf');
    expect(nettoyerNom('..', 'pdf')).toBe('document.pdf');
    expect(nettoyerNom(null, 'jpg')).toBe('document.jpg');
    expect(nettoyerNom(42, 'png')).toBe('document.png');
  });

  it('raccourcit un nom interminable', () => {
    const long = nettoyerNom('a'.repeat(500), 'pdf');
    expect(long.length).toBeLessThanOrEqual(LONGUEUR_NOM_MAXIMALE + 4);
  });
});

describe('le poids écrit', () => {
  it('reste en octets, puis en kilo-octets, puis en méga-octets', () => {
    expect(poidsLisible(512)).toBe('512 o');
    expect(poidsLisible(1024 * 340)).toBe('340 Ko');
    expect(poidsLisible(1024 * 1024 * 2.1)).toBe('2,1 Mo');
  });
});

describe('l’en-tête d’un fichier', () => {
  it('reconnaît chaque format à ses premiers octets', () => {
    expect(enTeteCorrespond(JPEG, 'image/jpeg')).toBe(true);
    expect(enTeteCorrespond(PNG, 'image/png')).toBe(true);
    expect(enTeteCorrespond(WEBP, 'image/webp')).toBe(true);
    expect(enTeteCorrespond(PDF, 'application/pdf')).toBe(true);
  });

  it('démasque un fichier qui ment', () => {
    expect(enTeteCorrespond(PDF, 'image/png')).toBe(false);
    expect(enTeteCorrespond(PNG, 'application/pdf')).toBe(false);
  });

  it('ne se laisse pas avoir par un fichier trop court', () => {
    expect(enTeteCorrespond(Buffer.from([0xff]), 'image/jpeg')).toBe(false);
    expect(enTeteCorrespond(Buffer.from('%PD', 'ascii'), 'application/pdf')).toBe(false);
  });
});

describe('la lecture d’une pièce jointe', () => {
  it('accepte un PDF et lui donne son nom', () => {
    const lecture = lireFichier(dataUrl('application/pdf', PDF), 'Carte du soir.pdf');
    expect(lecture.ok).toBe(true);
    if (!lecture.ok) return;
    expect(lecture.fichier.format).toBe('application/pdf');
    expect(lecture.fichier.nom).toBe('Carte du soir.pdf');
    expect(lecture.fichier.donnees.length).toBe(PDF.length);
  });

  it('accepte les trois images', () => {
    expect(lireFichier(dataUrl('image/jpeg', JPEG)).ok).toBe(true);
    expect(lireFichier(dataUrl('image/png', PNG)).ok).toBe(true);
    expect(lireFichier(dataUrl('image/webp', WEBP)).ok).toBe(true);
  });

  it('refuse ce qui n’est pas une data URL', () => {
    expect(lireFichier('bonjour')).toMatchObject({ ok: false });
    expect(lireFichier('')).toMatchObject({ ok: false, erreur: 'Aucun fichier reçu.' });
    expect(lireFichier(null)).toMatchObject({ ok: false });
    expect(lireFichier(12)).toMatchObject({ ok: false });
  });

  it('refuse un SVG, même bien formé', () => {
    const svg = Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"></svg>', 'utf8');
    const lecture = lireFichier(dataUrl('image/svg+xml', svg));
    expect(lecture.ok).toBe(false);
  });

  it('refuse un fichier qui ment sur son format', () => {
    // Un PDF déguisé en PNG : il serait servi comme une image par notre
    // propre domaine.
    const lecture = lireFichier(dataUrl('image/png', PDF));
    expect(lecture).toMatchObject({ ok: false });
    if (lecture.ok) return;
    expect(lecture.erreur).toContain('PNG');
  });

  it('refuse un base64 abîmé plutôt que de stocker un fichier tronqué', () => {
    const lecture = lireFichier('data:application/pdf;base64,%%%%');
    expect(lecture).toMatchObject({ ok: false });
  });

  it('refuse un contenu vide', () => {
    expect(lireFichier('data:application/pdf;base64,')).toMatchObject({
      ok: false,
      erreur: 'Aucun fichier reçu.',
    });
  });

  it('refuse un fichier trop lourd, et dit combien', () => {
    // Un faux PDF de 6 Mo : au-dessus du plafond de 5 Mo.
    const gros = Buffer.concat([Buffer.from('%PDF-', 'ascii'), Buffer.alloc(6 * 1024 * 1024)]);
    const lecture = lireFichier(dataUrl('application/pdf', gros));
    expect(lecture).toMatchObject({ ok: false });
    if (lecture.ok) return;
    expect(lecture.erreur).toContain('Mo');
  });

  it('applique le plafond des images, plus bas que celui du PDF', () => {
    const grosseImage = Buffer.concat([
      Buffer.from([0xff, 0xd8, 0xff, 0xe0]),
      Buffer.alloc(3 * 1024 * 1024),
    ]);
    expect(lireFichier(dataUrl('image/jpeg', grosseImage))).toMatchObject({ ok: false });
  });

  it('nettoie le nom au passage', () => {
    const lecture = lireFichier(dataUrl('application/pdf', PDF), '../../secret.png');
    expect(lecture.ok).toBe(true);
    if (!lecture.ok) return;
    expect(lecture.fichier.nom).not.toContain('/');
    expect(lecture.fichier.nom.endsWith('.pdf')).toBe(true);
  });
});
