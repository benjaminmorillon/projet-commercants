import {
  DUREE_BLOCAGE_MS,
  enregistrerEchec,
  essaisRestants,
  etatVide,
  FENETRE_MS,
  MAX_ECHECS,
  reinitialiser,
  verifier,
} from './rate-limit';

const T0 = 1_000_000_000_000;

// Tous les échecs au même instant : sinon le décalage entre le premier et
// le dernier fausserait les calculs de fenêtre dans les assertions.
function echouer(fois: number, quand = T0) {
  let etat = etatVide();
  for (let i = 0; i < fois; i += 1) {
    etat = enregistrerEchec(etat, quand);
  }
  return etat;
}

describe('limitation des tentatives', () => {
  it('laisse passer tant qu’on est en dessous du seuil', () => {
    const etat = echouer(MAX_ECHECS - 1);
    expect(verifier(etat, T0).bloque).toBe(false);
    expect(essaisRestants(etat, T0)).toBe(1);
  });

  it('bloque au énième échec', () => {
    const etat = echouer(MAX_ECHECS);
    const verdict = verifier(etat, T0);
    expect(verdict.bloque).toBe(true);
    expect(verdict.secondesRestantes).toBeGreaterThan(0);
    expect(essaisRestants(etat, T0)).toBe(0);
  });

  it('rouvre la porte une fois le blocage écoulé', () => {
    const etat = echouer(MAX_ECHECS);
    expect(verifier(etat, T0 + DUREE_BLOCAGE_MS + 1).bloque).toBe(false);
  });

  it('oublie les échecs trop anciens', () => {
    // Quatre échecs il y a longtemps, un maintenant : ça ne fait pas cinq.
    let etat = echouer(MAX_ECHECS - 1, T0);
    const plusTard = T0 + FENETRE_MS + 1000;
    etat = enregistrerEchec(etat, plusTard);
    expect(verifier(etat, plusTard).bloque).toBe(false);
    expect(essaisRestants(etat, plusTard)).toBe(MAX_ECHECS - 1);
  });

  it('ne punit pas deux fois les mêmes échecs', () => {
    // Après un blocage purgé, un seul nouvel échec ne doit pas rebloquer.
    let etat = echouer(MAX_ECHECS);
    const apres = T0 + DUREE_BLOCAGE_MS + 1;
    etat = enregistrerEchec(etat, apres);
    expect(verifier(etat, apres).bloque).toBe(false);
    expect(essaisRestants(etat, apres)).toBe(MAX_ECHECS - 1);
  });

  it('efface tout après une connexion réussie', () => {
    expect(verifier(reinitialiser(), T0).bloque).toBe(false);
    expect(essaisRestants(reinitialiser(), T0)).toBe(MAX_ECHECS);
  });
});
