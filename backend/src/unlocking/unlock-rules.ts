// Déblocage progressif (section 2.9 des specs) : au démarrage le joueur n'a
// accès qu'au strict nécessaire, et l'appli s'ouvre au fur et à mesure.
// Tout est décrit ici sous forme de règles pures, testables sans base.

export interface EtatJoueur {
  questionnaireComplete: boolean;
  missionsAccomplies: number;
  missionsSoloAccomplies: number;
  checkinsEffectues: number;
  niveau: number;
}

// ---------------------------------------------------------------------------
// Le tutoriel : 3 étapes guidées avant l'accès au mode libre.
// ---------------------------------------------------------------------------

export interface EtapeTutoriel {
  id: string;
  titre: string;
  consigne: string;
  lien: string;
  estFaite: (etat: EtatJoueur) => boolean;
}

export const ETAPES_TUTORIEL: EtapeTutoriel[] = [
  {
    id: 'questionnaire',
    titre: 'Dis-nous qui tu es',
    consigne: 'Réponds aux 4 curseurs du questionnaire pour que l’appli te propose les bonnes missions.',
    lien: 'index.html',
    estFaite: (etat) => etat.questionnaireComplete,
  },
  {
    id: 'premiere_mission',
    titre: 'Accomplis ta première mission',
    consigne: 'Choisis une mission courte, fais-la, puis demande sa validation. Elle compte dès qu’elle est validée.',
    lien: 'missions.html',
    estFaite: (etat) => etat.missionsAccomplies >= 1,
  },
  {
    id: 'premier_checkin',
    titre: 'Pousse la porte d’un partenaire',
    consigne: 'Rends-toi chez un partenaire de la carte et fais un check-in sur place : c’est ce qui lève le voile sur le quartier.',
    lien: 'carte.html',
    estFaite: (etat) => etat.checkinsEffectues >= 1,
  },
];

export function tutorielTermine(etat: EtatJoueur): boolean {
  return ETAPES_TUTORIEL.every((etape) => etape.estFaite(etat));
}

// ---------------------------------------------------------------------------
// Les fonctionnalités, et ce qu'il faut faire pour les ouvrir.
// ---------------------------------------------------------------------------

export type FonctionnaliteId =
  | 'mode_libre'
  | 'profils_joueurs'
  | 'duos'
  | 'don';

export interface Fonctionnalite {
  id: FonctionnaliteId;
  nom: string;
  // Formulé côté joueur : ce qu'il lui reste à faire, pas une règle technique.
  condition: string;
  estOuverte: (etat: EtatJoueur) => boolean;
}

export const FONCTIONNALITES: Fonctionnalite[] = [
  {
    id: 'mode_libre',
    nom: 'Mode libre',
    condition: 'Termine les 3 étapes du tutoriel.',
    estOuverte: tutorielTermine,
  },
  {
    id: 'profils_joueurs',
    nom: 'Voir le profil des autres joueurs',
    condition: 'Accomplis ta première mission.',
    estOuverte: (etat) => etat.missionsAccomplies >= 1,
  },
  {
    id: 'duos',
    nom: 'Missions à deux',
    condition: 'Complète ton questionnaire et accomplis 3 missions en solo.',
    estOuverte: (etat) => etat.questionnaireComplete && etat.missionsSoloAccomplies >= 3,
  },
  {
    id: 'don',
    nom: 'Donner ses jetons à une cause',
    condition: 'Atteins le niveau 2.',
    estOuverte: (etat) => etat.niveau >= 2,
  },
];

export function estOuverte(id: FonctionnaliteId, etat: EtatJoueur): boolean {
  const fonctionnalite = FONCTIONNALITES.find((f) => f.id === id);
  return fonctionnalite ? fonctionnalite.estOuverte(etat) : true;
}

export function conditionDe(id: FonctionnaliteId): string {
  return FONCTIONNALITES.find((f) => f.id === id)?.condition ?? '';
}

// ---------------------------------------------------------------------------
// Nombre de missions par jour : volontairement serré au début.
// ---------------------------------------------------------------------------

// Valeurs de repli : ce qui s'applique tant que le back-office n'a rien
// changé (réglages « missions.parJourDepart » et « missions.parJourMax »).
export const MISSIONS_JOUR_DEPART = 3;
export const MISSIONS_JOUR_MAX = 10;

// Le service passe les valeurs réglées ; la fonction reste pure et testable
// telle quelle.
export function limiteMissionsParJour(
  niveau: number,
  depart = MISSIONS_JOUR_DEPART,
  maximum = MISSIONS_JOUR_MAX,
): number {
  return Math.min(depart + Math.max(niveau - 1, 0), maximum);
}

// ---------------------------------------------------------------------------
// La carte voilée : le monde est découpé en zones, révélées une par une.
// ---------------------------------------------------------------------------

// ~0,005° de côté, soit à peu près 550 m sur 370 m à la latitude de Paris :
// la taille d'un quartier qu'on traverse à pied.
export const TAILLE_ZONE_DEGRES = 0.005;

export function cleZone(
  latitude: number,
  longitude: number,
  taille = TAILLE_ZONE_DEGRES,
): string {
  const ligne = Math.floor(latitude / taille);
  const colonne = Math.floor(longitude / taille);
  return `${ligne}:${colonne}`;
}

// Les zones qui touchent un point : la sienne et les 8 voisines. Un joueur
// voit donc ce qui l'entoure immédiatement, même sans y être encore allé.
export function zonesVoisines(
  latitude: number,
  longitude: number,
  taille = TAILLE_ZONE_DEGRES,
): string[] {
  const ligne = Math.floor(latitude / taille);
  const colonne = Math.floor(longitude / taille);
  const cles: string[] = [];
  for (let dl = -1; dl <= 1; dl += 1) {
    for (let dc = -1; dc <= 1; dc += 1) {
      cles.push(`${ligne + dl}:${colonne + dc}`);
    }
  }
  return cles;
}

// Découvrir une zone rapporte de l'XP, et davantage si le lieu qui l'a
// révélée est sous-fréquenté (même multiplicateur qu'à la section 4).
export const XP_DECOUVERTE_ZONE = 40;

export function xpDecouverteZone(
  multiplicateurLieu: number,
  base = XP_DECOUVERTE_ZONE,
): number {
  return Math.round(base * multiplicateurLieu);
}
