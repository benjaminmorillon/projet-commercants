import { readFileSync } from 'fs';
import { join } from 'path';
import {
  Arbre,
  MissionDeLArbre,
  VOIES,
  construireArbre,
  decouperEnPaliers,
  effortDe,
  etapesPrecedentes,
  multiplicateurDePalier,
  niveauRequisPourVoie,
  ordonner,
  palierDeLaMission,
  recompenseDuPalier,
  voieDeLArchetype,
  voiesParAffinite,
} from './arbre';
import { MissionsCatalogue } from './missions-catalogue.types';

// --- Fabriques ------------------------------------------------------------

function mission(
  id: string,
  options: Partial<MissionDeLArbre> = {},
): MissionDeLArbre {
  return {
    id,
    titre: `Mission ${id}`,
    theme: 'culture',
    archetypeDominant: 'explorateur',
    duree: 'courte',
    modeInteraction: 'solo',
    recompenseBase: 2,
    parcoursId: null,
    etape: null,
    ...options,
  };
}

const CURIEUX = {
  scoreExplorateur: 80,
  scoreAccomplisseur: 60,
  scoreCompetiteur: 40,
  scoreSocialisateur: 20,
};

function voie(arbre: Arbre, id: string) {
  const trouvee = arbre.voies.find((v) => v.id === id);
  if (!trouvee) throw new Error(`voie ${id} absente de l'arbre`);
  return trouvee;
}

// --- L'effort -------------------------------------------------------------

describe("l'effort demandé par une mission", () => {
  it('va de 1 (courte, seul) à 5 (longue, en groupe)', () => {
    expect(effortDe(mission('a', { duree: 'courte', modeInteraction: 'solo' }))).toBe(1);
    expect(effortDe(mission('b', { duree: 'longue', modeInteraction: 'groupe' }))).toBe(5);
  });

  it('compte un duo comme plus engageant qu’un solo, à durée égale', () => {
    const solo = mission('a', { duree: 'moyenne', modeInteraction: 'solo' });
    const duo = mission('b', {
      duree: 'moyenne',
      modeInteraction: 'duo_affinite_naturelle',
    });
    expect(effortDe(duo)).toBeGreaterThan(effortDe(solo));
  });

  it('ne casse pas sur une valeur inconnue', () => {
    expect(effortDe(mission('a', { duree: 'éternelle', modeInteraction: 'télépathie' }))).toBe(1);
  });
});

// --- Le rangement ---------------------------------------------------------

describe('le rangement des missions', () => {
  it('envoie les missions mixtes dans le tronc commun', () => {
    expect(voieDeLArchetype('mixte').id).toBe('tronc');
  });

  it('range une mission d’archétype inconnu dans le tronc plutôt que nulle part', () => {
    expect(voieDeLArchetype('licorne').id).toBe('tronc');
  });

  it('ordonne par effort croissant', () => {
    const rangees = ordonner([
      mission('longue', { duree: 'longue', modeInteraction: 'groupe' }),
      mission('courte', { duree: 'courte', modeInteraction: 'solo' }),
      mission('moyenne', { duree: 'moyenne', modeInteraction: 'solo' }),
    ]);
    expect(rangees.map((m) => m.id)).toEqual(['courte', 'moyenne', 'longue']);
  });

  it('donne toujours le même ordre à effort égal', () => {
    const memes = [mission('z'), mission('a'), mission('m')];
    expect(ordonner(memes).map((m) => m.id)).toEqual(['a', 'm', 'z']);
    expect(ordonner([...memes].reverse()).map((m) => m.id)).toEqual(['a', 'm', 'z']);
  });

  it('découpe en paliers de la taille demandée', () => {
    const sept = Array.from({ length: 7 }, (_, i) => mission(`m${i}`));
    expect(decouperEnPaliers(sept, 3).map((p) => p.length)).toEqual([3, 3, 1]);
  });
});

// --- Le profil ------------------------------------------------------------

describe('l’ordre d’ouverture des voies', () => {
  it('met la voie du style dominant en premier', () => {
    expect(voiesParAffinite(CURIEUX).map((v) => v.id)).toEqual([
      'explorateur',
      'accomplisseur',
      'competiteur',
      'socialisateur',
    ]);
  });

  it('garde un ordre stable quand le questionnaire n’a pas été fait', () => {
    const vierge = {
      scoreExplorateur: 0,
      scoreAccomplisseur: 0,
      scoreCompetiteur: 0,
      scoreSocialisateur: 0,
    };
    expect(voiesParAffinite(vierge).map((v) => v.id)).toEqual(
      voiesParAffinite(vierge).map((v) => v.id),
    );
    expect(voiesParAffinite(vierge)).toHaveLength(4);
  });

  it('ouvre la voie dominante dès le niveau 1, puis une par niveau', () => {
    expect(niveauRequisPourVoie(1)).toBe(1);
    expect(niveauRequisPourVoie(2)).toBe(2);
    expect(niveauRequisPourVoie(4)).toBe(4);
  });
});

// --- La récompense --------------------------------------------------------

describe('la récompense qui monte avec le palier', () => {
  it('ne change rien au premier palier', () => {
    expect(multiplicateurDePalier(1)).toBe(1);
    expect(recompenseDuPalier(3, 1)).toBe(3);
  });

  it('ajoute le bonus à chaque palier franchi', () => {
    expect(multiplicateurDePalier(3, 0.15, 0.75)).toBeCloseTo(1.3);
    expect(recompenseDuPalier(4, 3, 0.15, 0.75)).toBe(5.2);
  });

  it('plafonne le bonus pour qu’un palier lointain ne s’emballe pas', () => {
    expect(multiplicateurDePalier(20, 0.15, 0.75)).toBe(1.75);
  });

  it('arrondit au centime', () => {
    expect(recompenseDuPalier(1.5, 2, 0.15, 0.75)).toBe(1.73);
  });
});

// --- L'arbre d'un joueur --------------------------------------------------

describe('l’arbre d’un joueur', () => {
  const catalogue: MissionDeLArbre[] = [
    // Tronc commun : un parcours en 3 étapes.
    mission('T1', { archetypeDominant: 'mixte', parcoursId: 'PAR', etape: 1 }),
    mission('T2', { archetypeDominant: 'mixte', parcoursId: 'PAR', etape: 2 }),
    mission('T3', { archetypeDominant: 'mixte', parcoursId: 'PAR', etape: 3 }),
    // Voie explorateur : 4 missions, donc 2 paliers de 3 + 1.
    mission('E1', { duree: 'courte' }),
    mission('E2', { duree: 'courte' }),
    mission('E3', { duree: 'moyenne' }),
    mission('E4', { duree: 'longue', modeInteraction: 'groupe' }),
    // Une mission dans une voie que ce joueur n'a pas encore ouverte.
    mission('S1', { archetypeDominant: 'socialisateur' }),
  ];

  function arbrePour(accomplies: string[], niveau = 1): Arbre {
    return construireArbre({
      missions: catalogue,
      accomplies,
      scores: CURIEUX,
      niveau,
    });
  }

  it('ouvre le tronc commun et la voie dominante dès le départ', () => {
    const arbre = arbrePour([]);
    expect(voie(arbre, 'tronc').ouverte).toBe(true);
    expect(voie(arbre, 'explorateur').ouverte).toBe(true);
  });

  it('garde les autres voies fermées et dit ce qu’il faut pour les ouvrir', () => {
    const arbre = arbrePour([]);
    const liant = voie(arbre, 'socialisateur');
    expect(liant.ouverte).toBe(false);
    expect(liant.niveauRequis).toBe(4);
    expect(liant.condition).toContain('niveau 4');
    expect(liant.paliers[0].noeuds[0].etat).toBe('verrouillee');
  });

  it('ouvre une voie de plus à chaque niveau gagné', () => {
    expect(voie(arbrePour([], 2), 'accomplisseur').ouverte).toBe(true);
    expect(voie(arbrePour([], 2), 'competiteur').ouverte).toBe(false);
    expect(voie(arbrePour([], 4), 'socialisateur').ouverte).toBe(true);
  });

  it('n’ouvre que le premier palier d’une voie ouverte', () => {
    const curieux = voie(arbrePour([]), 'explorateur');
    expect(curieux.paliers.map((p) => p.ouvert)).toEqual([true, false]);
    expect(curieux.paliers[1].condition).toContain('Découverte');
  });

  it('ouvre le palier suivant quand assez de missions du précédent sont faites', () => {
    expect(voie(arbrePour(['E1']), 'explorateur').paliers[1].ouvert).toBe(false);
    expect(voie(arbrePour(['E1', 'E2']), 'explorateur').paliers[1].ouvert).toBe(true);
  });

  it('n’exige jamais d’un dernier palier incomplet plus de missions qu’il n’en contient', () => {
    const dernier = voie(arbrePour(['E1', 'E2']), 'explorateur').paliers[1];
    expect(dernier.total).toBe(1);
    expect(dernier.requises).toBe(1);
  });

  it('respecte l’ordre des étapes d’un parcours', () => {
    const debut = voie(arbrePour([]), 'tronc').paliers[0];
    expect(debut.noeuds.map((n) => n.etat)).toEqual(['ouverte', 'a_venir', 'a_venir']);
    expect(debut.noeuds[1].condition).toContain('Mission T1');

    const apres = voie(arbrePour(['T1']), 'tronc').paliers[0];
    expect(apres.noeuds.map((n) => n.etat)).toEqual(['accomplie', 'ouverte', 'a_venir']);
  });

  it('ne referme jamais une voie déjà entamée, même si le profil bascule', () => {
    // Le profil est vivant : accomplir une mission d'exploration peut faire
    // passer un autre style devant. La voie entamée doit rester ouverte,
    // sinon le joueur perd l'accès à ce qu'il venait de commencer.
    const devenuLiant = {
      scoreExplorateur: 20,
      scoreAccomplisseur: 40,
      scoreCompetiteur: 60,
      scoreSocialisateur: 80,
    };
    const arbre = construireArbre({
      missions: catalogue,
      accomplies: ['E1'],
      scores: devenuLiant,
      niveau: 1,
    });

    const curieux = voie(arbre, 'explorateur');
    expect(curieux.rang).toBe(4);
    expect(curieux.ouverte).toBe(true);
    expect(curieux.paliers[0].noeuds[1].etat).toBe('ouverte');
  });

  it('marque les missions accomplies et compte la progression', () => {
    const arbre = arbrePour(['E1', 'T1']);
    expect(arbre.total).toBe(8);
    expect(arbre.accomplies).toBe(2);
    expect(voie(arbre, 'explorateur').accomplies).toBe(1);
  });

  it('affiche la récompense réelle du palier, pas la récompense de base', () => {
    const curieux = voie(arbrePour(['E1', 'E2']), 'explorateur');
    expect(curieux.paliers[0].noeuds[0].recompense).toBe(2);
    expect(curieux.paliers[1].noeuds[0].recompense).toBe(2.3);
  });

  it('annonce la même récompense que celle qui sera créditée', () => {
    const curieux = voie(arbrePour([]), 'explorateur');
    for (const palier of curieux.paliers) {
      for (const noeud of palier.noeuds) {
        expect(palierDeLaMission(noeud.missionId, catalogue)).toBe(palier.numero);
        expect(noeud.recompense).toBe(
          recompenseDuPalier(noeud.recompenseBase, palier.numero),
        );
      }
    }
  });

  it('retombe sur une récompense inchangée si la mission est inconnue', () => {
    expect(palierDeLaMission('fantome', catalogue)).toBe(1);
  });

  it('suit les réglages du back-office', () => {
    const large = construireArbre({
      missions: catalogue,
      accomplies: [],
      scores: CURIEUX,
      niveau: 1,
      reglages: { taillePalier: 4, niveauParVoie: 0 },
    });
    expect(voie(large, 'explorateur').paliers).toHaveLength(1);
    expect(voie(large, 'socialisateur').ouverte).toBe(true);
  });
});

// --- Le vrai catalogue ----------------------------------------------------

describe('le catalogue de départ', () => {
  const catalogue = JSON.parse(
    readFileSync(join(__dirname, '..', '..', '..', 'docs', 'missions-catalogue.json'), 'utf-8'),
  ) as MissionsCatalogue;

  const missions: MissionDeLArbre[] = catalogue.missions.map((m) => ({
    id: m.id,
    titre: m.titre,
    theme: m.theme,
    archetypeDominant: m.archetype_dominant,
    duree: m.duree,
    modeInteraction: m.mode_interaction,
    recompenseBase: m.recompense_base,
    parcoursId: m.parcours_id ?? null,
    etape: m.etape ?? null,
  }));

  it('place chaque mission du catalogue dans une voie, sans en perdre', () => {
    const arbre = construireArbre({
      missions,
      accomplies: [],
      scores: CURIEUX,
      niveau: 1,
    });
    expect(arbre.total).toBe(missions.length);
  });

  it('laisse toujours de quoi jouer à un joueur qui débute', () => {
    for (const dominante of VOIES.filter((v) => v.id !== 'tronc')) {
      const scores = {
        scoreExplorateur: 0,
        scoreAccomplisseur: 0,
        scoreCompetiteur: 0,
        scoreSocialisateur: 0,
      };
      scores[`score${dominante.id[0].toUpperCase()}${dominante.id.slice(1)}` as keyof typeof scores] = 90;

      const arbre = construireArbre({ missions, accomplies: [], scores, niveau: 1 });
      const ouvertes = arbre.voies
        .flatMap((v) => v.paliers)
        .flatMap((p) => p.noeuds)
        .filter((n) => n.etat === 'ouverte');
      expect(ouvertes.length).toBeGreaterThan(0);
    }
  });

  it('chaîne bien les trois parcours du catalogue', () => {
    const precedente = etapesPrecedentes(missions);
    expect(precedente.get('PAR1-02')?.id).toBe('PAR1-01');
    expect(precedente.get('PAR1-03')?.id).toBe('PAR1-02');
    expect(precedente.has('PAR1-01')).toBe(false);
  });
});
