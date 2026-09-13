import {
  arrondir,
  libelleMouvement,
  MONTANT_MINIMUM,
  repartirCiblage,
  soldeSuffisant,
  verifierMontant,
} from './ledger-rules';

describe('arrondi au centime', () => {
  it('coupe les décimales qui traînent', () => {
    expect(arrondir(0.1 + 0.2)).toBe(0.3);
    expect(arrondir(3.333333)).toBe(3.33);
  });

  it('arrondit vers le haut à la moitié, malgré le flottant', () => {
    // 1,005 n'existe pas exactement en machine : sans correction, un arrondi
    // naïf rendrait 1,00.
    expect(arrondir(1.005)).toBe(1.01);
    expect(arrondir(2.675)).toBe(2.68);
  });

  it('n’arrondit pas vers le haut ce qui est juste en dessous', () => {
    expect(arrondir(1.0049)).toBe(1);
    expect(arrondir(2.6749)).toBe(2.67);
  });
});

describe('vérification du montant', () => {
  it('refuse zéro, le négatif et le non-nombre', () => {
    expect(verifierMontant(0).valide).toBe(false);
    expect(verifierMontant(-5).valide).toBe(false);
    expect(verifierMontant(Number.NaN).valide).toBe(false);
    expect(verifierMontant(Number.POSITIVE_INFINITY).valide).toBe(false);
  });

  it('accepte à partir du minimum', () => {
    expect(verifierMontant(MONTANT_MINIMUM).valide).toBe(true);
    expect(verifierMontant(12.5).valide).toBe(true);
  });

  it('explique pourquoi elle refuse', () => {
    expect(verifierMontant(0).raison).toContain('minimum');
  });
});

describe('solde suffisant', () => {
  it('autorise de dépenser exactement son solde', () => {
    expect(soldeSuffisant(10, 10)).toBe(true);
  });

  it('refuse un centime de trop', () => {
    expect(soldeSuffisant(10, 10.01)).toBe(false);
  });

  it('ne se fait pas piéger par les décimales', () => {
    // 0.1 + 0.2 vaut 0.30000000000000004 pour un ordinateur : une comparaison
    // naïve refuserait ce paiement pourtant valide.
    expect(soldeSuffisant(0.1 + 0.2, 0.3)).toBe(true);
  });
});

describe('répartition d’un ciblage', () => {
  it('donne sa part au joueur et le reste à la plateforme', () => {
    expect(repartirCiblage(10, 0.8)).toEqual({ versJoueurs: 8, versPlateforme: 2 });
  });

  it('ne perd ni ne crée de jeton sur un montant qui tombe mal', () => {
    const { versJoueurs, versPlateforme } = repartirCiblage(0.07, 0.8);
    expect(arrondir(versJoueurs + versPlateforme)).toBe(0.07);
  });

  it('reste juste sur beaucoup de montants différents', () => {
    for (let centimes = 1; centimes <= 500; centimes += 1) {
      const total = centimes / 100;
      const { versJoueurs, versPlateforme } = repartirCiblage(total, 0.8);
      expect(arrondir(versJoueurs + versPlateforme)).toBe(total);
      expect(versJoueurs).toBeGreaterThanOrEqual(0);
      expect(versPlateforme).toBeGreaterThanOrEqual(0);
    }
  });
});

describe('libellés', () => {
  it('dit les choses différemment selon le sens du mouvement', () => {
    expect(libelleMouvement('depense_chez_partenaire', 'sortie')).toContain('Dépense');
    expect(libelleMouvement('depense_chez_partenaire', 'entree')).toContain('Paiement');
  });
});
