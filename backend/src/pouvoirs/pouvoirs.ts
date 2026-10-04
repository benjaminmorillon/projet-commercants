/**
 * Les pouvoirs : des fonctions de l'application débloquées temporairement.
 *
 * C'est le basculement décidé le 4 octobre. Jusqu'ici, accomplir une mission
 * rapportait des JETONS — de l'argent à dépenser chez un commerçant. Utile,
 * mais un jeton ne change rien à ce que le joueur PEUT faire, et il ne périme
 * pas : il n'a donc jamais poussé personne à sortir ce soir plutôt que la
 * semaine prochaine.
 *
 * Un pouvoir, si. Trois règles le gouvernent, et elles viennent du concept :
 *
 *  1. IL PÉRIME. Un pouvoir qui dort dans l'inventaire finit par disparaître.
 *     C'est ce qui transforme « je le garderai pour plus tard » en « autant
 *     m'en servir maintenant ».
 *  2. IL NE S'UTILISE QUE DEHORS, ou sur ce qui s'y rapporte. Aucun pouvoir
 *     ne se consomme utilement depuis le canapé.
 *  3. IL NE VIENT JAMAIS D'UN COMMERÇANT. Les pouvoirs s'obtiennent en
 *     montant de niveau et en progressant dans l'arbre des missions. Un
 *     commerçant qui pourrait en offrir achèterait de la puissance de jeu —
 *     c'est exactement le « pay-to-win » que le concept interdit.
 *
 * Ce fichier ne contient que des règles pures : pas de base de données, pas
 * de date « maintenant » implicite. Tout ce qui dépend du temps le reçoit en
 * paramètre, ce qui rend chaque règle vérifiable sans rien lancer.
 */

export type ProfilPouvoir = 'explorateur' | 'accomplisseur' | 'competiteur' | 'socialisateur';

/** Ce qu'il faut désigner au moment de s'en servir. */
export type Cible = 'aucune' | 'zone' | 'joueur';

export interface DefinitionPouvoir {
  id: string;
  nom: string;
  profil: ProfilPouvoir;
  /** Ce que ça fait, dans les mots du joueur. */
  effet: string;
  /** Pourquoi s'en servir maintenant plutôt que demain. */
  conseil: string;
  /**
   * Durée de l'effet une fois déclenché, en minutes.
   *
   * `double-mise` dure vingt-quatre heures, mais se consomme à la première
   * mission créditée : la durée est un délai de grâce, pas une promesse.
   */
  dureeEffetMinutes: number;
  /** Combien de jours il reste dans l'inventaire avant de se périmer. */
  peremptionJours: number;
  cible: Cible;
}

/**
 * Cinq pouvoirs, un par archétype plus un.
 *
 * Volontairement peu nombreux, et tous RÉELLEMENT branchés : un pouvoir qui
 * ne serait qu'une ligne dans un inventaire ne vaut rien, et apprendrait au
 * joueur à ne pas regarder son inventaire.
 *
 * Le compétiteur n'en a qu'un, et le socialisateur aussi : leurs vrais
 * pouvoirs (duels, territoires, rencontres) demandent des surfaces de jeu qui
 * n'existent pas encore. Ils viendront avec elles.
 */
export const POUVOIRS: DefinitionPouvoir[] = [
  {
    id: 'vision-lointaine',
    nom: 'Vision lointaine',
    profil: 'explorateur',
    effet: 'Lève le brouillard sur un quartier de ton choix, sans y aller.',
    conseil: 'Pour savoir ce qu’il y a là-bas avant de décider d’y marcher.',
    dureeEffetMinutes: 120,
    peremptionJours: 7,
    cible: 'zone',
  },
  {
    id: 'double-mise',
    nom: 'Double mise',
    profil: 'accomplisseur',
    effet: 'Double la récompense de la prochaine mission que tu fais valider.',
    conseil: 'À garder pour une mission longue : c’est là que ça change tout.',
    dureeEffetMinutes: 1440,
    peremptionJours: 7,
    cible: 'aucune',
  },
  {
    id: 'second-souffle',
    nom: 'Second souffle',
    profil: 'accomplisseur',
    effet: 'Une mission de plus à lancer aujourd’hui.',
    conseil: 'Quand la soirée est bonne et que le compteur du jour est vide.',
    dureeEffetMinutes: 720,
    peremptionJours: 7,
    cible: 'aucune',
  },
  {
    id: 'lever-le-voile',
    nom: 'Lever le voile',
    profil: 'socialisateur',
    effet: 'Voir le profil complet d’un joueur pendant une heure, sans être son ami.',
    conseil: 'Avant d’aborder quelqu’un, ou pour savoir avec qui tu viens de faire un duo.',
    dureeEffetMinutes: 60,
    peremptionJours: 7,
    cible: 'joueur',
  },
  {
    id: 'chasseur-de-prime',
    nom: 'Chasseur de prime',
    profil: 'competiteur',
    effet: 'Pendant trois heures, +50 % dans tout commerce qui affiche un bonus.',
    conseil: 'Enchaîne les lieux délaissés : c’est là que la prime est la plus forte.',
    dureeEffetMinutes: 180,
    peremptionJours: 7,
    cible: 'aucune',
  },
];

export function pouvoirParId(id: string): DefinitionPouvoir | undefined {
  return POUVOIRS.find((p) => p.id === id);
}

export function pouvoirsDuProfil(profil: ProfilPouvoir): DefinitionPouvoir[] {
  return POUVOIRS.filter((p) => p.profil === profil);
}

// ---------------------------------------------------------------------------
// Qui reçoit quoi
// ---------------------------------------------------------------------------

/**
 * Le pouvoir attribué à une montée de niveau.
 *
 * Il dépend du profil DOMINANT du joueur : deux personnes qui passent niveau 4
 * le même soir ne reçoivent pas la même chose. C'est ce qui fait qu'au bout de
 * quelques semaines, deux joueurs n'ont pas le même inventaire — et c'est ce
 * que le mot d'accueil de l'arbre annonce.
 *
 * Le niveau sert de rotation quand un profil a plusieurs pouvoirs : on ne
 * donne pas deux fois le même tant qu'on n'a pas fait le tour.
 */
export function pouvoirDeNiveau(profilDominant: ProfilPouvoir, niveau: number): DefinitionPouvoir {
  const candidats = pouvoirsDuProfil(profilDominant);
  if (candidats.length === 0) {
    // Un profil sans pouvoir à lui ne doit pas repartir les mains vides : la
    // montée de niveau est une promesse.
    return POUVOIRS[Math.max(niveau - 1, 0) % POUVOIRS.length];
  }
  return candidats[Math.max(niveau - 1, 0) % candidats.length];
}

/**
 * Le pouvoir attribué quand on franchit un palier de l'arbre.
 *
 * Là, c'est la VOIE qui décide, pas le joueur : progresser dans la voie du
 * curieux donne des pouvoirs d'explorateur, même à quelqu'un qui n'en est pas
 * un. C'est la récompense d'un effort précis.
 */
export function pouvoirDePalier(
  archetypeDeLaVoie: string,
  numeroDuPalier: number,
): DefinitionPouvoir | undefined {
  const candidats = pouvoirsDuProfil(archetypeDeLaVoie as ProfilPouvoir);
  if (candidats.length === 0) {
    // Le tronc commun est « mixte » : il n'a pas de pouvoir attitré, et c'est
    // volontaire — on ne récompense pas deux fois la même chose.
    return undefined;
  }
  return candidats[Math.max(numeroDuPalier - 1, 0) % candidats.length];
}

// ---------------------------------------------------------------------------
// L'état d'un pouvoir dans l'inventaire
// ---------------------------------------------------------------------------

export type EtatPouvoir = 'disponible' | 'actif' | 'epuise' | 'perime';

export interface LignePouvoir {
  pouvoirId: string;
  perimeLe: Date;
  utiliseLe: Date | null;
  effetJusquA: Date | null;
}

export function etatDuPouvoir(ligne: LignePouvoir, maintenant: Date): EtatPouvoir {
  if (ligne.utiliseLe === null) {
    return maintenant >= ligne.perimeLe ? 'perime' : 'disponible';
  }
  if (ligne.effetJusquA !== null && maintenant < ligne.effetJusquA) {
    return 'actif';
  }
  return 'epuise';
}

export type VerdictUtilisation = { ok: true } | { ok: false; code: string; raison: string };

export interface ContexteUtilisation {
  ligne: LignePouvoir;
  definition: DefinitionPouvoir;
  /** Ce que le joueur a désigné, s'il a désigné quelque chose. */
  cibleFournie: string | null;
  maintenant: Date;
}

export function verdictUtilisation(contexte: ContexteUtilisation): VerdictUtilisation {
  const etat = etatDuPouvoir(contexte.ligne, contexte.maintenant);

  if (etat === 'perime') {
    return {
      ok: false,
      code: 'perime',
      raison: `« ${contexte.definition.nom} » a expiré. Les pouvoirs ne se gardent pas : c'est ce qui en fait des pouvoirs.`,
    };
  }

  if (etat === 'actif') {
    return {
      ok: false,
      code: 'deja_actif',
      raison: `« ${contexte.definition.nom} » est déjà en cours. Laisse-le finir son effet.`,
    };
  }

  if (etat === 'epuise') {
    return {
      ok: false,
      code: 'deja_utilise',
      raison: `Tu as déjà utilisé ce « ${contexte.definition.nom} ».`,
    };
  }

  if (contexte.definition.cible !== 'aucune' && !contexte.cibleFournie) {
    return {
      ok: false,
      code: 'cible_manquante',
      raison:
        contexte.definition.cible === 'zone'
          ? 'Choisis le quartier sur lequel tu veux lever le brouillard.'
          : 'Choisis le joueur dont tu veux voir le profil.',
    };
  }

  return { ok: true };
}

// ---------------------------------------------------------------------------
// Ce que les pouvoirs actifs changent, ailleurs dans l'application
// ---------------------------------------------------------------------------

export interface PouvoirActif {
  pouvoirId: string;
  cible: string | null;
}

/**
 * Le plafond du multiplicateur.
 *
 * Les primes se multiplient entre elles — le lieu délaissé, le palier de
 * l'arbre, et maintenant les pouvoirs. Sans plafond, un joueur qui empile tout
 * au bon endroit décuplerait une mission, et le registre de jetons encaisserait
 * une facture qu'aucun commerçant n'a prévue.
 */
export const MULTIPLICATEUR_MAXIMUM = 3;

export interface EffetRecompense {
  multiplicateur: number;
  /** Les pouvoirs à marquer comme consommés après avoir crédité. */
  consommes: string[];
}

/**
 * Ce que les pouvoirs actifs font à la récompense d'une mission.
 *
 * `double-mise` se CONSOMME : c'est une cartouche, pas une fenêtre.
 * `chasseur-de-prime` ne se consomme pas, mais il ne s'applique que dans un
 * commerce qui affiche déjà un bonus — ce qui en fait un pouvoir de tournée,
 * pas de fauteuil.
 */
export function effetSurLaRecompense(
  actifs: PouvoirActif[],
  contexte: { lieuEnBonus: boolean },
): EffetRecompense {
  let multiplicateur = 1;
  const consommes: string[] = [];

  for (const actif of actifs) {
    if (actif.pouvoirId === 'double-mise') {
      multiplicateur *= 2;
      consommes.push(actif.pouvoirId);
    }
    if (actif.pouvoirId === 'chasseur-de-prime' && contexte.lieuEnBonus) {
      multiplicateur *= 1.5;
    }
  }

  return { multiplicateur: Math.min(multiplicateur, MULTIPLICATEUR_MAXIMUM), consommes };
}

/** Combien de missions supplémentaires les pouvoirs actifs autorisent aujourd'hui. */
export function bonusMissionsDuJour(actifs: PouvoirActif[]): number {
  return actifs.filter((a) => a.pouvoirId === 'second-souffle').length;
}

/** Les quartiers que « Vision lointaine » tient levés en ce moment. */
export function zonesLeveesParPouvoir(actifs: PouvoirActif[]): string[] {
  return actifs
    .filter((a) => a.pouvoirId === 'vision-lointaine' && a.cible)
    .map((a) => a.cible as string);
}

/** Les joueurs dont « Lever le voile » ouvre le profil en ce moment. */
export function profilsOuvertsParPouvoir(actifs: PouvoirActif[]): string[] {
  return actifs
    .filter((a) => a.pouvoirId === 'lever-le-voile' && a.cible)
    .map((a) => a.cible as string);
}

// ---------------------------------------------------------------------------
// Dire le temps qui reste
// ---------------------------------------------------------------------------

/**
 * « 3 jours », « 2 h 15 », « 8 min », « expiré ».
 *
 * Volontairement imprécis au-delà de l'heure : savoir qu'il reste trois jours
 * suffit à décider, et « 2 j 7 h 41 min » ne se lit pas d'un coup d'œil.
 */
export function tempsRestant(echeance: Date, maintenant: Date): string {
  const minutes = Math.floor((echeance.getTime() - maintenant.getTime()) / 60000);

  if (minutes <= 0) return 'expiré';
  if (minutes < 60) return `${minutes} min`;

  const heures = Math.floor(minutes / 60);
  if (heures < 24) {
    const reste = minutes % 60;
    return reste === 0 ? `${heures} h` : `${heures} h ${String(reste).padStart(2, '0')}`;
  }

  const jours = Math.floor(heures / 24);
  return jours === 1 ? '1 jour' : `${jours} jours`;
}

/** La date de péremption d'un pouvoir qu'on vient d'attribuer. */
export function peremptionDepuis(definition: DefinitionPouvoir, obtenuLe: Date): Date {
  return new Date(obtenuLe.getTime() + definition.peremptionJours * 24 * 3600 * 1000);
}

/** La fin de l'effet d'un pouvoir qu'on vient de déclencher. */
export function finDEffetDepuis(definition: DefinitionPouvoir, utiliseLe: Date): Date {
  return new Date(utiliseLe.getTime() + definition.dureeEffetMinutes * 60 * 1000);
}
