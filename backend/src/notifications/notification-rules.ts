// Ce qui mérite d'interrompre quelqu'un, et comment le lui dire.
// Un seul endroit décrit chaque notification : son titre, sa phrase, et où
// elle emmène quand on clique dessus.

export type TypeNotification =
  | 'validation_demandee'
  | 'mission_validee'
  | 'mission_refusee'
  | 'ami_demande'
  | 'ami_accepte'
  | 'duo_propose'
  | 'duo_accepte'
  | 'duo_a_confirmer'
  | 'invitation_recue'
  | 'invitation_repondue'
  | 'niveau_atteint'
  | 'badge_obtenu';

export interface DonneesNotification {
  // De qui ou de quoi il est question, selon le type.
  pseudo?: string;
  mission?: string;
  lieu?: string;
  niveau?: number;
  badge?: string;
  credits?: number;
  reponse?: string;
}

export interface NotificationRendue {
  titre: string;
  corps: string;
  lien: string;
}

// « 3 jetons » plutôt que « 3 jeton ».
function jetons(montant: number | undefined): string {
  const valeur = montant ?? 0;
  return `${valeur} jeton${valeur > 1 ? 's' : ''}`;
}

function qui(donnees: DonneesNotification): string {
  return donnees.pseudo ?? 'Un joueur';
}

function quelleMission(donnees: DonneesNotification): string {
  return donnees.mission ?? 'ta mission';
}

const RENDUS: Record<TypeNotification, (d: DonneesNotification) => NotificationRendue> = {
  validation_demandee: (d) => ({
    titre: 'Une validation t’attend',
    corps: `${qui(d)} dit avoir accompli « ${quelleMission(d)} ». À toi de confirmer.`,
    lien: 'validation.html',
  }),
  mission_validee: (d) => ({
    titre: 'Mission validée',
    corps: `${qui(d)} a confirmé « ${quelleMission(d)} » : ${jetons(d.credits)} pour toi.`,
    lien: 'index.html',
  }),
  mission_refusee: (d) => ({
    titre: 'Mission refusée',
    corps: `${qui(d)} n’a pas confirmé « ${quelleMission(d)} ». Tu peux réessayer.`,
    lien: 'missions.html',
  }),
  ami_demande: (d) => ({
    titre: 'Demande d’ami',
    corps: `${qui(d)} veut t’ajouter.`,
    lien: 'amis.html',
  }),
  ami_accepte: (d) => ({
    titre: 'Vous êtes amis',
    corps: `${qui(d)} a accepté ta demande.`,
    lien: 'amis.html',
  }),
  duo_propose: (d) => ({
    titre: 'Un duo t’attend',
    corps: `Quelqu’un veut faire « ${quelleMission(d)} » avec toi${d.lieu ? ` au ${d.lieu}` : ''}. Son identité reste cachée jusqu’à votre accord.`,
    lien: 'duos.html',
  }),
  duo_accepte: (d) => ({
    titre: 'Ton binôme a accepté',
    corps: `Rendez-vous pour « ${quelleMission(d)} »${d.lieu ? ` au ${d.lieu}` : ''}.`,
    lien: 'duos.html',
  }),
  duo_a_confirmer: (d) => ({
    titre: 'Ton binôme a confirmé',
    corps: `${qui(d)} dit que « ${quelleMission(d)} » est faite. Confirme de ton côté pour être crédité.`,
    lien: 'duos.html',
  }),
  invitation_recue: (d) => ({
    titre: 'Une invitation pour toi',
    corps: `${d.lieu ?? 'Un établissement'} te propose quelque chose${d.credits ? ` — ${jetons(d.credits)} déjà versés` : ''}.`,
    lien: 'invitations.html',
  }),
  invitation_repondue: (d) => ({
    titre: 'Réponse à ton invitation',
    corps: `${qui(d)} a ${d.reponse === 'acceptee' ? 'accepté' : 'refusé'} ton invitation.`,
    lien: 'commercant.html',
  }),
  niveau_atteint: (d) => ({
    titre: `Niveau ${d.niveau ?? 2}`,
    corps: 'Tu montes d’un niveau — et tu gagnes une mission de plus par jour.',
    lien: 'index.html',
  }),
  badge_obtenu: (d) => ({
    titre: 'Nouveau badge',
    corps: `Tu viens de débloquer « ${d.badge ?? 'un badge'} ».`,
    lien: 'index.html',
  }),
};

export function rendreNotification(
  type: TypeNotification,
  donnees: DonneesNotification = {},
): NotificationRendue {
  const rendu = RENDUS[type];
  if (!rendu) {
    // Un type inconnu ne doit jamais faire tomber l'appli : on affiche
    // quelque chose de neutre plutôt que rien.
    return { titre: 'Notification', corps: '', lien: 'index.html' };
  }
  return rendu(donnees);
}

export const TYPES_NOTIFICATION = Object.keys(RENDUS) as TypeNotification[];
