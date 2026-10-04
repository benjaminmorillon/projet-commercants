import {
  MULTIPLICATEUR_MAXIMUM,
  POUVOIRS,
  bonusMissionsDuJour,
  effetSurLaRecompense,
  etatDuPouvoir,
  finDEffetDepuis,
  peremptionDepuis,
  pouvoirDeNiveau,
  pouvoirDePalier,
  pouvoirParId,
  pouvoirsDuProfil,
  profilsOuvertsParPouvoir,
  tempsRestant,
  verdictUtilisation,
  zonesLeveesParPouvoir,
} from './pouvoirs';

const MIDI = new Date('2026-10-04T12:00:00Z');
const minutesApres = (n: number) => new Date(MIDI.getTime() + n * 60000);

function ligne(options: Partial<Parameters<typeof etatDuPouvoir>[0]> = {}) {
  return {
    pouvoirId: 'double-mise',
    perimeLe: minutesApres(60 * 24 * 7),
    utiliseLe: null,
    effetJusquA: null,
    ...options,
  };
}

describe('le catalogue', () => {
  it('a des identifiants uniques', () => {
    const ids = POUVOIRS.map((p) => p.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('couvre les quatre archétypes', () => {
    for (const profil of ['explorateur', 'accomplisseur', 'competiteur', 'socialisateur'] as const) {
      expect(pouvoirsDuProfil(profil).length).toBeGreaterThan(0);
    }
  });

  it('fait périmer tous les pouvoirs : aucun ne se garde indéfiniment', () => {
    // C'est LA règle qui fait sortir les gens. Un pouvoir éternel redeviendrait
    // un objet qu'on accumule.
    for (const pouvoir of POUVOIRS) {
      expect(pouvoir.peremptionJours).toBeGreaterThan(0);
    }
  });

  it('retrouve un pouvoir par son identifiant, et rien par un identifiant inconnu', () => {
    expect(pouvoirParId('double-mise')?.nom).toBe('Double mise');
    expect(pouvoirParId('téléportation')).toBeUndefined();
  });
});

describe('qui reçoit quoi', () => {
  it('donne à la montée de niveau un pouvoir du profil dominant', () => {
    expect(pouvoirDeNiveau('explorateur', 2).profil).toBe('explorateur');
    expect(pouvoirDeNiveau('competiteur', 2).profil).toBe('competiteur');
  });

  it('fait tourner les pouvoirs d’un profil qui en a plusieurs', () => {
    // L'accomplisseur en a deux : deux niveaux de suite ne donnent pas le même.
    const a = pouvoirDeNiveau('accomplisseur', 2);
    const b = pouvoirDeNiveau('accomplisseur', 3);
    expect(a.id).not.toBe(b.id);
  });

  it('donne toujours quelque chose, même au niveau 1', () => {
    expect(pouvoirDeNiveau('socialisateur', 1)).toBeDefined();
    expect(pouvoirDeNiveau('socialisateur', 0)).toBeDefined();
  });

  it('donne au palier un pouvoir de la voie, pas du joueur', () => {
    expect(pouvoirDePalier('explorateur', 1)?.profil).toBe('explorateur');
  });

  it('ne donne rien pour le tronc commun', () => {
    // Le tronc est « mixte » : il n'a pas d'archétype à récompenser, et on ne
    // paie pas deux fois la même progression.
    expect(pouvoirDePalier('mixte', 1)).toBeUndefined();
  });
});

describe('l’état d’un pouvoir', () => {
  it('est disponible tant qu’il n’est ni utilisé ni périmé', () => {
    expect(etatDuPouvoir(ligne(), MIDI)).toBe('disponible');
  });

  it('devient périmé à l’échéance, pas une minute avant', () => {
    const l = ligne({ perimeLe: minutesApres(10) });
    expect(etatDuPouvoir(l, minutesApres(9))).toBe('disponible');
    expect(etatDuPouvoir(l, minutesApres(10))).toBe('perime');
  });

  it('est actif pendant son effet, épuisé après', () => {
    const l = ligne({ utiliseLe: MIDI, effetJusquA: minutesApres(120) });
    expect(etatDuPouvoir(l, minutesApres(119))).toBe('actif');
    expect(etatDuPouvoir(l, minutesApres(120))).toBe('epuise');
  });

  it('reste épuisé même si la péremption est passée : utilisé l’emporte', () => {
    // Sinon un pouvoir consommé réapparaîtrait comme « périmé », donc comme
    // quelque chose qu'on aurait raté — alors qu'on s'en est servi.
    const l = ligne({ utiliseLe: MIDI, effetJusquA: minutesApres(10), perimeLe: minutesApres(5) });
    expect(etatDuPouvoir(l, minutesApres(60))).toBe('epuise');
  });
});

describe('le verdict d’utilisation', () => {
  const definition = pouvoirParId('double-mise')!;
  const visionLointaine = pouvoirParId('vision-lointaine')!;
  const leverLeVoile = pouvoirParId('lever-le-voile')!;

  it('laisse passer un pouvoir disponible sans cible à désigner', () => {
    expect(
      verdictUtilisation({ ligne: ligne(), definition, cibleFournie: null, maintenant: MIDI }),
    ).toEqual({ ok: true });
  });

  it('refuse un pouvoir périmé, et le dit sans culpabiliser', () => {
    const verdict = verdictUtilisation({
      ligne: ligne({ perimeLe: minutesApres(-1) }),
      definition,
      cibleFournie: null,
      maintenant: MIDI,
    });
    expect(verdict).toMatchObject({ ok: false, code: 'perime' });
  });

  it('refuse un pouvoir déjà consommé', () => {
    expect(
      verdictUtilisation({
        ligne: ligne({ utiliseLe: minutesApres(-200), effetJusquA: minutesApres(-100) }),
        definition,
        cibleFournie: null,
        maintenant: MIDI,
      }),
    ).toMatchObject({ ok: false, code: 'deja_utilise' });
  });

  it('refuse de relancer un pouvoir déjà en cours', () => {
    expect(
      verdictUtilisation({
        ligne: ligne({ utiliseLe: MIDI, effetJusquA: minutesApres(60) }),
        definition,
        cibleFournie: null,
        maintenant: minutesApres(10),
      }),
    ).toMatchObject({ ok: false, code: 'deja_actif' });
  });

  it('réclame un quartier pour Vision lointaine, et un joueur pour Lever le voile', () => {
    const sansZone = verdictUtilisation({
      ligne: ligne({ pouvoirId: 'vision-lointaine' }),
      definition: visionLointaine,
      cibleFournie: null,
      maintenant: MIDI,
    });
    expect(sansZone).toMatchObject({ ok: false, code: 'cible_manquante' });
    if (!sansZone.ok) expect(sansZone.raison).toContain('quartier');

    const sansJoueur = verdictUtilisation({
      ligne: ligne({ pouvoirId: 'lever-le-voile' }),
      definition: leverLeVoile,
      cibleFournie: null,
      maintenant: MIDI,
    });
    if (!sansJoueur.ok) expect(sansJoueur.raison).toContain('joueur');
  });

  it('accepte quand la cible est fournie', () => {
    expect(
      verdictUtilisation({
        ligne: ligne({ pouvoirId: 'vision-lointaine' }),
        definition: visionLointaine,
        cibleFournie: '47.21,-1.55',
        maintenant: MIDI,
      }),
    ).toEqual({ ok: true });
  });
});

describe('l’effet sur la récompense', () => {
  it('ne change rien sans pouvoir actif', () => {
    expect(effetSurLaRecompense([], { lieuEnBonus: true })).toEqual({
      multiplicateur: 1,
      consommes: [],
    });
  });

  it('double avec Double mise, et le consomme', () => {
    expect(
      effetSurLaRecompense([{ pouvoirId: 'double-mise', cible: null }], { lieuEnBonus: false }),
    ).toEqual({ multiplicateur: 2, consommes: ['double-mise'] });
  });

  it('n’applique Chasseur de prime que dans un lieu en bonus', () => {
    const actifs = [{ pouvoirId: 'chasseur-de-prime', cible: null }];
    expect(effetSurLaRecompense(actifs, { lieuEnBonus: false }).multiplicateur).toBe(1);
    expect(effetSurLaRecompense(actifs, { lieuEnBonus: true }).multiplicateur).toBe(1.5);
  });

  it('ne consomme jamais Chasseur de prime : c’est une fenêtre, pas une cartouche', () => {
    expect(
      effetSurLaRecompense([{ pouvoirId: 'chasseur-de-prime', cible: null }], { lieuEnBonus: true })
        .consommes,
    ).toEqual([]);
  });

  it('plafonne le cumul', () => {
    // Deux Double mise et un Chasseur de prime donneraient ×6 : le registre de
    // jetons encaisserait une facture qu'aucun commerçant n'a prévue.
    const actifs = [
      { pouvoirId: 'double-mise', cible: null },
      { pouvoirId: 'double-mise', cible: null },
      { pouvoirId: 'chasseur-de-prime', cible: null },
    ];
    expect(effetSurLaRecompense(actifs, { lieuEnBonus: true }).multiplicateur).toBe(
      MULTIPLICATEUR_MAXIMUM,
    );
  });
});

describe('les autres effets', () => {
  it('compte les missions supplémentaires du jour', () => {
    expect(bonusMissionsDuJour([])).toBe(0);
    expect(
      bonusMissionsDuJour([
        { pouvoirId: 'second-souffle', cible: null },
        { pouvoirId: 'double-mise', cible: null },
        { pouvoirId: 'second-souffle', cible: null },
      ]),
    ).toBe(2);
  });

  it('liste les quartiers levés, en ignorant ceux sans cible', () => {
    expect(
      zonesLeveesParPouvoir([
        { pouvoirId: 'vision-lointaine', cible: '47.21,-1.55' },
        { pouvoirId: 'vision-lointaine', cible: null },
        { pouvoirId: 'double-mise', cible: null },
      ]),
    ).toEqual(['47.21,-1.55']);
  });

  it('liste les profils ouverts', () => {
    expect(
      profilsOuvertsParPouvoir([{ pouvoirId: 'lever-le-voile', cible: 'joueur-7' }]),
    ).toEqual(['joueur-7']);
  });
});

describe('le temps qui reste', () => {
  it('dit les minutes, les heures puis les jours', () => {
    expect(tempsRestant(minutesApres(8), MIDI)).toBe('8 min');
    expect(tempsRestant(minutesApres(135), MIDI)).toBe('2 h 15');
    expect(tempsRestant(minutesApres(120), MIDI)).toBe('2 h');
    expect(tempsRestant(minutesApres(60 * 24 * 3), MIDI)).toBe('3 jours');
    expect(tempsRestant(minutesApres(60 * 25), MIDI)).toBe('1 jour');
  });

  it('dit « expiré » plutôt qu’un nombre négatif', () => {
    expect(tempsRestant(minutesApres(-5), MIDI)).toBe('expiré');
    expect(tempsRestant(MIDI, MIDI)).toBe('expiré');
  });
});

describe('les échéances', () => {
  it('pose la péremption à la bonne distance', () => {
    const definition = pouvoirParId('double-mise')!;
    const perime = peremptionDepuis(definition, MIDI);
    expect(perime.getTime() - MIDI.getTime()).toBe(definition.peremptionJours * 24 * 3600 * 1000);
  });

  it('pose la fin d’effet à la bonne distance', () => {
    const definition = pouvoirParId('vision-lointaine')!;
    const fin = finDEffetDepuis(definition, MIDI);
    expect(fin.getTime() - MIDI.getTime()).toBe(definition.dureeEffetMinutes * 60 * 1000);
  });
});
