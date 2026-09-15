// ---------------------------------------------------------------------------
// Annoncer une offre à ses clients.
//
// Le commerçant a une liste de gens qui sont réellement passés chez lui —
// constituée code après code scanné. Il peut leur adresser une offre
// directement, sans payer de ciblage : ce sont ses clients.
//
// C'est aussi le moment le plus dangereux du produit. Une notification
// poussée sur le téléphone de quelqu'un qui a simplement bu un café quelque
// part est un privilège fragile : deux de trop et l'application se fait
// désinstaller, ou pire, couper les notifications — et tout le reste du jeu
// tombe avec.
//
// D'où ces règles, qui limitent volontairement ce que le commerçant peut
// faire :
//   - une offre ne s'annonce qu'UNE FOIS. S'il veut réannoncer, il publie
//     une nouvelle offre ;
//   - un commerce ne peut pas annoncer deux fois dans la même période, toutes
//     offres confondues ;
//   - on n'annonce pas une offre déjà terminée, ni à une liste vide.
//
// Tout est pur : le service fournit l'état, ces fonctions décident.
// ---------------------------------------------------------------------------

/** Valeur de repli : ce qui s'applique tant que le back-office n'a rien changé. */
export const DELAI_ENTRE_ANNONCES_JOURS = 7;

export interface ContexteAnnonce {
  /** L'offre est-elle active, dans sa période, et avec du budget ? */
  offreEnCours: boolean;
  /** Cette offre a-t-elle déjà été annoncée ? */
  dejaAnnoncee: boolean;
  /**
   * Depuis combien de jours ce commerce a-t-il annoncé quelque chose, toutes
   * offres confondues. `null` s'il n'a jamais rien annoncé.
   */
  joursDepuisDerniereAnnonce: number | null;
  delaiMinimalJours: number;
  nombreDeClients: number;
}

export type RefusAnnonce =
  | 'offre_terminee'
  | 'deja_annoncee'
  | 'trop_tot'
  | 'aucun_client';

export type VerdictAnnonce =
  | { possible: true }
  | { possible: false; code: RefusAnnonce; raison: string };

export function verdictDAnnonce(contexte: ContexteAnnonce): VerdictAnnonce {
  if (!contexte.offreEnCours) {
    return {
      possible: false,
      code: 'offre_terminee',
      raison:
        "Cette offre n'est pas en cours : elle est suspendue, hors de sa période, ou son budget est épuisé.",
    };
  }

  if (contexte.dejaAnnoncee) {
    return {
      possible: false,
      code: 'deja_annoncee',
      raison:
        'Tu as déjà annoncé cette offre à tes clients. Pour leur reparler, publie une nouvelle offre.',
    };
  }

  if (contexte.nombreDeClients === 0) {
    return {
      possible: false,
      code: 'aucun_client',
      raison:
        "Personne n'a encore fait scanner son code chez toi : tu n'as pas encore de clients à prévenir.",
    };
  }

  if (
    contexte.joursDepuisDerniereAnnonce !== null &&
    contexte.joursDepuisDerniereAnnonce < contexte.delaiMinimalJours
  ) {
    const reste = contexte.delaiMinimalJours - contexte.joursDepuisDerniereAnnonce;
    // « il y a 0 jour » ne veut rien dire : le premier jour se dit
    // « aujourd'hui », et ça arrive tout le temps — c'est justement le cas
    // du commerçant qui vient de publier deux offres d'affilée.
    const quand =
      contexte.joursDepuisDerniereAnnonce === 0
        ? "aujourd'hui"
        : `il y a ${contexte.joursDepuisDerniereAnnonce} jour${contexte.joursDepuisDerniereAnnonce > 1 ? 's' : ''}`;
    return {
      possible: false,
      code: 'trop_tot',
      raison: `Tu as déjà prévenu tes clients ${quand}. Tu pourras recommencer dans ${reste} jour${reste > 1 ? 's' : ''}.`,
    };
  }

  return { possible: true };
}

/**
 * Ce qu'on écrit SUR le bouton.
 *
 * Court, et jamais alarmant : « clients déjà prévenus » est un état normal,
 * pas une erreur. La phrase longue de `raison` sert quand le commerçant
 * essaie quand même — là, il faut lui expliquer.
 *
 * Un bouton qui refuse une fois sur deux sans rien annoncer est un mauvais
 * bouton : l'état s'affiche d'avance.
 */
export function libelleDisponibilite(verdict: VerdictAnnonce, nombreDeClients: number): string {
  if (verdict.possible) {
    return nombreDeClients === 1
      ? 'Prévenir ton client'
      : `Prévenir tes ${nombreDeClients} clients`;
  }

  const LIBELLES: Record<RefusAnnonce, string> = {
    deja_annoncee: 'Clients déjà prévenus',
    trop_tot: 'Trop tôt pour les reprévenir',
    aucun_client: 'Aucun client à prévenir',
    offre_terminee: "Offre pas en cours",
  };
  return LIBELLES[verdict.code];
}
