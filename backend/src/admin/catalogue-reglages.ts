// ---------------------------------------------------------------------------
// Le catalogue des réglages.
//
// Une seule liste, déclarée ici, qui sert à tout :
//   - le formulaire du back-office se construit à partir d'elle ;
//   - la validation des valeurs saisies s'appuie sur elle ;
//   - la valeur par défaut (celle d'avant le back-office) y est écrite.
//
// Ajouter un réglage = ajouter une ligne ici, puis lire `reglages.nombre(...)`
// là où la constante était utilisée. Rien d'autre à toucher : ni la page, ni
// la base, ni les routes.
// ---------------------------------------------------------------------------

export type TypeReglage = 'entier' | 'nombre' | 'booleen' | 'texte';

export interface DefinitionReglage {
  cle: string;
  groupe: string;
  libelle: string;
  /** En français simple : ce que ça change concrètement dans le jeu. */
  explication: string;
  type: TypeReglage;
  defaut: number | boolean | string;
  /** Bornes pour les nombres : au-delà, la saisie est refusée. */
  min?: number;
  max?: number;
  /** Suffixe affiché à côté du champ (m, jours, XP...). */
  unite?: string;
}

export const GROUPES = [
  {
    id: 'terrain',
    titre: 'Le terrain',
    resume: 'Les distances et le découpage du monde en quartiers.',
  },
  {
    id: 'rythme',
    titre: 'Le rythme de jeu',
    resume: 'Combien un joueur peut faire par jour, et à quelle vitesse il progresse.',
  },
  {
    id: 'arbre',
    titre: "L'arbre des missions",
    resume:
      "La forme de l'arbre : la taille des paliers, la vitesse à laquelle les voies s'ouvrent, et la prime accordée aux missions les plus engageantes.",
  },
  {
    id: 'xp',
    titre: "Les points d'expérience",
    resume: "Ce que rapporte chaque action. C'est le levier principal pour orienter les comportements.",
  },
  {
    id: 'equilibrage',
    titre: 'Le rééquilibrage des lieux',
    resume: 'Le coup de pouce donné aux commerces de qualité mais peu fréquentés.',
  },
  {
    id: 'argent',
    titre: 'Les jetons',
    resume: "Les montants, et le partage entre le joueur et la plateforme.",
  },
  {
    id: 'publicite',
    titre: 'Les offres des commerçants',
    resume:
      "Ce que rapporte une offre ouverte par un joueur, et ce qui empêche de payer pour de fausses vues.",
  },
  {
    id: 'securite',
    titre: 'La sécurité des comptes',
    resume: 'La protection contre les tentatives de connexion en rafale.',
  },
] as const;

export const CATALOGUE: DefinitionReglage[] = [
  // --- Le terrain --------------------------------------------------------
  {
    cle: 'checkin.rayonMetres',
    groupe: 'terrain',
    libelle: 'Rayon de validation de présence',
    explication:
      "À quelle distance du commerce un joueur peut déclarer qu'il y est. Trop petit, le GPS d'un téléphone en intérieur fait échouer des joueurs pourtant sur place ; trop grand, on peut valider depuis le trottoir d'en face.",
    type: 'entier',
    defaut: 150,
    min: 10,
    max: 2000,
    unite: 'm',
  },
  {
    cle: 'carte.tailleZoneDegres',
    groupe: 'terrain',
    libelle: "Taille d'un quartier de la carte",
    explication:
      "La carte est voilée et se dévoile quartier par quartier. 0,005 correspond à peu près à 550 m sur 370 m à Paris : ce qu'on traverse à pied. Augmenter cette valeur dévoile de plus grands morceaux d'un coup.",
    type: 'nombre',
    defaut: 0.005,
    min: 0.0005,
    max: 0.05,
    unite: '°',
  },
  {
    cle: 'carte.missionsParLieu',
    groupe: 'terrain',
    libelle: 'Missions affichées par commerce',
    explication:
      "Combien de missions du catalogue sont proposées sur la carte pour un commerce qui n'a pas créé les siennes.",
    type: 'entier',
    defaut: 3,
    min: 1,
    max: 10,
  },

  // --- Le rythme ---------------------------------------------------------
  {
    cle: 'missions.parJourDepart',
    groupe: 'rythme',
    libelle: 'Missions par jour au niveau 1',
    explication:
      "Le quota quotidien d'un joueur qui vient de s'inscrire. Volontairement serré : c'est ce qui donne envie de revenir demain plutôt que de tout faire le premier soir.",
    type: 'entier',
    defaut: 3,
    min: 1,
    max: 50,
    unite: '/jour',
  },
  {
    cle: 'missions.parJourMax',
    groupe: 'rythme',
    libelle: 'Missions par jour au maximum',
    explication:
      "Le plafond, atteint en montant de niveau (+1 mission par niveau). Au-delà, monter encore ne débloque plus rien de ce côté.",
    type: 'entier',
    defaut: 10,
    min: 1,
    max: 100,
    unite: '/jour',
  },

  // --- L'arbre des missions ----------------------------------------------
  {
    cle: 'arbre.taillePalier',
    groupe: 'arbre',
    libelle: "Missions par palier",
    explication:
      "Un palier est une rangée de l'arbre. Plus il est large, plus le joueur a de choix devant lui à un instant donné, mais plus il lui faut de temps pour atteindre la rangée suivante.",
    type: 'entier',
    defaut: 3,
    min: 1,
    max: 10,
    unite: 'missions',
  },
  {
    cle: 'arbre.missionsRequisesParPalier',
    groupe: 'arbre',
    libelle: 'Missions à accomplir pour passer au palier suivant',
    explication:
      "Combien de missions d'une rangée il faut accomplir pour ouvrir la suivante. En dessous de la taille du palier, le joueur peut laisser de côté une mission qui ne lui plaît pas sans rester bloqué. À égalité, il doit toutes les faire.",
    type: 'entier',
    defaut: 2,
    min: 1,
    max: 10,
    unite: 'missions',
  },
  {
    cle: 'arbre.niveauParVoie',
    groupe: 'arbre',
    libelle: "Niveaux entre deux voies qui s'ouvrent",
    explication:
      "La voie qui correspond au style dominant du joueur est ouverte tout de suite. Les trois autres s'ouvrent ensuite, une par tranche de niveaux. À 0, tout est ouvert dès le premier jour.",
    type: 'entier',
    defaut: 1,
    min: 0,
    max: 20,
    unite: 'niveaux',
  },
  {
    cle: 'arbre.bonusParPalier',
    groupe: 'arbre',
    libelle: 'Prime par palier franchi',
    explication:
      "Ce qu'une mission rapporte en plus, par rangée de profondeur dans sa voie. 0,15 signifie +15 % au deuxième palier, +30 % au troisième. C'est ce qui rend l'effort supplémentaire visible dans le portefeuille.",
    type: 'nombre',
    defaut: 0.15,
    min: 0,
    max: 1,
  },
  {
    cle: 'arbre.bonusMaximum',
    groupe: 'arbre',
    libelle: 'Plafond de cette prime',
    explication:
      "Au-delà, une mission très profonde dans une voie ne rapporte plus davantage. 0,75 veut dire qu'aucune mission ne peut rapporter plus de 1,75 fois sa récompense de base.",
    type: 'nombre',
    defaut: 0.75,
    min: 0,
    max: 5,
  },

  // --- L'expérience ------------------------------------------------------
  {
    cle: 'xp.lieuInedit',
    groupe: 'xp',
    libelle: 'Visiter un lieu pour la première fois',
    explication: "Récompense la découverte. C'est ce qui pousse à sortir de ses habitudes.",
    type: 'entier',
    defaut: 25,
    min: 0,
    max: 500,
    unite: 'XP',
  },
  {
    cle: 'xp.lieuHabituel',
    groupe: 'xp',
    libelle: 'Revenir dans un lieu déjà visité',
    explication:
      'Volontairement bien plus faible que la découverte, sinon rien ne pousse à explorer.',
    type: 'entier',
    defaut: 5,
    min: 0,
    max: 500,
    unite: 'XP',
  },
  {
    cle: 'xp.missionSolo',
    groupe: 'xp',
    libelle: 'Terminer une mission seul',
    explication: 'La récompense de référence, à laquelle les autres se comparent.',
    type: 'entier',
    defaut: 20,
    min: 0,
    max: 500,
    unite: 'XP',
  },
  {
    cle: 'xp.missionGroupe',
    groupe: 'xp',
    libelle: 'Terminer une mission à plusieurs',
    explication:
      'Plus élevé que le solo : aller vers les autres demande un effort, et c\'est le cœur du produit.',
    type: 'entier',
    defaut: 35,
    min: 0,
    max: 500,
    unite: 'XP',
  },
  {
    cle: 'xp.missionCompetitive',
    groupe: 'xp',
    libelle: 'Terminer une mission compétitive',
    explication: 'Pour les profils qui viennent chercher le défi plutôt que la rencontre.',
    type: 'entier',
    defaut: 30,
    min: 0,
    max: 500,
    unite: 'XP',
  },
  {
    cle: 'xp.avisPublie',
    groupe: 'xp',
    libelle: 'Publier un avis',
    explication:
      "Les avis alimentent le rééquilibrage des lieux : sans eux, impossible de distinguer un bon commerce d'un mauvais.",
    type: 'entier',
    defaut: 10,
    min: 0,
    max: 500,
    unite: 'XP',
  },
  {
    cle: 'xp.amiAjoute',
    groupe: 'xp',
    libelle: 'Ajouter un ami',
    explication: "Un joueur qui a des amis revient. C'est la statistique qui prédit le mieux la rétention.",
    type: 'entier',
    defaut: 20,
    min: 0,
    max: 500,
    unite: 'XP',
  },
  {
    cle: 'xp.invitationAcceptee',
    groupe: 'xp',
    libelle: 'Accepter une invitation de commerçant',
    explication:
      "Ce que gagne le joueur qui répond à une campagne. Monter cette valeur rend les campagnes plus efficaces, donc les commerçants plus satisfaits.",
    type: 'entier',
    defaut: 15,
    min: 0,
    max: 500,
    unite: 'XP',
  },
  {
    cle: 'xp.donEffectue',
    groupe: 'xp',
    libelle: 'Faire un don à une cause',
    explication: 'Récompense le geste sans le rendre plus rentable que de jouer.',
    type: 'entier',
    defaut: 15,
    min: 0,
    max: 500,
    unite: 'XP',
  },
  {
    cle: 'xp.decouverteZone',
    groupe: 'xp',
    libelle: 'Dévoiler un nouveau quartier',
    explication:
      "La grosse récompense de l'exploration. Elle est multipliée par le coup de pouce du lieu qui a révélé le quartier.",
    type: 'entier',
    defaut: 40,
    min: 0,
    max: 500,
    unite: 'XP',
  },

  // --- Le rééquilibrage --------------------------------------------------
  {
    cle: 'equilibrage.fenetreJours',
    groupe: 'equilibrage',
    libelle: 'Fenêtre de comptage des visites',
    explication:
      "Sur combien de jours on regarde la fréquentation d'un lieu. Une fenêtre courte réagit vite mais s'affole ; une fenêtre longue lisse mais met du temps à voir un changement.",
    type: 'entier',
    defaut: 14,
    min: 1,
    max: 365,
    unite: 'jours',
  },
  {
    cle: 'equilibrage.capaciteParDefaut',
    groupe: 'equilibrage',
    libelle: "Capacité supposée d'un lieu",
    explication:
      "Ce qu'on retient quand le commerçant n'a pas renseigné sa capacité. Sert à calculer s'il est plein ou vide.",
    type: 'entier',
    defaut: 50,
    min: 1,
    max: 5000,
    unite: 'pers.',
  },
  {
    cle: 'equilibrage.facteurEcart',
    groupe: 'equilibrage',
    libelle: 'Sensibilité du coup de pouce',
    explication:
      "À quel point l'écart entre la qualité d'un lieu et sa fréquentation fait bouger la récompense. À 0, le rééquilibrage est désactivé et tous les lieux se valent.",
    type: 'nombre',
    defaut: 0.6,
    min: 0,
    max: 3,
  },
  {
    cle: 'equilibrage.multiplicateurMin',
    groupe: 'equilibrage',
    libelle: 'Coup de pouce minimum',
    explication:
      "La pénalité maximale pour un lieu déjà bondé. 0,7 signifie qu'il ne rapporte jamais moins de 70 % de la récompense normale.",
    type: 'nombre',
    defaut: 0.7,
    min: 0.1,
    max: 1,
    unite: '×',
  },
  {
    cle: 'equilibrage.multiplicateurMax',
    groupe: 'equilibrage',
    libelle: 'Coup de pouce maximum',
    explication:
      "Le bonus maximal pour un lieu de qualité et désert. 1,1 = +10 %. Monter cette valeur rend le rééquilibrage plus agressif, et les récompenses plus imprévisibles pour le joueur.",
    type: 'nombre',
    defaut: 1.1,
    min: 1,
    max: 3,
    unite: '×',
  },

  // --- Les jetons --------------------------------------------------------
  {
    cle: 'jetons.montantMinimum',
    groupe: 'argent',
    libelle: 'Montant minimum d’un mouvement',
    explication:
      "En dessous, un paiement ou un don est refusé. Évite les mouvements à zéro qui encombrent le registre.",
    type: 'nombre',
    defaut: 0.01,
    min: 0.01,
    max: 100,
    unite: 'jetons',
  },
  {
    cle: 'campagnes.partJoueur',
    groupe: 'argent',
    libelle: 'Part reversée au joueur ciblé',
    explication:
      "Sur ce que paie un commerçant pour cibler un joueur, la fraction qui revient au joueur. Le reste est la marge de la plateforme. 0,8 = 80 % au joueur, 20 % pour nous.",
    type: 'nombre',
    defaut: 0.8,
    min: 0,
    max: 1,
  },

  // --- Les offres des commerçants ----------------------------------------
  {
    cle: 'publicite.partJoueur',
    groupe: 'publicite',
    libelle: 'Part reversée au joueur qui ouvre une offre',
    explication:
      "Sur ce que paie un commerçant pour une ouverture, la fraction qui revient au joueur. Le reste est la marge de la plateforme. C'est ce qui distingue le service d'une publicité ordinaire : ici, celui qui regarde est payé.",
    type: 'nombre',
    defaut: 0.8,
    min: 0,
    max: 1,
  },
  {
    cle: 'publicite.coutParOuvertureParDefaut',
    groupe: 'publicite',
    libelle: "Ce que coûte une ouverture, par défaut",
    explication:
      "Ce qu'un commerçant paie chaque fois qu'un joueur ouvre son offre, quand il ne fixe pas lui-même le montant. C'est la seule chose qu'il paie : une offre affichée mais jamais ouverte ne coûte rien.",
    type: 'nombre',
    defaut: 0.3,
    min: 0.01,
    max: 100,
    unite: 'jetons',
  },
  {
    cle: 'publicite.ouverturesPayeesParJour',
    groupe: 'publicite',
    libelle: 'Offres payées par jour et par joueur',
    explication:
      "Au-delà, les offres restent consultables mais ne rapportent plus rien jusqu'au lendemain. Empêche quelqu'un de vider le budget d'un commerçant en une séance, et rend inutile d'enchaîner les ouvertures.",
    type: 'entier',
    defaut: 10,
    min: 1,
    max: 200,
    unite: '/jour',
  },
  {
    cle: 'publicite.ancienneteVisiteJours',
    groupe: 'publicite',
    libelle: 'Ancienneté maximale de la dernière venue',
    explication:
      "Pour être payé, un joueur doit avoir validé sa venue dans un commerce depuis moins longtemps que ça. C'est la protection principale contre les comptes dormants et les faux comptes : fabriquer mille comptes ne coûte rien, les faire marcher jusqu'à mille commerces, si. Monter cette valeur ouvre les vannes, la baisser exige des joueurs plus actifs.",
    type: 'entier',
    defaut: 30,
    min: 1,
    max: 365,
    unite: 'jours',
  },
  {
    cle: 'publicite.dureeMaximaleJours',
    groupe: 'publicite',
    libelle: "Durée maximale d'une offre",
    explication:
      "Au-delà, un commerçant ne peut pas programmer son offre. Évite les annonces oubliées qui traînent des mois et qui décrédibilisent la recherche.",
    type: 'entier',
    defaut: 90,
    min: 1,
    max: 730,
    unite: 'jours',
  },

  // --- La sécurité -------------------------------------------------------
  {
    cle: 'securite.essaisAvantBlocage',
    groupe: 'securite',
    libelle: 'Essais de connexion avant blocage',
    explication:
      "Combien de mots de passe erronés sont tolérés avant de fermer la porte. Trop bas, on bloque des gens honnêtes qui ont oublié leur mot de passe.",
    type: 'entier',
    defaut: 5,
    min: 1,
    max: 100,
  },
  {
    cle: 'securite.dureeBlocageMinutes',
    groupe: 'securite',
    libelle: 'Durée du blocage',
    explication:
      "Combien de temps la porte reste fermée après trop d'échecs. Sert aussi de fenêtre de comptage : les échecs plus vieux que ça sont oubliés.",
    type: 'entier',
    defaut: 15,
    min: 1,
    max: 1440,
    unite: 'min',
  },
];

export const CATALOGUE_PAR_CLE = new Map(CATALOGUE.map((d) => [d.cle, d]));

// ---------------------------------------------------------------------------
// Lecture d'une valeur saisie.
//
// Fonction pure : elle prend du texte, elle rend une valeur ou un refus
// expliqué. Aucune base de données, donc facile à tester.
// ---------------------------------------------------------------------------

export type Lecture =
  | { ok: true; valeur: number | boolean | string }
  | { ok: false; erreur: string };

export function lireValeur(definition: DefinitionReglage, brut: unknown): Lecture {
  if (definition.type === 'booleen') {
    if (typeof brut === 'boolean') return { ok: true, valeur: brut };
    if (brut === 'true' || brut === 'oui') return { ok: true, valeur: true };
    if (brut === 'false' || brut === 'non') return { ok: true, valeur: false };
    return { ok: false, erreur: 'Réponse attendue : oui ou non.' };
  }

  if (definition.type === 'texte') {
    if (typeof brut !== 'string') {
      return { ok: false, erreur: 'Du texte est attendu ici.' };
    }
    const texte = brut.trim();
    if (texte === '') {
      return { ok: false, erreur: 'Ce champ ne peut pas rester vide.' };
    }
    return { ok: true, valeur: texte };
  }

  // Nombres. On accepte la virgule décimale : c'est ce qu'on tape en français.
  const texte = typeof brut === 'number' ? String(brut) : String(brut ?? '').trim().replace(',', '.');
  if (texte === '') {
    return { ok: false, erreur: 'Une valeur est attendue ici.' };
  }

  const nombre = Number(texte);
  if (!Number.isFinite(nombre)) {
    return { ok: false, erreur: "Ce n'est pas un nombre." };
  }

  if (definition.type === 'entier' && !Number.isInteger(nombre)) {
    return { ok: false, erreur: 'Un nombre entier est attendu ici (sans virgule).' };
  }

  const unite = definition.unite ? ` ${definition.unite}` : '';
  if (definition.min !== undefined && nombre < definition.min) {
    return { ok: false, erreur: `Minimum : ${definition.min}${unite}.` };
  }
  if (definition.max !== undefined && nombre > definition.max) {
    return { ok: false, erreur: `Maximum : ${definition.max}${unite}.` };
  }

  return { ok: true, valeur: nombre };
}

/** Ce qu'on écrit en base : toujours du texte, relu par `lireValeur`. */
export function enTexte(valeur: number | boolean | string): string {
  return typeof valeur === 'boolean' ? String(valeur) : String(valeur);
}
