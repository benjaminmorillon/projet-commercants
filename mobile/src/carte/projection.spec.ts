import {
  METRES_PAR_DEGRE_LATITUDE,
  echelleMinimale,
  echellePourTout,
  lieuxDuQuartier,
  metresParDegreLongitude,
  quartierDepuisLaCle,
  quartierSurLePlan,
  versLePlan,
} from './projection';

const PARIS = { latitude: 48.8566, longitude: 2.3522 };

describe('la largeur d’un degré', () => {
  it('rétrécit quand on monte vers le nord', () => {
    expect(metresParDegreLongitude(0)).toBeCloseTo(METRES_PAR_DEGRE_LATITUDE, 0);
    expect(metresParDegreLongitude(48.8566)).toBeGreaterThan(70_000);
    expect(metresParDegreLongitude(48.8566)).toBeLessThan(76_000);
  });
});

describe('poser un point sur le plan', () => {
  it('met le centre au centre', () => {
    const centre = versLePlan(PARIS, PARIS, 5);
    // `toBeCloseTo` et non `toEqual` : l'inversion de l'axe vertical produit
    // un « -0 », qui vaut zéro mais n'y est pas strictement égal.
    expect(centre.x).toBeCloseTo(0, 10);
    expect(centre.y).toBeCloseTo(0, 10);
  });

  it('envoie le nord vers le HAUT de l’écran', () => {
    // Un écran compte y vers le bas : plus au nord doit donner un y négatif.
    const plusAuNord = { latitude: PARIS.latitude + 0.01, longitude: PARIS.longitude };
    expect(versLePlan(PARIS, plusAuNord, 5).y).toBeLessThan(0);
  });

  it('envoie l’est vers la DROITE', () => {
    const plusALEst = { latitude: PARIS.latitude, longitude: PARIS.longitude + 0.01 };
    expect(versLePlan(PARIS, plusALEst, 5).x).toBeGreaterThan(0);
  });

  it('respecte les distances : deux fois plus loin, deux fois plus bas', () => {
    const a = versLePlan(PARIS, { latitude: PARIS.latitude - 0.01, longitude: PARIS.longitude }, 5);
    const b = versLePlan(PARIS, { latitude: PARIS.latitude - 0.02, longitude: PARIS.longitude }, 5);
    expect(b.y / a.y).toBeCloseTo(2, 5);
  });

  it('ne déforme pas l’est-ouest : 1 km au nord et 1 km à l’est font la même longueur', () => {
    const unKmAuNord = {
      latitude: PARIS.latitude + 1000 / METRES_PAR_DEGRE_LATITUDE,
      longitude: PARIS.longitude,
    };
    const unKmALEst = {
      latitude: PARIS.latitude,
      longitude: PARIS.longitude + 1000 / metresParDegreLongitude(PARIS.latitude),
    };
    expect(Math.abs(versLePlan(PARIS, unKmAuNord, 5).y)).toBeCloseTo(
      versLePlan(PARIS, unKmALEst, 5).x,
      5,
    );
  });

  it('divise bien par l’échelle', () => {
    const point = { latitude: PARIS.latitude - 0.01, longitude: PARIS.longitude };
    expect(versLePlan(PARIS, point, 10).y).toBeCloseTo(versLePlan(PARIS, point, 5).y / 2, 5);
  });
});

describe('l’échelle du plan', () => {
  const loin = { latitude: PARIS.latitude + 0.02, longitude: PARIS.longitude };

  it('fait tenir le point le plus éloigné dans le cadre', () => {
    const echelle = echellePourTout(PARIS, [loin], 150);
    const pose = versLePlan(PARIS, loin, echelle);
    expect(Math.hypot(pose.x, pose.y)).toBeLessThanOrEqual(150);
  });

  it('laisse une marge pour que la pastille ne soit pas coupée', () => {
    const echelle = echellePourTout(PARIS, [loin], 150);
    const pose = versLePlan(PARIS, loin, echelle);
    expect(Math.hypot(pose.x, pose.y)).toBeLessThan(150 * 0.95);
  });

  it('ne s’effondre pas quand tous les lieux sont au même endroit', () => {
    expect(echellePourTout(PARIS, [PARIS, PARIS], 150)).toBe(1.5);
  });

  it('ne s’effondre pas sans aucun lieu', () => {
    expect(echellePourTout(PARIS, [], 150)).toBe(1.5);
  });

  it('plafonne quand un lieu est à l’autre bout du pays', () => {
    const marseille = { latitude: 43.2965, longitude: 5.3698 };
    expect(echellePourTout(PARIS, [marseille], 150)).toBe(40);
  });

  it('ne descend jamais sous le minimum', () => {
    const voisin = { latitude: PARIS.latitude + 0.00001, longitude: PARIS.longitude };
    expect(echellePourTout(PARIS, [voisin], 150)).toBe(1.5);
  });
});

describe('l’échelle minimale', () => {
  const taille = 0.005;

  it('laisse tenir au moins deux quartiers et demi dans le plan', () => {
    const echelle = echelleMinimale(PARIS, taille, 320);
    const largeurQuartierEnPixels =
      (taille * metresParDegreLongitude(PARIS.latitude)) / echelle;
    expect(largeurQuartierEnPixels).toBeCloseTo(320 / 2.5, 5);
  });

  it('empêche un quartier de déborder quand tous les lieux sont au même endroit', () => {
    // Plusieurs commerces à la même adresse : sans plancher, l'échelle
    // tombe au plus serré et un quartier de 500 m remplit tout l'écran.
    const minimum = echelleMinimale(PARIS, taille, 320);
    const echelle = echellePourTout(PARIS, [PARIS, PARIS], 160, minimum);
    expect(echelle).toBe(minimum);
  });
});

describe('les lieux du quartier', () => {
  const proche = { latitude: PARIS.latitude + 0.001, longitude: PARIS.longitude, nom: 'proche' };
  const moyen = { latitude: PARIS.latitude + 0.01, longitude: PARIS.longitude, nom: 'moyen' };
  const loin = { latitude: PARIS.latitude + 0.1, longitude: PARIS.longitude, nom: 'loin' };

  it('garde les plus proches, dans l’ordre', () => {
    expect(lieuxDuQuartier(PARIS, [loin, proche, moyen], 2).map((l) => l.nom)).toEqual([
      'proche',
      'moyen',
    ]);
  });

  it('n’en garde jamais zéro, même si on lui demande', () => {
    expect(lieuxDuQuartier(PARIS, [loin, proche], 0)).toHaveLength(1);
  });

  it('rend tout quand il y a moins de lieux que demandé', () => {
    expect(lieuxDuQuartier(PARIS, [proche], 10)).toHaveLength(1);
  });

  it('ne modifie pas la liste qu’on lui donne', () => {
    const liste = [loin, proche, moyen];
    lieuxDuQuartier(PARIS, liste, 2);
    expect(liste.map((l) => l.nom)).toEqual(['loin', 'proche', 'moyen']);
  });

  it('resserre l’échelle : le voile redevient visible', () => {
    // C'est tout l'objet de la fonction. Avec le lieu lointain, un quartier
    // de 500 m tient dans quelques pixels ; sans lui, il se voit.
    const tous = echellePourTout(PARIS, [proche, moyen, loin], 160);
    const quartier = echellePourTout(PARIS, lieuxDuQuartier(PARIS, [proche, moyen, loin], 2), 160);
    expect(quartier).toBeLessThan(tous / 3);
  });
});

describe('les quartiers', () => {
  const taille = 0.005;

  it('retrouve le coin sud-ouest depuis la clé', () => {
    expect(quartierDepuisLaCle('9771:470', taille)).toEqual({
      cle: '9771:470',
      sud: 9771 * taille,
      ouest: 470 * taille,
    });
  });

  it('refuse une clé tronquée plutôt que de la lire comme un zéro', () => {
    // `Number('')` vaut zéro, et zéro est une coordonnée valide : une clé
    // abîmée dessinerait un quartier au large de l'Afrique.
    expect(quartierDepuisLaCle(':470', taille)).toBeNull();
    expect(quartierDepuisLaCle('9771:', taille)).toBeNull();
    expect(quartierDepuisLaCle('9771', taille)).toBeNull();
    expect(quartierDepuisLaCle('a:b', taille)).toBeNull();
  });

  it('dessine un rectangle posé par son coin haut gauche, c’est-à-dire le nord-ouest', () => {
    const quartier = { cle: 'q', sud: PARIS.latitude, ouest: PARIS.longitude };
    const rect = quartierSurLePlan(quartier, PARIS, taille, 5);

    // Le coin est au nord du centre → au-dessus → y négatif.
    expect(rect.y).toBeLessThan(0);
    // Et à sa longitude exacte → x nul.
    expect(rect.x).toBeCloseTo(0, 5);
    expect(rect.largeur).toBeGreaterThan(0);
    expect(rect.hauteur).toBeGreaterThan(0);
  });

  it('dessine un quartier plus haut que large sous nos latitudes', () => {
    // Un degré de longitude est plus court qu'un degré de latitude à Paris :
    // une case carrée en degrés est donc un rectangle debout à l'écran.
    const quartier = { cle: 'q', sud: PARIS.latitude, ouest: PARIS.longitude };
    const rect = quartierSurLePlan(quartier, PARIS, taille, 5);
    expect(rect.hauteur).toBeGreaterThan(rect.largeur);
  });
});
