import { distanceInMeters } from './geo';

describe('distanceInMeters', () => {
  it('retourne 0 pour deux points identiques', () => {
    expect(distanceInMeters(48.8566, 2.3522, 48.8566, 2.3522)).toBe(0);
  });

  it('retourne environ 111km pour un écart de 1° de latitude', () => {
    const distance = distanceInMeters(0, 0, 1, 0);
    expect(distance).toBeGreaterThan(110_000);
    expect(distance).toBeLessThan(112_000);
  });

  it('retourne une distance courte pour deux points proches (~430m)', () => {
    // Tour Eiffel -> Champ de Mars, à quelques centaines de mètres.
    const distance = distanceInMeters(48.8584, 2.2945, 48.8556, 2.2986);
    expect(distance).toBeGreaterThan(300);
    expect(distance).toBeLessThan(600);
  });
});
