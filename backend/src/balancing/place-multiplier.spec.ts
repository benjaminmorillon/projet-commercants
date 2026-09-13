import { computePlaceBalancing } from './place-multiplier';

// Les quatre effets attendus par la section 4.2 des specs.
describe('computePlaceBalancing', () => {
  it('donne un fort bonus à une pépite peu fréquentée', () => {
    const result = computePlaceBalancing({ note: 4.8, nombreVisites: 5, capaciteEstimee: 100 });
    expect(result.multiplicateur).toBe(1.1);
  });

  it('ne donne pas de bonus artificiel à un lieu excellent déjà plein', () => {
    const result = computePlaceBalancing({ note: 4.8, nombreVisites: 95, capaciteEstimee: 100 });
    expect(result.multiplicateur).toBeGreaterThan(0.95);
    expect(result.multiplicateur).toBeLessThanOrEqual(1);
  });

  it('ne booste pas un lieu moyen même s’il est vide', () => {
    const result = computePlaceBalancing({ note: 2.5, nombreVisites: 5, capaciteEstimee: 100 });
    expect(result.multiplicateur).toBeLessThanOrEqual(1);
  });

  it('applique un malus à un lieu peu qualitatif et très fréquenté', () => {
    const result = computePlaceBalancing({ note: 2.5, nombreVisites: 95, capaciteEstimee: 100 });
    expect(result.multiplicateur).toBe(0.7);
  });

  it('reste dans les bornes 70% – 110% quelles que soient les données', () => {
    const extremes = [
      { note: 5, nombreVisites: 0, capaciteEstimee: 1 },
      { note: 0, nombreVisites: 10000, capaciteEstimee: 1 },
      { note: null, nombreVisites: 0, capaciteEstimee: null },
    ];
    extremes.forEach((input) => {
      const { multiplicateur } = computePlaceBalancing(input);
      expect(multiplicateur).toBeGreaterThanOrEqual(0.7);
      expect(multiplicateur).toBeLessThanOrEqual(1.1);
    });
  });

  it('plafonne le taux d’occupation à 100% même au-delà de la capacité', () => {
    const result = computePlaceBalancing({ note: 4, nombreVisites: 500, capaciteEstimee: 50 });
    expect(result.tauxOccupation).toBe(1);
  });

  it('utilise la capacité par défaut quand elle n’est pas renseignée', () => {
    const sansCapacite = computePlaceBalancing({ note: 4, nombreVisites: 25, capaciteEstimee: null });
    const avec50 = computePlaceBalancing({ note: 4, nombreVisites: 25, capaciteEstimee: 50 });
    expect(sansCapacite.multiplicateur).toBe(avec50.multiplicateur);
  });
});

// --- Ce que le back-office peut changer ------------------------------------

describe('réglages appliqués au rééquilibrage', () => {
  const lieuVideEtBon = { nombreVisites: 0, capaciteEstimee: 100, note: 5 };

  it('désactive complètement le rééquilibrage quand la sensibilité est à 0', () => {
    const resultat = computePlaceBalancing(lieuVideEtBon, { facteurEcart: 0 });
    expect(resultat.multiplicateur).toBe(1);
  });

  it('respecte les bornes réglées', () => {
    const genereux = computePlaceBalancing(lieuVideEtBon, {
      facteurEcart: 2,
      multiplicateurMax: 1.5,
    });
    expect(genereux.multiplicateur).toBe(1.5);

    const bonde = computePlaceBalancing(
      { nombreVisites: 500, capaciteEstimee: 100, note: 2.5 },
      { facteurEcart: 2, multiplicateurMin: 0.4 },
    );
    expect(bonde.multiplicateur).toBe(0.4);
  });

  // Un réglage incohérent saisi dans le back-office ne doit pas produire de
  // résultat absurde : on redresse plutôt que d'inverser les bornes.
  it('ne renvoie pas n’importe quoi si le maximum est réglé sous le minimum', () => {
    const resultat = computePlaceBalancing(lieuVideEtBon, {
      multiplicateurMin: 0.9,
      multiplicateurMax: 0.5,
    });
    expect(resultat.multiplicateur).toBe(0.9);
  });

  it('utilise la capacité par défaut réglée quand le lieu n’a rien renseigné', () => {
    const petiteCapacite = computePlaceBalancing(
      { nombreVisites: 20, capaciteEstimee: null, note: 5 },
      { capaciteParDefaut: 20 },
    );
    const grandeCapacite = computePlaceBalancing(
      { nombreVisites: 20, capaciteEstimee: null, note: 5 },
      { capaciteParDefaut: 200 },
    );
    // Vingt visites, c'est plein pour un lieu de 20 places et vide pour un
    // lieu de 200 : le coup de pouce doit être bien plus élevé au second.
    expect(grandeCapacite.multiplicateur).toBeGreaterThan(petiteCapacite.multiplicateur);
  });
});
