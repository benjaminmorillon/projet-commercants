import { computeInitialArchetypeScores } from './archetype-scoring';

describe('computeInitialArchetypeScores', () => {
  it('donne un score maximal sur les 4 archétypes quand tous les sliders pointent vers eux', () => {
    const scores = computeInitialArchetypeScores({
      decouverteHabitude: 0,
      competitionCooperation: 100,
      seulGroupe: 100,
      objectifImprovisation: 100,
    });

    expect(scores).toEqual({
      scoreExplorateur: 100,
      scoreAccomplisseur: 0,
      scoreCompetiteur: 0,
      scoreSocialisateur: 100,
    });
  });

  it('donne 50 partout quand tous les sliders sont au milieu', () => {
    const scores = computeInitialArchetypeScores({
      decouverteHabitude: 50,
      competitionCooperation: 50,
      seulGroupe: 50,
      objectifImprovisation: 50,
    });

    expect(scores).toEqual({
      scoreExplorateur: 50,
      scoreAccomplisseur: 50,
      scoreCompetiteur: 50,
      scoreSocialisateur: 50,
    });
  });

  it("favorise l'accomplisseur et le compétiteur pour un joueur d'habitude, seul et cadré", () => {
    const scores = computeInitialArchetypeScores({
      decouverteHabitude: 100,
      competitionCooperation: 0,
      seulGroupe: 0,
      objectifImprovisation: 0,
    });

    expect(scores).toEqual({
      scoreExplorateur: 0,
      scoreAccomplisseur: 100,
      scoreCompetiteur: 100,
      scoreSocialisateur: 0,
    });
  });
});
