// ---------------------------------------------------------------------------
// Qui est payé pour avoir ouvert une publicité, et qui ne l'est pas.
//
// Le principe qui gouverne tout le reste : UN COMMERÇANT NE DOIT JAMAIS PAYER
// POUR UNE FAUSSE VUE. Le jour où il paie pour des robots, il s'en va — et il
// a raison.
//
// D'où une règle de conduite : une publicité s'affiche toujours (rien ne
// justifie de la cacher), mais l'argent ne bouge que si l'ouverture est
// crédible. Quand elle ne l'est pas, personne n'est payé et personne n'est
// facturé. Le joueur le sait, la raison lui est dite.
//
// Fonction pure : elle ne connaît ni la base ni le réseau, seulement un état
// de fait. C'est ce qui permet de la tester cas par cas.
// ---------------------------------------------------------------------------

export interface ContexteOuverture {
  /** La publicité est-elle dans sa période, active, et a-t-elle du budget ? */
  publiciteEnCours: boolean;
  /** Ce qu'il reste au budget de la publicité. */
  budgetRestant: number;
  /** Ce que cette ouverture coûterait au commerçant. */
  coutDeLOuverture: number;
  /** Ce joueur a-t-il déjà été payé pour CETTE publicité ? */
  dejaPaye: boolean;
  /** Combien d'ouvertures lui ont déjà été payées aujourd'hui. */
  ouverturesPayeesAujourdhui: number;
  /** Le plafond quotidien réglé dans le back-office. */
  plafondQuotidien: number;
  /**
   * Nombre de jours depuis sa dernière visite validée dans un commerce.
   * `null` s'il n'en a jamais fait.
   */
  joursDepuisDerniereVisite: number | null;
  /** L'ancienneté maximale acceptée, réglée dans le back-office. */
  ancienneteVisiteMaximale: number;
  /** Le joueur est-il le commerçant qui a publié cette annonce ? */
  estSonPropreCommerce: boolean;
}

export type Verdict =
  | { paye: true }
  | { paye: false; code: string; raison: string };

/**
 * Cinq conditions, dans l'ordre où elles comptent.
 *
 * L'ordre n'est pas indifférent : on veut dire au joueur la raison la plus
 * utile. « Cette publicité est terminée » est plus parlant que « tu as atteint
 * ton plafond du jour » quand les deux sont vrais.
 */
export function verdictDePaiement(contexte: ContexteOuverture): Verdict {
  if (!contexte.publiciteEnCours) {
    return {
      paye: false,
      code: 'terminee',
      raison: "Cette offre n'est plus en cours : elle reste consultable, mais ne rapporte plus rien.",
    };
  }

  if (contexte.budgetRestant < contexte.coutDeLOuverture) {
    return {
      paye: false,
      code: 'budget_epuise',
      raison: "Le budget de cette offre est épuisé pour le moment. Elle reste consultable.",
    };
  }

  // Un commerçant qui ouvrirait sa propre publicité se paierait lui-même en
  // boucle. Le cas paraît absurde ; c'est exactement pour ça qu'on le ferme.
  if (contexte.estSonPropreCommerce) {
    return {
      paye: false,
      code: 'sa_propre_offre',
      raison: "C'est ta propre offre : elle ne te rapporte rien.",
    };
  }

  if (contexte.dejaPaye) {
    return {
      paye: false,
      code: 'deja_paye',
      raison: 'Tu as déjà été payé pour cette offre. Elle reste valable comme bon de réduction.',
    };
  }

  // LA règle contre les comptes dormants et les fermes de faux comptes.
  //
  // Pour être payé, il faut avoir validé une venue dans un vrai commerce
  // récemment — ce qui suppose de s'y être physiquement rendu, GPS à l'appui.
  //
  // C'est ce qui rend la fraude coûteuse : fabriquer mille comptes ne coûte
  // rien, les faire marcher jusqu'à mille commerces, si. Et un compte créé
  // puis laissé dormir pour encaisser de la publicité ne rapporte rien à son
  // propriétaire.
  //
  // Le jeu fournit gratuitement cette preuve : elle est déjà au cœur de son
  // fonctionnement.
  if (contexte.joursDepuisDerniereVisite === null) {
    return {
      paye: false,
      code: 'aucune_visite',
      raison:
        "Les offres ne paient que les joueurs qui sortent : valide ta venue dans un commerce partenaire, et elles se mettront à rapporter.",
    };
  }

  if (contexte.joursDepuisDerniereVisite > contexte.ancienneteVisiteMaximale) {
    return {
      paye: false,
      code: 'visite_trop_ancienne',
      raison: `Ta dernière venue dans un commerce remonte à ${contexte.joursDepuisDerniereVisite} jours. Passe en voir un et les offres se remettront à rapporter.`,
    };
  }

  // Le plafond quotidien empêche de vider le budget d'un commerçant en une
  // séance, et rend inutile le fait d'enchaîner les ouvertures.
  if (contexte.ouverturesPayeesAujourdhui >= contexte.plafondQuotidien) {
    return {
      paye: false,
      code: 'plafond_du_jour',
      raison:
        contexte.plafondQuotidien === 1
          ? 'Tu as eu ton offre payée du jour. Les suivantes restent consultables, et demain le compteur repart.'
          : `Tu as atteint tes ${contexte.plafondQuotidien} offres payées du jour. Les suivantes restent consultables, et demain le compteur repart.`,
    };
  }

  return { paye: true };
}

// ---------------------------------------------------------------------------
// La réduction
// ---------------------------------------------------------------------------

export interface Reduction {
  pourcent: number | null;
  jetons: number | null;
}

/**
 * Ce qu'une offre retire d'une addition.
 *
 * Deux bornes qui comptent : jamais plus que l'addition (on ne rend pas de
 * monnaie sur un bon), et arrondi au centime comme tout le reste du registre.
 */
export function reductionSur(montant: number, reduction: Reduction): number {
  if (!Number.isFinite(montant) || montant <= 0) {
    return 0;
  }

  const parPourcent = reduction.pourcent ? (montant * reduction.pourcent) / 100 : 0;
  const parJetons = reduction.jetons ?? 0;

  // Les deux peuvent coexister (« -10 % et 2 jetons offerts ») : on les
  // additionne, puis on plafonne au montant.
  const brute = parPourcent + parJetons;
  const plafonnee = Math.min(brute, montant);

  return Math.round(plafonnee * 100 * (1 + Number.EPSILON)) / 100;
}

/** Comment dire une réduction en une ligne, sur le bon. */
export function libelleReduction(reduction: Reduction): string {
  const morceaux: string[] = [];
  if (reduction.pourcent) {
    morceaux.push(`-${reduction.pourcent} %`);
  }
  if (reduction.jetons) {
    morceaux.push(`-${reduction.jetons} jeton${reduction.jetons > 1 ? 's' : ''}`);
  }
  return morceaux.join(' et ') || 'Offre sans réduction chiffrée';
}
