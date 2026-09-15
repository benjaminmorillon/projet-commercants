import {
  ALPHABET,
  CARACTERES_AMBIGUS,
  LONGUEUR_CODE,
  codeLisible,
  fabriquerCode,
  lireCodeSaisi,
  secondesRestantes,
  verdictDuScan,
} from './code-presence';

// Un « hasard » prévisible : il rend toujours la même position.
const toujours = (position: number) => () => position;

describe('la fabrication d’un code', () => {
  it('fait la bonne longueur', () => {
    let i = 0;
    const code = fabriquerCode(() => i++ % ALPHABET.length);
    expect(code).toHaveLength(LONGUEUR_CODE);
  });

  it('n’emploie que des caractères de l’alphabet', () => {
    let graine = 7;
    const code = fabriquerCode((borne) => {
      graine = (graine * 31 + 17) % 1000;
      return graine % borne;
    }, 40);
    expect([...code].every((c) => ALPHABET.includes(c))).toBe(true);
  });

  it('n’emploie jamais un caractère qu’on confond en le lisant', () => {
    for (const ambigu of CARACTERES_AMBIGUS) {
      expect(ALPHABET).not.toContain(ambigu);
    }
  });

  it('se lit en deux morceaux', () => {
    expect(codeLisible('ABCDEFGH')).toBe('ABCD EFGH');
  });

  it('utilise bien le hasard qu’on lui donne', () => {
    expect(fabriquerCode(toujours(0), 4)).toBe(ALPHABET[0].repeat(4));
  });
});

describe('la lecture d’un code tapé à la main', () => {
  it('accepte le code tel qu’il est affiché, espace comprise', () => {
    expect(lireCodeSaisi('ABCD EFGH')).toEqual({ ok: true, code: 'ABCDEFGH' });
  });

  it('accepte les minuscules et les tirets', () => {
    expect(lireCodeSaisi('abcd-efgh')).toEqual({ ok: true, code: 'ABCDEFGH' });
  });

  it('refuse un code vide', () => {
    expect(lireCodeSaisi('   ')).toEqual({ ok: false, raison: 'Aucun code saisi.' });
    expect(lireCodeSaisi(null).ok).toBe(false);
    expect(lireCodeSaisi(42).ok).toBe(false);
  });

  it('nomme le caractère fautif quand on confond un O et un zéro', () => {
    const lecture = lireCodeSaisi('ABCD EFG0');
    expect(lecture.ok).toBe(false);
    expect((lecture as { raison: string }).raison).toContain('0');
  });

  it('dit la longueur attendue quand il en manque', () => {
    const lecture = lireCodeSaisi('ABCD');
    expect(lecture.ok).toBe(false);
    expect((lecture as { raison: string }).raison).toContain('8');
  });
});

describe('le verdict du scan', () => {
  const maintenant = new Date('2026-09-15T12:00:00Z');
  const dans2min = new Date('2026-09-15T12:02:00Z');
  const ilY2min = new Date('2026-09-15T11:58:00Z');

  const base = {
    trouve: true,
    expireLe: dans2min,
    dejaUtilise: false,
    estSonPropreCommerce: false,
    maintenant,
  };

  it('accepte un code frais, jamais utilisé', () => {
    expect(verdictDuScan(base)).toEqual({ accepte: true });
  });

  it('refuse un code inconnu', () => {
    const v = verdictDuScan({ ...base, trouve: false });
    expect(v).toMatchObject({ accepte: false, code: 'inconnu' });
  });

  it('refuse un code expiré', () => {
    const v = verdictDuScan({ ...base, expireLe: ilY2min });
    expect(v).toMatchObject({ accepte: false, code: 'expire' });
  });

  it('refuse un code qui a déjà servi', () => {
    const v = verdictDuScan({ ...base, dejaUtilise: true });
    expect(v).toMatchObject({ accepte: false, code: 'deja_utilise' });
  });

  it('dit « déjà utilisé » plutôt que « expiré » pour un code des deux', () => {
    // Un code consommé puis périmé : la vraie raison est qu'il a servi, et
    // c'est celle qui aide le commerçant à comprendre ce qui se passe.
    const v = verdictDuScan({ ...base, dejaUtilise: true, expireLe: ilY2min });
    expect(v).toMatchObject({ code: 'deja_utilise' });
  });

  it('refuse à un commerçant d’enregistrer sa propre venue chez lui', () => {
    const v = verdictDuScan({ ...base, estSonPropreCommerce: true });
    expect(v).toMatchObject({ accepte: false, code: 'son_propre_commerce' });
  });

  it('refuse un code qui expire exactement maintenant', () => {
    const v = verdictDuScan({ ...base, expireLe: maintenant });
    expect(v).toMatchObject({ accepte: false, code: 'expire' });
  });
});

describe('le compte à rebours', () => {
  const maintenant = new Date('2026-09-15T12:00:00Z');

  it('dit les secondes qu’il reste', () => {
    expect(secondesRestantes(new Date('2026-09-15T12:01:30Z'), maintenant)).toBe(90);
  });

  it('ne descend jamais sous zéro', () => {
    expect(secondesRestantes(new Date('2026-09-15T11:00:00Z'), maintenant)).toBe(0);
  });
});
