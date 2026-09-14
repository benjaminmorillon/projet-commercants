import {
  ContexteOuverture,
  libelleReduction,
  reductionSur,
  verdictDePaiement,
} from './eligibilite';

/** Un joueur régulier, sur une offre en cours : tout va bien. */
const NORMAL: ContexteOuverture = {
  publiciteEnCours: true,
  budgetRestant: 50,
  coutDeLOuverture: 0.3,
  dejaPaye: false,
  ouverturesPayeesAujourdhui: 2,
  plafondQuotidien: 10,
  joursDepuisDerniereVisite: 3,
  ancienneteVisiteMaximale: 30,
  estSonPropreCommerce: false,
};

const avec = (modifs: Partial<ContexteOuverture>): ContexteOuverture => ({ ...NORMAL, ...modifs });

describe('verdictDePaiement', () => {
  it('paie un joueur qui sort et ouvre une offre en cours', () => {
    expect(verdictDePaiement(NORMAL)).toEqual({ paye: true });
  });

  it('ne paie pas sur une offre terminée', () => {
    const v = verdictDePaiement(avec({ publiciteEnCours: false }));
    expect(v.paye).toBe(false);
    if (!v.paye) expect(v.code).toBe('terminee');
  });

  it('ne paie pas quand le budget ne couvre plus une ouverture', () => {
    const v = verdictDePaiement(avec({ budgetRestant: 0.1, coutDeLOuverture: 0.3 }));
    expect(v.paye).toBe(false);
    if (!v.paye) expect(v.code).toBe('budget_epuise');
  });

  it('paie quand le budget couvre exactement une ouverture', () => {
    expect(verdictDePaiement(avec({ budgetRestant: 0.3, coutDeLOuverture: 0.3 }))).toEqual({
      paye: true,
    });
  });

  // Un commerçant qui ouvrirait sa propre annonce se paierait en boucle.
  it('ne paie pas un commerçant sur sa propre offre', () => {
    const v = verdictDePaiement(avec({ estSonPropreCommerce: true }));
    expect(v.paye).toBe(false);
    if (!v.paye) expect(v.code).toBe('sa_propre_offre');
  });

  it('ne paie pas deux fois la même offre', () => {
    const v = verdictDePaiement(avec({ dejaPaye: true }));
    expect(v.paye).toBe(false);
    if (!v.paye) expect(v.raison).toContain('bon de réduction');
  });

  // --- Le cœur du dispositif contre les comptes dormants et les fermes ---

  it('ne paie pas un compte qui n’est jamais sorti', () => {
    const v = verdictDePaiement(avec({ joursDepuisDerniereVisite: null }));
    expect(v.paye).toBe(false);
    if (!v.paye) expect(v.code).toBe('aucune_visite');
  });

  it('ne paie pas un compte dormant depuis trop longtemps', () => {
    const v = verdictDePaiement(avec({ joursDepuisDerniereVisite: 45 }));
    expect(v.paye).toBe(false);
    if (!v.paye) {
      expect(v.code).toBe('visite_trop_ancienne');
      expect(v.raison).toContain('45 jours');
    }
  });

  it('accepte une visite pile à la limite', () => {
    expect(verdictDePaiement(avec({ joursDepuisDerniereVisite: 30 }))).toEqual({ paye: true });
  });

  it('ne paie plus au-delà du plafond du jour', () => {
    const v = verdictDePaiement(avec({ ouverturesPayeesAujourdhui: 10, plafondQuotidien: 10 }));
    expect(v.paye).toBe(false);
    if (!v.paye) expect(v.raison).toContain('10 offres payées du jour');
  });

  it('paie encore à la dernière ouverture autorisée', () => {
    expect(verdictDePaiement(avec({ ouverturesPayeesAujourdhui: 9, plafondQuotidien: 10 }))).toEqual(
      { paye: true },
    );
  });

  // Quand plusieurs raisons s'appliquent, on veut la plus utile à entendre.
  it('annonce d’abord que l’offre est terminée', () => {
    const v = verdictDePaiement(
      avec({ publiciteEnCours: false, dejaPaye: true, joursDepuisDerniereVisite: 99 }),
    );
    expect(v.paye).toBe(false);
    if (!v.paye) expect(v.code).toBe('terminee');
  });

  it('donne toujours une raison lisible, jamais un code seul', () => {
    const cas: Partial<ContexteOuverture>[] = [
      { publiciteEnCours: false },
      { budgetRestant: 0 },
      { estSonPropreCommerce: true },
      { dejaPaye: true },
      { joursDepuisDerniereVisite: null },
      { joursDepuisDerniereVisite: 99 },
      { ouverturesPayeesAujourdhui: 99 },
    ];
    for (const modif of cas) {
      const v = verdictDePaiement(avec(modif));
      expect(v.paye).toBe(false);
      if (!v.paye) {
        expect(v.raison.length).toBeGreaterThan(20);
        expect(v.raison).toMatch(/[.!]$/);
      }
    }
  });
});

describe('reductionSur', () => {
  it('applique un pourcentage', () => {
    expect(reductionSur(20, { pourcent: 10, jetons: null })).toBe(2);
  });

  it('applique un montant fixe', () => {
    expect(reductionSur(20, { pourcent: null, jetons: 3 })).toBe(3);
  });

  it('additionne les deux quand l’offre en porte deux', () => {
    expect(reductionSur(20, { pourcent: 10, jetons: 3 })).toBe(5);
  });

  // On ne rend pas de monnaie sur un bon de réduction.
  it('ne dépasse jamais le montant de l’addition', () => {
    expect(reductionSur(5, { pourcent: 100, jetons: 50 })).toBe(5);
    expect(reductionSur(5, { pourcent: null, jetons: 50 })).toBe(5);
  });

  it('arrondit au centime', () => {
    expect(reductionSur(9.99, { pourcent: 15, jetons: null })).toBe(1.5);
  });

  it('rend zéro sur une addition vide ou absurde', () => {
    expect(reductionSur(0, { pourcent: 50, jetons: null })).toBe(0);
    expect(reductionSur(-10, { pourcent: 50, jetons: null })).toBe(0);
    expect(reductionSur(NaN, { pourcent: 50, jetons: null })).toBe(0);
  });

  it('rend zéro quand l’offre ne porte aucune réduction chiffrée', () => {
    expect(reductionSur(20, { pourcent: null, jetons: null })).toBe(0);
  });
});

describe('libelleReduction', () => {
  it('écrit la réduction en une ligne', () => {
    expect(libelleReduction({ pourcent: 20, jetons: null })).toBe('-20 %');
    expect(libelleReduction({ pourcent: null, jetons: 1 })).toBe('-1 jeton');
    expect(libelleReduction({ pourcent: null, jetons: 3 })).toBe('-3 jetons');
    expect(libelleReduction({ pourcent: 10, jetons: 2 })).toBe('-10 % et -2 jetons');
  });

  it('le dit quand il n’y a pas de chiffre', () => {
    expect(libelleReduction({ pourcent: null, jetons: null })).toBe(
      'Offre sans réduction chiffrée',
    );
  });
});

describe('accords de langue', () => {
  it('dit « ton offre » au singulier', () => {
    const v = verdictDePaiement(avec({ ouverturesPayeesAujourdhui: 1, plafondQuotidien: 1 }));
    expect(v.paye).toBe(false);
    if (!v.paye) expect(v.raison).toContain('ton offre payée du jour');
  });

  it('dit « tes N offres » au pluriel', () => {
    const v = verdictDePaiement(avec({ ouverturesPayeesAujourdhui: 5, plafondQuotidien: 5 }));
    expect(v.paye).toBe(false);
    if (!v.paye) expect(v.raison).toContain('tes 5 offres payées du jour');
  });
});
