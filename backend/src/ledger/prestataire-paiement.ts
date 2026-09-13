/**
 * Le contrat qu'un prestataire de paiement doit remplir.
 *
 * Tout le reste du code ne connaît que cette interface : le jour où un vrai
 * prestataire (Stripe ou autre) arrivera, il n'y aura qu'à écrire une seconde
 * implémentation et changer la ligne qui choisit laquelle utiliser. Aucune
 * règle métier n'est à réécrire.
 */
export interface ResultatPaiement {
  reference: string;
  statut: 'reussi' | 'echoue';
  message?: string;
}

export interface PrestatairePaiement {
  /** Nom affiché dans l'historique et les journaux. */
  readonly nom: string;

  /** Le paiement est-il réel ? Sert à prévenir l'utilisateur en clair. */
  readonly simule: boolean;

  encaisser(montant: number, reference: string): Promise<ResultatPaiement>;
}

export const PRESTATAIRE_PAIEMENT = Symbol('PrestatairePaiement');
