/**
 * Le contrat qu'un service d'envoi d'emails doit remplir.
 *
 * Même principe que le prestataire de paiement : tout le code ne connaît que
 * cette interface. Brancher un vrai service (Brevo, Postmark, SES...) tiendra
 * en une seconde implémentation et une ligne à changer.
 */
export interface Email {
  destinataire: string;
  sujet: string;
  corps: string;
}

export interface ExpediteurEmail {
  readonly nom: string;
  readonly simule: boolean;
  envoyer(email: Email): Promise<void>;
}

export const EXPEDITEUR_EMAIL = Symbol('ExpediteurEmail');
