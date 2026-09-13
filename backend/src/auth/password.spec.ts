import {
  genererJetonSession,
  hacherMotDePasse,
  verifierMotDePasse,
} from './password';

describe('mots de passe', () => {
  it('accepte le bon mot de passe', () => {
    const empreinte = hacherMotDePasse('correct horse battery');
    expect(verifierMotDePasse('correct horse battery', empreinte)).toBe(true);
  });

  it('refuse un mot de passe faux, même proche', () => {
    const empreinte = hacherMotDePasse('correct horse battery');
    expect(verifierMotDePasse('correct horse batterz', empreinte)).toBe(false);
    expect(verifierMotDePasse('', empreinte)).toBe(false);
  });

  it('ne stocke jamais le mot de passe en clair', () => {
    const empreinte = hacherMotDePasse('mon-secret-2026');
    expect(empreinte).not.toContain('mon-secret-2026');
  });

  it('donne deux empreintes différentes pour le même mot de passe', () => {
    // Le sel est tiré au hasard : deux comptes avec le même mot de passe ne
    // se repèrent pas en comparant les empreintes.
    const a = hacherMotDePasse('même-mot-de-passe');
    const b = hacherMotDePasse('même-mot-de-passe');
    expect(a).not.toBe(b);
    expect(verifierMotDePasse('même-mot-de-passe', a)).toBe(true);
    expect(verifierMotDePasse('même-mot-de-passe', b)).toBe(true);
  });

  it('compare les accents de la même façon quel que soit le clavier', () => {
    // "é" peut s'écrire en un caractère ou en deux (e + accent) selon le
    // système : on normalise pour que la connexion marche dans les deux cas.
    const empreinte = hacherMotDePasse('café-du-coin');
    expect(verifierMotDePasse('café-du-coin', empreinte)).toBe(true);
  });

  it('ne casse pas sur une empreinte abîmée ou d’un autre format', () => {
    expect(verifierMotDePasse('x', '')).toBe(false);
    expect(verifierMotDePasse('x', 'pas-du-tout-une-empreinte')).toBe(false);
    expect(verifierMotDePasse('x', 'scrypt$zz$zz')).toBe(false);
    expect(verifierMotDePasse('x', 'bcrypt$aa$bb')).toBe(false);
  });
});

describe('jetons de session', () => {
  it('fait 64 caractères hexadécimaux (256 bits)', () => {
    expect(genererJetonSession()).toMatch(/^[0-9a-f]{64}$/);
  });

  it('ne tombe jamais deux fois sur le même', () => {
    const jetons = new Set(Array.from({ length: 200 }, () => genererJetonSession()));
    expect(jetons.size).toBe(200);
  });
});
