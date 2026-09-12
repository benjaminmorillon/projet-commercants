import { BADGES, niveauPourXp, resumeProgression, xpRequisePourNiveau } from './xp-rules';

describe('niveaux', () => {
  it('démarre au niveau 1 sans aucune XP', () => {
    expect(niveauPourXp(0)).toBe(1);
  });

  it('demande de plus en plus d’XP à chaque palier', () => {
    expect(xpRequisePourNiveau(2)).toBe(100);
    expect(xpRequisePourNiveau(3)).toBe(300);
    expect(xpRequisePourNiveau(4)).toBe(600);
  });

  it('passe au niveau suivant pile au seuil', () => {
    expect(niveauPourXp(99)).toBe(1);
    expect(niveauPourXp(100)).toBe(2);
    expect(niveauPourXp(299)).toBe(2);
    expect(niveauPourXp(300)).toBe(3);
  });

  it('résume la progression vers le palier suivant', () => {
    const resume = resumeProgression(150);
    expect(resume.niveau).toBe(2);
    expect(resume.xpNiveauActuel).toBe(50);
    expect(resume.xpProchainNiveau).toBe(200);
    expect(resume.progressionVersNiveauSuivant).toBe(25);
  });
});

describe('badges', () => {
  const aucuneAction = {
    lieuxDifferentsVisites: 0,
    missionsAccomplies: 0,
    missionsGroupeAccomplies: 0,
    avisPublies: 0,
    amis: 0,
    dons: 0,
  };

  it('n’en donne aucun à un joueur qui n’a rien fait', () => {
    expect(BADGES.filter((b) => b.estObtenu(aucuneAction))).toHaveLength(0);
  });

  it('donne le badge de première mission dès la première accomplie', () => {
    const stats = { ...aucuneAction, missionsAccomplies: 1 };
    const obtenus = BADGES.filter((b) => b.estObtenu(stats)).map((b) => b.id);
    expect(obtenus).toContain('premier_pas');
    expect(obtenus).not.toContain('serie_de_5');
  });

  it('débloque les paliers d’exploration dans l’ordre', () => {
    const cinq = BADGES.filter((b) => b.estObtenu({ ...aucuneAction, lieuxDifferentsVisites: 5 })).map((b) => b.id);
    const quinze = BADGES.filter((b) => b.estObtenu({ ...aucuneAction, lieuxDifferentsVisites: 15 })).map((b) => b.id);
    expect(cinq).toContain('explorateur_5_lieux');
    expect(cinq).not.toContain('explorateur_15_lieux');
    expect(quinze).toContain('explorateur_15_lieux');
  });

  it('a des identifiants uniques', () => {
    const ids = BADGES.map((b) => b.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});
