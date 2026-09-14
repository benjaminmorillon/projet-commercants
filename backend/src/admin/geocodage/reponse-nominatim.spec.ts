import { abreger, lireAdresses } from './reponse-nominatim';

// Une réponse telle que Nominatim l'envoie réellement : les coordonnées sont
// du TEXTE, et l'adresse complète est très longue.
const REPONSE_REELLE = [
  {
    place_id: 297254986,
    licence: 'Data © OpenStreetMap contributors',
    osm_type: 'node',
    lat: '48.8601163',
    lon: '2.3640449',
    display_name:
      '12, Rue de Turenne, Quartier des Archives, Paris 3e Arrondissement, Paris, Île-de-France, France métropolitaine, 75003, France',
    type: 'house',
    importance: 0.42,
  },
  {
    place_id: 123456,
    lat: '48.8570000',
    lon: '2.3620000',
    display_name: '12, Rue de Turenne, Le Marais, Paris, 75004, France',
    type: 'house',
  },
];

describe('lireAdresses', () => {
  it('lit les coordonnées même quand elles arrivent en texte', () => {
    const adresses = lireAdresses(REPONSE_REELLE);
    expect(adresses).toHaveLength(2);
    expect(adresses[0]).toEqual({
      libelle:
        '12, Rue de Turenne, Quartier des Archives, Paris 3e Arrondissement, Paris, Île-de-France, France métropolitaine, 75003, France',
      latitude: 48.8601163,
      longitude: 2.3640449,
    });
  });

  it('limite le nombre de propositions', () => {
    expect(lireAdresses(REPONSE_REELLE, 1)).toHaveLength(1);
  });

  it('rend une liste vide quand le service ne répond pas un tableau', () => {
    expect(lireAdresses(null)).toEqual([]);
    expect(lireAdresses({ erreur: 'quota dépassé' })).toEqual([]);
    expect(lireAdresses('')).toEqual([]);
  });

  // Une adresse incomplète placerait le commerce n'importe où sans qu'on le
  // voie : on préfère ne pas la proposer du tout.
  it('écarte les lignes inexploitables plutôt que de les proposer', () => {
    const adresses = lireAdresses([
      { lat: '48.86', lon: '2.36', display_name: 'Bonne adresse' },
      { lat: '48.86', display_name: 'Sans longitude' },
      { lat: 'inconnue', lon: '2.36', display_name: 'Latitude illisible' },
      { lat: '48.86', lon: '2.36' },
      { lat: '48.86', lon: '2.36', display_name: '   ' },
      { lat: '200', lon: '2.36', display_name: 'Latitude hors du monde' },
      null,
      'pas un objet',
    ]);
    expect(adresses).toEqual([
      { libelle: 'Bonne adresse', latitude: 48.86, longitude: 2.36 },
    ]);
  });

  it('accepte les coordonnées déjà numériques', () => {
    expect(lireAdresses([{ lat: 48.86, lon: 2.36, display_name: 'Chez nous' }])).toEqual([
      { libelle: 'Chez nous', latitude: 48.86, longitude: 2.36 },
    ]);
  });

  it('accepte les bornes exactes du monde', () => {
    const adresses = lireAdresses([
      { lat: '-90', lon: '-180', display_name: 'Un coin de la Terre' },
      { lat: '90', lon: '180', display_name: "L'autre coin" },
    ]);
    expect(adresses).toHaveLength(2);
  });
});

describe('abreger', () => {
  it('garde la rue et la ville, jette l’administratif du milieu', () => {
    expect(abreger(REPONSE_REELLE[0].display_name)).toBe(
      '12, Rue de Turenne — 75003 France métropolitaine',
    );
  });

  it('laisse une adresse déjà courte telle quelle', () => {
    expect(abreger('Le Comptoir, 9 rue de Lappe, Paris')).toBe(
      'Le Comptoir, 9 rue de Lappe, Paris',
    );
  });

  it('se rabat sur le dernier morceau quand il n’y a pas de code postal', () => {
    expect(abreger('A, B, C, D, E, F')).toBe('A, B — F');
  });

  it('ne casse pas sur une chaîne vide', () => {
    expect(abreger('')).toBe('');
  });
});
