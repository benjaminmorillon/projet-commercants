import {
  CATALOGUE,
  CATALOGUE_PAR_CLE,
  DefinitionReglage,
  GROUPES,
  lireValeur,
} from './catalogue-reglages';

const entier: DefinitionReglage = {
  cle: 'test.entier',
  groupe: 'terrain',
  libelle: 'Un entier',
  explication: '',
  type: 'entier',
  defaut: 10,
  min: 1,
  max: 100,
  unite: 'm',
};

const nombre: DefinitionReglage = {
  cle: 'test.nombre',
  groupe: 'terrain',
  libelle: 'Un nombre',
  explication: '',
  type: 'nombre',
  defaut: 0.5,
  min: 0,
  max: 1,
};

describe('catalogue de réglages', () => {
  it('ne contient pas deux fois la même clé', () => {
    expect(CATALOGUE_PAR_CLE.size).toBe(CATALOGUE.length);
  });

  it('range chaque réglage dans un groupe qui existe', () => {
    const connus = GROUPES.map((g) => g.id);
    for (const definition of CATALOGUE) {
      expect(connus).toContain(definition.groupe);
    }
  });

  it('donne à chaque réglage un libellé et une explication', () => {
    for (const definition of CATALOGUE) {
      expect(definition.libelle.length).toBeGreaterThan(0);
      expect(definition.explication.length).toBeGreaterThan(0);
    }
  });

  // Une valeur par défaut hors de ses propres bornes rendrait le formulaire
  // invalide dès l'ouverture, sans que personne n'ait rien touché.
  it('a des valeurs par défaut qui respectent leurs propres bornes', () => {
    for (const definition of CATALOGUE) {
      expect(lireValeur(definition, definition.defaut)).toEqual({
        ok: true,
        valeur: definition.defaut,
      });
    }
  });
});

describe('lireValeur', () => {
  it('accepte un entier dans les bornes', () => {
    expect(lireValeur(entier, '42')).toEqual({ ok: true, valeur: 42 });
  });

  it('refuse une virgule sur un entier', () => {
    const lecture = lireValeur(entier, '42,5');
    expect(lecture.ok).toBe(false);
  });

  it('accepte la virgule française sur un nombre décimal', () => {
    expect(lireValeur(nombre, '0,75')).toEqual({ ok: true, valeur: 0.75 });
  });

  it('refuse en dessous du minimum, en donnant le minimum', () => {
    expect(lireValeur(entier, '0')).toEqual({ ok: false, erreur: 'Minimum : 1 m.' });
  });

  it('refuse au-dessus du maximum, en donnant le maximum', () => {
    expect(lireValeur(entier, '101')).toEqual({ ok: false, erreur: 'Maximum : 100 m.' });
  });

  it('accepte exactement les bornes', () => {
    expect(lireValeur(entier, '1')).toEqual({ ok: true, valeur: 1 });
    expect(lireValeur(entier, '100')).toEqual({ ok: true, valeur: 100 });
  });

  it('refuse ce qui n’est pas un nombre', () => {
    expect(lireValeur(entier, 'beaucoup')).toEqual({ ok: false, erreur: "Ce n'est pas un nombre." });
  });

  it('refuse un champ vide plutôt que de le lire comme zéro', () => {
    expect(lireValeur(entier, '')).toEqual({ ok: false, erreur: 'Une valeur est attendue ici.' });
    expect(lireValeur(entier, '   ')).toEqual({ ok: false, erreur: 'Une valeur est attendue ici.' });
  });

  it('refuse l’infini', () => {
    expect(lireValeur(entier, 'Infinity').ok).toBe(false);
  });

  it('lit un booléen depuis le texte des cases à cocher', () => {
    const drapeau: DefinitionReglage = {
      cle: 'test.drapeau',
      groupe: 'terrain',
      libelle: '',
      explication: '',
      type: 'booleen',
      defaut: false,
    };
    expect(lireValeur(drapeau, 'true')).toEqual({ ok: true, valeur: true });
    expect(lireValeur(drapeau, false)).toEqual({ ok: true, valeur: false });
    expect(lireValeur(drapeau, 'peut-être').ok).toBe(false);
  });

  it('refuse un texte vide', () => {
    const texte: DefinitionReglage = {
      cle: 'test.texte',
      groupe: 'terrain',
      libelle: '',
      explication: '',
      type: 'texte',
      defaut: 'coucou',
    };
    expect(lireValeur(texte, '  bonjour ')).toEqual({ ok: true, valeur: 'bonjour' });
    expect(lireValeur(texte, '   ').ok).toBe(false);
  });
});
