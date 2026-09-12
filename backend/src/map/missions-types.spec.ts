import { choisirMissionsTypes } from './missions-types';

const catalogue = ['a', 'b', 'c', 'd', 'e', 'f', 'g'];

describe('choisirMissionsTypes', () => {
  it('propose toujours les mêmes missions pour un même lieu', () => {
    const premier = choisirMissionsTypes('lieu-1', catalogue);
    const second = choisirMissionsTypes('lieu-1', catalogue);
    expect(premier).toEqual(second);
  });

  it('ne propose pas deux fois la même mission', () => {
    const choisies = choisirMissionsTypes('lieu-1', catalogue);
    expect(new Set(choisies).size).toBe(choisies.length);
  });

  it('propose le nombre demandé quand le catalogue est assez grand', () => {
    expect(choisirMissionsTypes('lieu-1', catalogue)).toHaveLength(3);
  });

  it('ne dépasse jamais la taille du catalogue', () => {
    expect(choisirMissionsTypes('lieu-1', ['a', 'b'])).toHaveLength(2);
    expect(choisirMissionsTypes('lieu-1', [])).toEqual([]);
  });

  it('ne propose pas la même sélection à tous les lieux', () => {
    const selections = ['lieu-1', 'lieu-2', 'lieu-3', 'lieu-4'].map((id) =>
      choisirMissionsTypes(id, catalogue).join(','),
    );
    expect(new Set(selections).size).toBeGreaterThan(1);
  });
});
