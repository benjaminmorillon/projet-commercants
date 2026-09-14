// ---------------------------------------------------------------------------
// L'arbre des missions.
//
// Jusqu'ici les missions formaient une liste plate : 35 lignes, toutes
// disponibles en même temps, filtrables par thème. Personne ne savait par
// où commencer, et une mission d'une heure à six rapportait autant qu'une
// mission de cinq minutes sur le trottoir d'à côté.
//
// L'arbre remplace cette liste par une carte de progression, comme les
// arbres de compétence des jeux vidéo :
//
//   - CINQ VOIES, une par style de joueur, chacune avec sa couleur. Le tronc
//     commun (les missions « mixtes ») est ouvert à tout le monde ; les
//     quatre autres correspondent aux quatre archétypes du questionnaire ;
//   - des PALIERS à l'intérieur de chaque voie, rangés par investissement
//     croissant : les missions courtes et solitaires d'abord, les missions
//     longues et collectives ensuite ;
//   - un DÉBLOCAGE de proche en proche : un palier ne s'ouvre que lorsqu'on
//     a fait ses preuves sur le précédent ;
//   - une RÉCOMPENSE qui monte avec le palier, pour que l'effort supplémentaire
//     se voie dans le portefeuille et pas seulement dans le temps passé.
//
// Tout est ici sous forme de fonctions pures : aucune base de données, aucune
// requête. Le service se contente de fournir les missions, les missions déjà
// accomplies, le profil et le niveau ; ces fonctions décident du reste, et
// les tests peuvent les interroger directement.
// ---------------------------------------------------------------------------

/**
 * Ce dont l'arbre a besoin d'une mission. C'est un sous-ensemble de
 * l'entité `Mission` : l'arbre ne lit que ces champs, donc les tests peuvent
 * lui passer des objets fabriqués à la main sans construire une entité
 * complète.
 */
export interface MissionDeLArbre {
  id: string;
  titre: string;
  description?: string;
  theme: string;
  archetypeDominant: string;
  duree: string;
  modeInteraction: string;
  recompenseBase: number;
  parcoursId?: string | null;
  etape?: number | null;
  businessId?: string | null;
}

// ---------------------------------------------------------------------------
// Les voies.
// ---------------------------------------------------------------------------

export interface DefinitionVoie {
  id: string;
  /** L'archétype de mission que cette voie rassemble. */
  archetype: string;
  nom: string;
  /** Une phrase qui dit au joueur ce qu'on lui demande dans cette voie. */
  devise: string;
  /**
   * La couleur de la voie. Elles sont espacées sur le cercle chromatique
   * pour rester distinguables d'un coup d'œil, et assez claires pour tenir
   * sur le fond bleu-nuit de l'interface.
   *
   * Le violet de l'accent n'est PAS réutilisé ici : dans le système de
   * design il signifie « on peut agir là-dessus ». Une voie violette
   * ferait croire que la voie entière est un bouton.
   */
  couleur: string;
}

export const VOIE_TRONC = 'tronc';

export const VOIES: DefinitionVoie[] = [
  {
    id: VOIE_TRONC,
    archetype: 'mixte',
    nom: 'Le tronc commun',
    devise: 'Les missions que tout le monde peut faire, quel que soit son style.',
    couleur: '#8b95b8',
  },
  {
    id: 'explorateur',
    archetype: 'explorateur',
    nom: 'La voie du curieux',
    devise: 'Pousser les portes, remarquer ce que les autres ne voient pas.',
    couleur: '#38bdf8',
  },
  {
    id: 'accomplisseur',
    archetype: 'accomplisseur',
    nom: 'La voie du collectionneur',
    devise: 'Aller au bout, cocher, terminer ce qui est commencé.',
    couleur: '#fbbf24',
  },
  {
    id: 'competiteur',
    archetype: 'competiteur',
    nom: 'La voie du challenger',
    devise: 'Se mesurer, battre un temps, faire mieux que la table d’à côté.',
    couleur: '#fb7185',
  },
  {
    id: 'socialisateur',
    archetype: 'socialisateur',
    nom: 'La voie du liant',
    devise: 'Parler aux gens, créer du lien là où il n’y en avait pas.',
    couleur: '#34d399',
  },
];

/** Les quatre voies de profil, dans l'ordre du questionnaire (hors tronc). */
export const VOIES_DE_PROFIL = VOIES.filter((v) => v.id !== VOIE_TRONC);

export function voieDeLArchetype(archetype: string): DefinitionVoie {
  // Une mission dont l'archétype est inconnu (ou vide) rejoint le tronc
  // commun plutôt que de disparaître de l'arbre : mieux vaut une mission
  // mal rangée qu'une mission invisible.
  return VOIES.find((v) => v.archetype === archetype) ?? VOIES[0];
}

// ---------------------------------------------------------------------------
// L'effort demandé par une mission.
//
// Deux choses coûtent au joueur : le TEMPS, et le fait d'avoir à embarquer
// quelqu'un d'autre. Une mission longue en groupe est ce qu'on peut demander
// de plus engageant ; une mission courte en solo, le contraire.
// ---------------------------------------------------------------------------

export const EFFORT_DUREE: Record<string, number> = {
  courte: 1,
  moyenne: 2,
  longue: 3,
};

export const EFFORT_MODE: Record<string, number> = {
  solo: 0,
  duo_affinite_naturelle: 1,
  duo_defi_complementarite: 1,
  groupe: 2,
};

/** De 1 (courte, seul) à 5 (longue, en groupe). */
export function effortDe(mission: MissionDeLArbre): number {
  const temps = EFFORT_DUREE[mission.duree] ?? 1;
  const monde = EFFORT_MODE[mission.modeInteraction] ?? 0;
  return temps + monde;
}

// ---------------------------------------------------------------------------
// Les réglages de l'arbre.
//
// Valeurs de repli : ce qui s'applique tant que le back-office n'a rien
// changé. Elles sont passées en paramètre par défaut pour que les fonctions
// restent pures et testables telles quelles.
// ---------------------------------------------------------------------------

export interface ReglagesArbre {
  /** Combien de missions par palier. */
  taillePalier: number;
  /** Combien il faut en accomplir pour ouvrir le palier suivant. */
  requisesParPalier: number;
  /** Écart de niveau entre deux voies de profil qui s'ouvrent. */
  niveauParVoie: number;
  /** Ce que rapporte en plus chaque palier franchi, en proportion. */
  bonusParPalier: number;
  /** Plafond de ce bonus, pour qu'un palier lointain ne s'emballe pas. */
  bonusMaximum: number;
}

export const REGLAGES_ARBRE: ReglagesArbre = {
  taillePalier: 3,
  requisesParPalier: 2,
  niveauParVoie: 1,
  bonusParPalier: 0.15,
  bonusMaximum: 0.75,
};

// ---------------------------------------------------------------------------
// Le rangement : par voie, puis par effort croissant, puis en paliers.
// ---------------------------------------------------------------------------

/**
 * L'ordre à l'intérieur d'une voie. L'effort d'abord — c'est tout le sujet —
 * puis la récompense, puis l'identifiant. Les deux derniers critères ne
 * servent qu'à rendre l'ordre STABLE : sans eux, deux missions de même
 * effort changeraient de place d'un chargement à l'autre, et un joueur
 * verrait son arbre se réorganiser sous ses yeux sans rien avoir fait.
 */
export function ordonner(missions: MissionDeLArbre[]): MissionDeLArbre[] {
  return [...missions].sort((a, b) => {
    const effort = effortDe(a) - effortDe(b);
    if (effort !== 0) return effort;
    const recompense = a.recompenseBase - b.recompenseBase;
    if (recompense !== 0) return recompense;
    return a.id.localeCompare(b.id);
  });
}

export function decouperEnPaliers(
  missions: MissionDeLArbre[],
  taille = REGLAGES_ARBRE.taillePalier,
): MissionDeLArbre[][] {
  const pas = Math.max(1, Math.floor(taille));
  const paliers: MissionDeLArbre[][] = [];
  for (let i = 0; i < missions.length; i += pas) {
    paliers.push(missions.slice(i, i + pas));
  }
  return paliers;
}

const NOMS_DE_PALIER = ['Découverte', 'Habitude', 'Engagement', 'Maîtrise', 'Légende'];

export function nomDuPalier(numero: number): string {
  return NOMS_DE_PALIER[numero - 1] ?? `Palier ${numero}`;
}

// ---------------------------------------------------------------------------
// Le profil décide de l'ordre d'ouverture des voies.
//
// La voie qui correspond au style dominant du joueur est ouverte tout de
// suite : c'est celle sur laquelle il a le plus de chances d'accrocher. Les
// trois autres s'ouvrent à mesure qu'il monte en niveau — le jeu s'élargit
// au lieu de tout montrer d'un coup.
// ---------------------------------------------------------------------------

export interface ScoresArchetypes {
  scoreExplorateur: number;
  scoreAccomplisseur: number;
  scoreCompetiteur: number;
  scoreSocialisateur: number;
}

const SCORE_PAR_VOIE: Record<string, (s: ScoresArchetypes) => number> = {
  explorateur: (s) => s.scoreExplorateur,
  accomplisseur: (s) => s.scoreAccomplisseur,
  competiteur: (s) => s.scoreCompetiteur,
  socialisateur: (s) => s.scoreSocialisateur,
};

/**
 * Les quatre voies de profil, de la plus proche du joueur à la plus
 * éloignée. À score égal (typiquement un joueur qui n'a pas encore répondu
 * au questionnaire), on garde l'ordre de déclaration : l'arbre reste le même
 * d'un chargement à l'autre.
 */
export function voiesParAffinite(scores: ScoresArchetypes): DefinitionVoie[] {
  return [...VOIES_DE_PROFIL].sort((a, b) => {
    const ecart = SCORE_PAR_VOIE[b.id](scores) - SCORE_PAR_VOIE[a.id](scores);
    if (ecart !== 0) return ecart;
    return VOIES_DE_PROFIL.indexOf(a) - VOIES_DE_PROFIL.indexOf(b);
  });
}

/** Le niveau à partir duquel la voie classée `rang` (1 = dominante) s'ouvre. */
export function niveauRequisPourVoie(
  rang: number,
  pas = REGLAGES_ARBRE.niveauParVoie,
): number {
  if (rang <= 1) return 1;
  return 1 + (rang - 1) * Math.max(0, pas);
}

// ---------------------------------------------------------------------------
// La récompense monte avec le palier.
//
// Deux effets se cumulent, volontairement : les missions des paliers hauts
// ont déjà une récompense de base plus élevée (elles y sont justement parce
// qu'elles demandent plus), et ce multiplicateur ajoute par-dessus la prime
// d'être allé chercher loin dans la voie.
// ---------------------------------------------------------------------------

export function multiplicateurDePalier(
  palier: number,
  bonus = REGLAGES_ARBRE.bonusParPalier,
  plafond = REGLAGES_ARBRE.bonusMaximum,
): number {
  const franchis = Math.max(0, palier - 1);
  return 1 + Math.min(franchis * bonus, plafond);
}

/** Arrondi au centime, comme partout ailleurs sur les jetons. */
export function arrondir(montant: number): number {
  return Math.round((montant + Number.EPSILON) * 100) / 100;
}

export function recompenseDuPalier(
  base: number,
  palier: number,
  bonus = REGLAGES_ARBRE.bonusParPalier,
  plafond = REGLAGES_ARBRE.bonusMaximum,
): number {
  return arrondir(base * multiplicateurDePalier(palier, bonus, plafond));
}

// ---------------------------------------------------------------------------
// L'arbre d'un joueur donné.
// ---------------------------------------------------------------------------

export type EtatNoeud = 'accomplie' | 'ouverte' | 'a_venir' | 'verrouillee';

export interface Noeud {
  missionId: string;
  titre: string;
  description: string;
  theme: string;
  duree: string;
  modeInteraction: string;
  /** Le lieu partenaire qui propose la mission, s'il y en a un. */
  businessId: string | null;
  effort: number;
  recompenseBase: number;
  /** Ce que la mission rapporte vraiment à ce palier. */
  recompense: number;
  etat: EtatNoeud;
  /** Ce qu'il reste à faire pour l'ouvrir. `null` si elle est ouverte. */
  condition: string | null;
}

export interface Palier {
  numero: number;
  nom: string;
  ouvert: boolean;
  condition: string | null;
  multiplicateur: number;
  /** Combien de missions de CE palier ouvrent le suivant. */
  requises: number;
  accomplies: number;
  total: number;
  noeuds: Noeud[];
}

export interface VoieDeLArbre extends DefinitionVoie {
  /** 1 = voie dominante du joueur. `null` pour le tronc commun. */
  rang: number | null;
  ouverte: boolean;
  niveauRequis: number;
  condition: string | null;
  accomplies: number;
  total: number;
  paliers: Palier[];
}

export interface Arbre {
  niveau: number;
  voies: VoieDeLArbre[];
  accomplies: number;
  total: number;
}

export interface EntreeArbre {
  missions: MissionDeLArbre[];
  /** Les identifiants des missions déjà validées par ce joueur. */
  accomplies: Iterable<string>;
  scores: ScoresArchetypes;
  niveau: number;
  reglages?: Partial<ReglagesArbre>;
}

export function construireArbre(entree: EntreeArbre): Arbre {
  const reglages: ReglagesArbre = { ...REGLAGES_ARBRE, ...(entree.reglages ?? {}) };
  const faites = new Set(entree.accomplies);
  const niveau = Math.max(1, Math.floor(entree.niveau));

  // Le rang de chaque voie de profil. Le tronc n'en a pas : il est ouvert
  // d'emblée pour tout le monde.
  const rangs = new Map<string, number>();
  voiesParAffinite(entree.scores).forEach((voie, index) => rangs.set(voie.id, index + 1));

  // Les missions par voie, rangées une fois pour toutes.
  const parVoie = new Map<string, MissionDeLArbre[]>();
  for (const voie of VOIES) parVoie.set(voie.id, []);
  for (const mission of entree.missions) {
    parVoie.get(voieDeLArchetype(mission.archetypeDominant).id)!.push(mission);
  }

  // Pour les missions qui appartiennent à un parcours en plusieurs étapes,
  // l'étape précédente doit être accomplie. Cette règle s'ajoute aux
  // paliers : un parcours raconte une histoire, on ne lit pas le chapitre 3
  // avant le chapitre 2.
  const precedente = etapesPrecedentes(entree.missions);

  const voies: VoieDeLArbre[] = VOIES.map((definition) => {
    const missionsDeLaVoie = ordonner(parVoie.get(definition.id) ?? []);
    const dejaFaites = missionsDeLaVoie.filter((m) => faites.has(m.id)).length;

    const rang = rangs.get(definition.id) ?? null;
    const niveauRequis = rang === null ? 1 : niveauRequisPourVoie(rang, reglages.niveauParVoie);

    // Une voie s'ouvre au niveau requis — mais une voie déjà entamée ne se
    // REFERME jamais.
    //
    // Le profil du joueur bouge à chaque mission accomplie (c'est voulu :
    // le profil est vivant). Le classement des voies bouge donc avec lui.
    // Sans cette garantie, accomplir une mission pourrait faire reculer sa
    // propre voie au troisième rang, verrouiller le palier en cours, et
    // laisser le joueur devant une porte fermée qu'il venait d'ouvrir.
    const ouverte = niveau >= niveauRequis || dejaFaites > 0;

    const paliers: Palier[] = [];
    let palierOuvert = ouverte;
    let accompliesDansLaVoie = 0;

    const morceaux = decouperEnPaliers(missionsDeLaVoie, reglages.taillePalier);

    morceaux.forEach((missions, index) => {
      const numero = index + 1;
      const multiplicateur = multiplicateurDePalier(
        numero,
        reglages.bonusParPalier,
        reglages.bonusMaximum,
      );
      // Un palier incomplet (le dernier de la voie) ne peut pas exiger plus
      // de missions qu'il n'en contient, sinon la voie se termine sur une
      // porte qu'aucune quantité de jeu ne peut ouvrir.
      const requises = Math.min(reglages.requisesParPalier, missions.length);
      const faitesIci = missions.filter((m) => faites.has(m.id)).length;
      accompliesDansLaVoie += faitesIci;

      const palierEstOuvert = palierOuvert;
      const noeuds = missions.map((mission) =>
        construireNoeud({
          mission,
          faites,
          voieOuverte: ouverte,
          palierOuvert: palierEstOuvert,
          multiplicateur,
          precedente,
        }),
      );

      paliers.push({
        numero,
        nom: nomDuPalier(numero),
        ouvert: palierEstOuvert,
        condition: palierEstOuvert
          ? null
          : conditionDuPalier(ouverte, definition, niveauRequis, index, requises),
        multiplicateur,
        requises,
        accomplies: faitesIci,
        total: missions.length,
        noeuds,
      });

      // Le palier suivant n'existe que si celui-ci est franchi.
      palierOuvert = palierEstOuvert && faitesIci >= requises;
    });

    const total = morceaux.reduce((somme, m) => somme + m.length, 0);

    return {
      ...definition,
      rang,
      ouverte,
      niveauRequis,
      condition: ouverte ? null : `Atteins le niveau ${niveauRequis} pour ouvrir cette voie.`,
      accomplies: accompliesDansLaVoie,
      total,
      paliers,
    };
  });

  return {
    niveau,
    voies,
    accomplies: voies.reduce((somme, v) => somme + v.accomplies, 0),
    total: voies.reduce((somme, v) => somme + v.total, 0),
  };
}

function conditionDuPalier(
  voieOuverte: boolean,
  voie: DefinitionVoie,
  niveauRequis: number,
  palierPrecedent: number,
  requises: number,
): string {
  if (!voieOuverte) {
    return `Atteins le niveau ${niveauRequis} pour ouvrir « ${voie.nom} ».`;
  }
  const quoi = requises > 1 ? `${requises} missions` : '1 mission';
  return `Accomplis ${quoi} du palier « ${nomDuPalier(palierPrecedent)} » pour ouvrir celui-ci.`;
}

interface ContexteNoeud {
  mission: MissionDeLArbre;
  faites: Set<string>;
  voieOuverte: boolean;
  palierOuvert: boolean;
  multiplicateur: number;
  precedente: Map<string, MissionDeLArbre>;
}

function construireNoeud(contexte: ContexteNoeud): Noeud {
  const { mission, faites, multiplicateur } = contexte;

  const commun = {
    missionId: mission.id,
    titre: mission.titre,
    description: mission.description ?? '',
    theme: mission.theme,
    duree: mission.duree,
    modeInteraction: mission.modeInteraction,
    businessId: mission.businessId ?? null,
    effort: effortDe(mission),
    recompenseBase: mission.recompenseBase,
    recompense: arrondir(mission.recompenseBase * multiplicateur),
  };

  if (faites.has(mission.id)) {
    return { ...commun, etat: 'accomplie', condition: null };
  }
  if (!contexte.voieOuverte) {
    return { ...commun, etat: 'verrouillee', condition: null };
  }
  if (!contexte.palierOuvert) {
    return { ...commun, etat: 'a_venir', condition: null };
  }

  // Le palier est ouvert, mais la mission peut appartenir à un parcours dont
  // l'étape d'avant n'est pas faite.
  const avant = contexte.precedente.get(mission.id);
  if (avant && !faites.has(avant.id)) {
    return {
      ...commun,
      etat: 'a_venir',
      condition: `Accomplis d'abord « ${avant.titre} ».`,
    };
  }

  return { ...commun, etat: 'ouverte', condition: null };
}

/**
 * Pour chaque mission appartenant à un parcours, la mission de l'étape
 * juste avant. On s'appuie sur `parcoursId` + `etape`, déjà présents dans le
 * catalogue, plutôt que d'inventer un second système de chaînage.
 */
export function etapesPrecedentes(
  missions: MissionDeLArbre[],
): Map<string, MissionDeLArbre> {
  const parParcours = new Map<string, MissionDeLArbre[]>();
  for (const mission of missions) {
    if (!mission.parcoursId || mission.etape == null) continue;
    const liste = parParcours.get(mission.parcoursId) ?? [];
    liste.push(mission);
    parParcours.set(mission.parcoursId, liste);
  }

  const precedente = new Map<string, MissionDeLArbre>();
  for (const liste of parParcours.values()) {
    const ordonnees = [...liste].sort((a, b) => (a.etape as number) - (b.etape as number));
    for (let i = 1; i < ordonnees.length; i += 1) {
      precedente.set(ordonnees[i].id, ordonnees[i - 1]);
    }
  }
  return precedente;
}

/**
 * Le palier auquel se trouve une mission dans son propre arbre, et donc le
 * multiplicateur qui s'applique à sa récompense. Sert au moment de créditer
 * le joueur : la récompense affichée dans l'arbre doit être exactement celle
 * qui tombe dans le portefeuille.
 *
 * Renvoie 1 si la mission est introuvable — une récompense inchangée vaut
 * mieux qu'une erreur au moment de payer.
 */
export function palierDeLaMission(
  missionId: string,
  missions: MissionDeLArbre[],
  taille = REGLAGES_ARBRE.taillePalier,
): number {
  const mission = missions.find((m) => m.id === missionId);
  if (!mission) return 1;

  const voie = voieDeLArchetype(mission.archetypeDominant);
  const dansLaVoie = ordonner(
    missions.filter((m) => voieDeLArchetype(m.archetypeDominant).id === voie.id),
  );
  const rang = dansLaVoie.findIndex((m) => m.id === missionId);
  if (rang < 0) return 1;

  return Math.floor(rang / Math.max(1, Math.floor(taille))) + 1;
}
