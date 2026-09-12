import {
  ITEMS_LIEUX,
  ITEMS_THEMES,
  libelleTitre,
  seriesCollection,
  StatsCollection,
  statsVides,
  titreEstObtenu,
  titresObtenus,
  TITRES,
} from './collection-rules';

function stats(partiel: Partial<StatsCollection>): StatsCollection {
  return { ...statsVides(), ...partiel };
}

describe('titres', () => {
  it('un joueur qui vient de s’inscrire n’a que le titre de départ', () => {
    const obtenus = titresObtenus(statsVides());
    expect(obtenus).toHaveLength(1);
    expect(obtenus[0].id).toBe('nouveau_venu');
  });

  it('« Habitué du quartier » demande 5 passages dans LE MÊME lieu', () => {
    const eparpille = stats({ visitesParLieu: new Map([['a', 2], ['b', 2], ['c', 2]]) });
    expect(titreEstObtenu('habitue_du_quartier', eparpille)).toBe(false);

    const fidele = stats({ visitesParLieu: new Map([['a', 5]]) });
    expect(titreEstObtenu('habitue_du_quartier', fidele)).toBe(true);
  });

  it('les autres titres suivent bien leur condition', () => {
    expect(titreEstObtenu('arpenteur', stats({ quartiersLeves: 5 }))).toBe(true);
    expect(titreEstObtenu('arpenteur', stats({ quartiersLeves: 4 }))).toBe(false);
    expect(titreEstObtenu('bon_public', stats({ avisPublies: 5 }))).toBe(true);
    expect(titreEstObtenu('ame_du_duo', stats({ duosAccomplis: 3 }))).toBe(true);
    expect(titreEstObtenu('main_tendue', stats({ dons: 3 }))).toBe(true);
    expect(titreEstObtenu('figure_locale', stats({ niveau: 5 }))).toBe(true);
  });

  it('un titre inconnu n’est jamais considéré comme obtenu', () => {
    expect(titreEstObtenu('titre_invente', stats({ niveau: 99 }))).toBe(false);
    expect(libelleTitre('titre_invente')).toBeNull();
    expect(libelleTitre(null)).toBeNull();
  });

  it('chaque titre a un identifiant unique et une condition expliquée', () => {
    expect(new Set(TITRES.map((t) => t.id)).size).toBe(TITRES.length);
    expect(TITRES.every((t) => t.condition.length > 0)).toBe(true);
  });
});

describe('objets de collection', () => {
  it('deux séries, vides au départ', () => {
    const series = seriesCollection(statsVides());
    expect(series.map((s) => s.id)).toEqual(['lieux', 'themes']);
    expect(series.every((s) => s.obtenus === 0 && !s.complete)).toBe(true);
  });

  it('reconnaît le type d’établissement écrit librement par le commerçant', () => {
    const series = seriesCollection(
      stats({ typesEtablissementVisites: new Set(['Bar à vin', 'restaurant italien', 'Café']) }),
    );
    const lieux = series[0];
    const obtenus = lieux.items.filter((i) => i.obtenu).map((i) => i.id);
    expect(obtenus).toEqual(expect.arrayContaining(['bar', 'restaurant', 'cafe']));
    expect(lieux.obtenus).toBe(3);
  });

  it('un type d’établissement inconnu ne débloque rien', () => {
    const series = seriesCollection(stats({ typesEtablissementVisites: new Set(['cordonnerie']) }));
    expect(series[0].obtenus).toBe(0);
  });

  it('donne un objet par thème de mission accompli', () => {
    const series = seriesCollection(
      stats({ themesAccomplis: new Set(['culture', 'jeux_esprit']) }),
    );
    expect(series[1].obtenus).toBe(2);
    expect(series[1].items.find((i) => i.id === 'theme_culture')?.obtenu).toBe(true);
    expect(series[1].items.find((i) => i.id === 'theme_sport')?.obtenu).toBe(false);
  });

  it('se déclare complète seulement quand tous les objets sont là', () => {
    const tout = stats({
      themesAccomplis: new Set(ITEMS_THEMES.map((i) => i.theme)),
    });
    expect(seriesCollection(tout)[1].complete).toBe(true);
  });

  it('chaque objet a un identifiant unique', () => {
    const ids = [...ITEMS_LIEUX, ...ITEMS_THEMES].map((i) => i.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});
