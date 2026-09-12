import { applyEventToScores, ArchetypeScores, EVENT_WEIGHTS } from './event-weights';

const profilNeutre: ArchetypeScores = {
  scoreExplorateur: 50,
  scoreAccomplisseur: 50,
  scoreCompetiteur: 50,
  scoreSocialisateur: 50,
};

describe('applyEventToScores', () => {
  it('fait monter la bonne dimension quand un joueur découvre un lieu', () => {
    const apres = applyEventToScores(profilNeutre, EVENT_WEIGHTS.lieu_inedit_visite);
    expect(apres.scoreExplorateur).toBeGreaterThan(50);
    expect(apres.scoreAccomplisseur).toBe(50);
  });

  it('ne laisse pas un seul événement bouleverser le profil', () => {
    const apres = applyEventToScores(profilNeutre, EVENT_WEIGHTS.lieu_inedit_visite);
    expect(apres.scoreExplorateur - 50).toBeLessThan(5);
  });

  it('déplace vraiment le profil quand le comportement se répète', () => {
    let scores = profilNeutre;
    for (let i = 0; i < 20; i += 1) {
      scores = applyEventToScores(scores, EVENT_WEIGHTS.lieu_inedit_visite);
    }
    expect(scores.scoreExplorateur).toBeGreaterThan(75);
  });

  it('fait baisser la dimension visée par un poids négatif', () => {
    const apres = applyEventToScores(profilNeutre, EVENT_WEIGHTS.mission_solo_terminee);
    expect(apres.scoreAccomplisseur).toBeGreaterThan(50);
    expect(apres.scoreSocialisateur).toBeLessThan(50);
  });

  it('garde toujours les scores entre 0 et 100', () => {
    let hauts: ArchetypeScores = {
      scoreExplorateur: 100,
      scoreAccomplisseur: 100,
      scoreCompetiteur: 100,
      scoreSocialisateur: 100,
    };
    let bas: ArchetypeScores = {
      scoreExplorateur: 0,
      scoreAccomplisseur: 0,
      scoreCompetiteur: 0,
      scoreSocialisateur: 0,
    };
    for (let i = 0; i < 100; i += 1) {
      hauts = applyEventToScores(hauts, EVENT_WEIGHTS.mission_competitive_terminee);
      bas = applyEventToScores(bas, EVENT_WEIGHTS.lieu_habituel_visite);
    }
    Object.values(hauts).forEach((v) => expect(v).toBeLessThanOrEqual(100));
    Object.values(bas).forEach((v) => expect(v).toBeGreaterThanOrEqual(0));
  });

  it('laisse le profil intact pour un événement seulement tracé (le don)', () => {
    const apres = applyEventToScores(profilNeutre, EVENT_WEIGHTS.don_effectue);
    expect(apres).toEqual(profilNeutre);
  });
});
