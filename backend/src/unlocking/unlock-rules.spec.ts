import {
  cleZone,
  conditionDe,
  estOuverte,
  ETAPES_TUTORIEL,
  EtatJoueur,
  limiteMissionsParJour,
  MISSIONS_JOUR_MAX,
  tutorielTermine,
  xpDecouverteZone,
  zonesVoisines,
} from './unlock-rules';

const debutant: EtatJoueur = {
  questionnaireComplete: false,
  missionsAccomplies: 0,
  missionsSoloAccomplies: 0,
  checkinsEffectues: 0,
  niveau: 1,
};

describe('tutoriel', () => {
  it('compte 3 étapes, toutes à faire au démarrage', () => {
    expect(ETAPES_TUTORIEL).toHaveLength(3);
    expect(ETAPES_TUTORIEL.every((e) => !e.estFaite(debutant))).toBe(true);
    expect(tutorielTermine(debutant)).toBe(false);
  });

  it("n'est terminé que quand les 3 étapes le sont", () => {
    const presque: EtatJoueur = {
      ...debutant,
      questionnaireComplete: true,
      missionsAccomplies: 1,
    };
    expect(tutorielTermine(presque)).toBe(false);
    expect(tutorielTermine({ ...presque, checkinsEffectues: 1 })).toBe(true);
  });
});

describe('fonctionnalités', () => {
  it('tout est fermé pour un joueur qui vient de s’inscrire', () => {
    expect(estOuverte('mode_libre', debutant)).toBe(false);
    expect(estOuverte('profils_joueurs', debutant)).toBe(false);
    expect(estOuverte('duos', debutant)).toBe(false);
    expect(estOuverte('don', debutant)).toBe(false);
  });

  it('le profil des autres joueurs s’ouvre dès la première mission', () => {
    expect(estOuverte('profils_joueurs', { ...debutant, missionsAccomplies: 1 })).toBe(true);
  });

  it('les duos demandent le questionnaire ET 3 missions solo', () => {
    const troisSolos: EtatJoueur = { ...debutant, missionsSoloAccomplies: 3 };
    expect(estOuverte('duos', troisSolos)).toBe(false);
    expect(estOuverte('duos', { ...troisSolos, questionnaireComplete: true })).toBe(true);
  });

  it('le don demande le niveau 2', () => {
    expect(estOuverte('don', { ...debutant, niveau: 2 })).toBe(true);
  });

  it('explique en clair ce qu’il reste à faire', () => {
    expect(conditionDe('don')).toContain('niveau 2');
  });
});

describe('limite de missions par jour', () => {
  it('démarre à 3 et gagne une mission par niveau', () => {
    expect(limiteMissionsParJour(1)).toBe(3);
    expect(limiteMissionsParJour(2)).toBe(4);
    expect(limiteMissionsParJour(5)).toBe(7);
  });

  it('plafonne pour ne pas devenir illimitée', () => {
    expect(limiteMissionsParJour(50)).toBe(MISSIONS_JOUR_MAX);
  });
});

describe('zones de la carte', () => {
  it('deux points du même quartier tombent dans la même zone', () => {
    expect(cleZone(48.8592, 2.3639)).toBe(cleZone(48.8595, 2.3645));
  });

  it('deux quartiers éloignés tombent dans des zones différentes', () => {
    expect(cleZone(48.8592, 2.3639)).not.toBe(cleZone(48.8531, 2.3755));
  });

  it('gère les coordonnées négatives sans trou dans le quadrillage', () => {
    expect(cleZone(-33.8688, 151.2093)).toBe(cleZone(-33.8671, 151.2098));
    // Le quadrillage ne doit pas se replier de part et d'autre de l'équateur.
    expect(cleZone(-0.002, 0.002)).not.toBe(cleZone(0.002, 0.002));
  });

  it('voit sa propre zone et les 8 voisines', () => {
    const voisines = zonesVoisines(48.8592, 2.3639);
    expect(voisines).toHaveLength(9);
    expect(voisines).toContain(cleZone(48.8592, 2.3639));
    expect(new Set(voisines).size).toBe(9);
  });

  it('récompense davantage la découverte d’une zone sous-fréquentée', () => {
    expect(xpDecouverteZone(1)).toBe(40);
    expect(xpDecouverteZone(1.1)).toBeGreaterThan(xpDecouverteZone(1));
    expect(xpDecouverteZone(0.7)).toBeLessThan(xpDecouverteZone(1));
  });
});
