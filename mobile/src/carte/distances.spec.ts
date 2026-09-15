import { distanceEnMetres, distanceLisible } from './distances';

describe('la distance entre deux points', () => {
  it('vaut zéro pour deux points identiques', () => {
    expect(distanceEnMetres(48.8566, 2.3522, 48.8566, 2.3522)).toBe(0);
  });

  it('vaut environ 111 km pour un degré de latitude', () => {
    const distance = distanceEnMetres(0, 0, 1, 0);
    expect(distance).toBeGreaterThan(110_000);
    expect(distance).toBeLessThan(112_000);
  });

  it('mesure correctement une courte distance dans Paris', () => {
    // Tour Eiffel → Champ de Mars, quelques centaines de mètres.
    const distance = distanceEnMetres(48.8584, 2.2945, 48.8556, 2.2986);
    expect(distance).toBeGreaterThan(300);
    expect(distance).toBeLessThan(600);
  });

  it('donne le même résultat dans les deux sens', () => {
    expect(distanceEnMetres(48.85, 2.35, 48.86, 2.36)).toBeCloseTo(
      distanceEnMetres(48.86, 2.36, 48.85, 2.35),
      6,
    );
  });
});

describe('la distance écrite', () => {
  it('reste en mètres en dessous du kilomètre', () => {
    expect(distanceLisible(0)).toBe('0 m');
    expect(distanceLisible(124.4)).toBe('124 m');
    expect(distanceLisible(999)).toBe('999 m');
  });

  it('passe au kilomètre avec une virgule française', () => {
    expect(distanceLisible(1000)).toBe('1,0 km');
    expect(distanceLisible(2340)).toBe('2,3 km');
  });

  it('arrondit du bon côté à la demi-centaine', () => {
    // `(1.45).toFixed(1)` rendait « 1.4 » : 1,45 n'existe pas exactement en
    // machine et vaut un cheveu de moins. Le cas est ici pour que l'arrondi
    // ne reparte jamais dans ce sens.
    expect(distanceLisible(1450)).toBe('1,5 km');
    expect(distanceLisible(2950)).toBe('3,0 km');
  });
});
