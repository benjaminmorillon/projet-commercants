import {
  archetypeDominant,
  choisirLieuRendezVous,
  ProfilScores,
  scoreAffinite,
  typeCombinaison,
} from './matching';

const profil = (
  exp: number,
  acc: number,
  comp: number,
  soc: number,
): ProfilScores => ({
  scoreExplorateur: exp,
  scoreAccomplisseur: acc,
  scoreCompetiteur: comp,
  scoreSocialisateur: soc,
});

describe('archetypeDominant', () => {
  it('retient la dimension la plus forte', () => {
    expect(archetypeDominant(profil(80, 40, 20, 30))).toBe('explorateur');
    expect(archetypeDominant(profil(10, 20, 30, 90))).toBe('socialisateur');
  });
});

describe('typeCombinaison', () => {
  // Les paires viennent du tableau de docs/guide-missions-sociales.md.
  it('reconnaît les paires naturelles du guide', () => {
    expect(typeCombinaison('explorateur', 'socialisateur')).toBe('naturelle');
    expect(typeCombinaison('accomplisseur', 'competiteur')).toBe('naturelle');
  });

  it('reconnaît les défis de complémentarité du guide', () => {
    expect(typeCombinaison('competiteur', 'socialisateur')).toBe('defi');
    expect(typeCombinaison('accomplisseur', 'explorateur')).toBe('defi');
  });

  it('ne dépend pas de l’ordre des deux joueurs', () => {
    expect(typeCombinaison('socialisateur', 'explorateur')).toBe('naturelle');
  });

  it('traite deux profils identiques à part', () => {
    expect(typeCombinaison('explorateur', 'explorateur')).toBe('meme_profil');
  });
});

describe('scoreAffinite', () => {
  const explorateur = profil(85, 30, 20, 60);
  const socialisateur = profil(55, 25, 20, 90);
  const accomplisseur = profil(20, 90, 45, 15);

  it('préfère une paire naturelle en mode affinité', () => {
    const naturelle = scoreAffinite(explorateur, socialisateur, 'affinite_naturelle');
    const defi = scoreAffinite(explorateur, accomplisseur, 'affinite_naturelle');
    expect(naturelle).toBeGreaterThan(defi);
  });

  it('préfère une paire opposée en mode défi', () => {
    const defi = scoreAffinite(explorateur, accomplisseur, 'defi_complementarite');
    const naturelle = scoreAffinite(explorateur, socialisateur, 'defi_complementarite');
    expect(defi).toBeGreaterThan(naturelle);
  });

  it('reste toujours entre 0 et 1', () => {
    const modes = ['affinite_naturelle', 'defi_complementarite'] as const;
    modes.forEach((mode) => {
      const score = scoreAffinite(profil(100, 0, 0, 0), profil(0, 0, 0, 100), mode);
      expect(score).toBeGreaterThanOrEqual(0);
      expect(score).toBeLessThanOrEqual(1);
    });
  });

  it('départage deux candidats grâce à l’historique des duos', () => {
    const sansHistorique = scoreAffinite(explorateur, socialisateur, 'affinite_naturelle');
    const avecBonHistorique = scoreAffinite(explorateur, socialisateur, 'affinite_naturelle', {
      tauxReussite: 1,
      nombreDuos: 10,
    });
    const avecMauvaisHistorique = scoreAffinite(explorateur, socialisateur, 'affinite_naturelle', {
      tauxReussite: 0,
      nombreDuos: 10,
    });
    expect(avecBonHistorique).toBeGreaterThan(sansHistorique);
    expect(avecMauvaisHistorique).toBeLessThan(sansHistorique);
  });

  it('ne se laisse pas emporter par un historique d’un seul duo', () => {
    const sansHistorique = scoreAffinite(explorateur, socialisateur, 'affinite_naturelle');
    const unSeulDuo = scoreAffinite(explorateur, socialisateur, 'affinite_naturelle', {
      tauxReussite: 1,
      nombreDuos: 1,
    });
    expect(unSeulDuo - sansHistorique).toBeLessThan(0.05);
  });
});

describe('choisirLieuRendezVous', () => {
  it('préfère le lieu le plus sous-fréquenté de qualité', () => {
    const choisi = choisirLieuRendezVous([
      { id: 'sature', multiplicateur: 0.7 },
      { id: 'pepite', multiplicateur: 1.1 },
      { id: 'neutre', multiplicateur: 1 },
    ]);
    expect(choisi?.id).toBe('pepite');
  });

  it('retourne null s’il n’y a aucun lieu partenaire', () => {
    expect(choisirLieuRendezVous([])).toBeNull();
  });
});
