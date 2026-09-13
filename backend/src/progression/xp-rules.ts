import { PlayerEventType } from '../player-events/event-weights';

// Progression du joueur (section 2.9 des specs) : XP, niveaux et badges,
// par-dessus les jetons.

// XP gagnée par type d'action. Les actions qui demandent de se déplacer ou
// d'aller vers les autres rapportent davantage.
//
// Valeurs de repli : ce qui s'applique tant que le back-office n'a rien
// changé. Les valeurs réellement utilisées viennent des réglages listés
// juste en dessous.
export const XP_PAR_EVENEMENT: Record<PlayerEventType, number> = {
  lieu_inedit_visite: 25,
  lieu_habituel_visite: 5,
  mission_solo_terminee: 20,
  mission_groupe_terminee: 35,
  mission_competitive_terminee: 30,
  avis_publie: 10,
  ami_ajoute: 20,
  invitation_acceptee: 15,
  don_effectue: 15,
};

// La clé de réglage qui pilote chaque action. La table est explicite plutôt
// que déduite du nom : le jour où un type d'événement est renommé, TypeScript
// signale l'oubli ici au lieu de laisser une XP silencieusement tomber à 0.
export const CLE_REGLAGE_XP: Record<PlayerEventType, string> = {
  lieu_inedit_visite: 'xp.lieuInedit',
  lieu_habituel_visite: 'xp.lieuHabituel',
  mission_solo_terminee: 'xp.missionSolo',
  mission_groupe_terminee: 'xp.missionGroupe',
  mission_competitive_terminee: 'xp.missionCompetitive',
  avis_publie: 'xp.avisPublie',
  ami_ajoute: 'xp.amiAjoute',
  invitation_acceptee: 'xp.invitationAcceptee',
  don_effectue: 'xp.donEffectue',
};

// Chaque niveau demande 100 XP de plus que le précédent : niveau 2 à 100 XP,
// niveau 3 à 300, niveau 4 à 600... La montée ralentit naturellement.
export function xpRequisePourNiveau(niveau: number): number {
  if (niveau <= 1) {
    return 0;
  }
  return 50 * (niveau - 1) * niveau;
}

export function niveauPourXp(xpTotal: number): number {
  let niveau = 1;
  while (xpRequisePourNiveau(niveau + 1) <= xpTotal) {
    niveau += 1;
  }
  return niveau;
}

export interface ProgressionSummary {
  xpTotal: number;
  niveau: number;
  xpNiveauActuel: number;
  xpProchainNiveau: number;
  progressionVersNiveauSuivant: number;
}

export function resumeProgression(xpTotal: number): ProgressionSummary {
  const niveau = niveauPourXp(xpTotal);
  const seuilActuel = xpRequisePourNiveau(niveau);
  const seuilSuivant = xpRequisePourNiveau(niveau + 1);
  const acquis = xpTotal - seuilActuel;
  const necessaire = seuilSuivant - seuilActuel;

  return {
    xpTotal,
    niveau,
    xpNiveauActuel: acquis,
    xpProchainNiveau: necessaire,
    progressionVersNiveauSuivant: Math.round((acquis / necessaire) * 100),
  };
}

// Statistiques sur lesquelles s'appuient les conditions de badge.
export interface PlayerStats {
  lieuxDifferentsVisites: number;
  missionsAccomplies: number;
  missionsGroupeAccomplies: number;
  avisPublies: number;
  amis: number;
  dons: number;
}

export interface BadgeDefinition {
  id: string;
  nom: string;
  description: string;
  icone: string;
  estObtenu: (stats: PlayerStats) => boolean;
}

export const BADGES: BadgeDefinition[] = [
  {
    id: 'premier_pas',
    nom: 'Premiers pas',
    description: 'Accomplir sa première mission',
    icone: '🎯',
    estObtenu: (s) => s.missionsAccomplies >= 1,
  },
  {
    id: 'explorateur_5_lieux',
    nom: 'Curieux',
    description: 'Visiter 5 lieux différents',
    icone: '🗺️',
    estObtenu: (s) => s.lieuxDifferentsVisites >= 5,
  },
  {
    id: 'explorateur_15_lieux',
    nom: 'Arpenteur',
    description: 'Visiter 15 lieux différents',
    icone: '🧭',
    estObtenu: (s) => s.lieuxDifferentsVisites >= 15,
  },
  {
    id: 'serie_de_5',
    nom: 'Série de 5',
    description: 'Accomplir 5 missions',
    icone: '🔥',
    estObtenu: (s) => s.missionsAccomplies >= 5,
  },
  {
    id: 'premier_duo',
    nom: 'Jamais seul',
    description: 'Accomplir sa première mission à plusieurs',
    icone: '🤝',
    estObtenu: (s) => s.missionsGroupeAccomplies >= 1,
  },
  {
    id: 'critique',
    nom: 'Bon conseil',
    description: 'Publier 3 avis',
    icone: '✍️',
    estObtenu: (s) => s.avisPublies >= 3,
  },
  {
    id: 'entoure',
    nom: 'Bien entouré',
    description: 'Avoir 3 amis',
    icone: '👥',
    estObtenu: (s) => s.amis >= 3,
  },
  {
    id: 'genereux',
    nom: 'Généreux',
    description: 'Donner ses jetons à une cause',
    icone: '💚',
    estObtenu: (s) => s.dons >= 1,
  },
];
