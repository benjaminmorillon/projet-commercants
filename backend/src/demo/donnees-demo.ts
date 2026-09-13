// Le quartier de démonstration : de vrais noms, de vraies adresses parisiennes,
// des missions qu'un commerçant pourrait réellement écrire.
//
// Tout est faux, mais rien n'est absurde : c'est ce qui permet de juger le
// produit en le regardant.

export interface LieuDemo {
  email: string;
  motDePasse: string;
  nom: string;
  adresse: string;
  latitude: number;
  longitude: number;
  typeEtablissement: string;
  capaciteEstimee: number;
  rechargement: number;
  missions: {
    titre: string;
    description: string;
    archetypeDominant: string;
    duree: string;
    theme: string;
    modeInteraction: string;
    recompenseBase: number;
  }[];
}

export const LIEUX: LieuDemo[] = [
  {
    email: 'contact@cafedesarts.fr',
    motDePasse: 'demo-cafe-des-arts',
    nom: 'Le Café des Arts',
    adresse: '12 rue de Turenne, 75003 Paris',
    latitude: 48.8592,
    longitude: 2.3639,
    typeEtablissement: 'café',
    capaciteEstimee: 40,
    rechargement: 120,
    missions: [
      {
        titre: 'Le secret du barista',
        description:
          "Devine quelle origine de café notre barista préfère, sans jamais lui poser la question directement.",
        archetypeDominant: 'explorateur',
        duree: 'courte',
        theme: 'gastronomie',
        modeInteraction: 'solo',
        recompenseBase: 3,
      },
      {
        titre: 'Portrait croisé au comptoir',
        description:
          "Avec ton binôme, dessinez-vous mutuellement en trois minutes sur un sous-bock, puis faites deviner au serveur qui a dessiné qui.",
        archetypeDominant: 'socialisateur',
        duree: 'moyenne',
        theme: 'art',
        modeInteraction: 'duo_affinite_naturelle',
        recompenseBase: 6,
      },
    ],
  },
  {
    email: 'bonjour@bistrotdumarais.fr',
    motDePasse: 'demo-bistrot-marais',
    nom: 'Bistrot du Marais',
    adresse: '4 rue des Rosiers, 75004 Paris',
    latitude: 48.8572,
    longitude: 2.3601,
    typeEtablissement: 'restaurant',
    capaciteEstimee: 60,
    rechargement: 200,
    missions: [
      {
        titre: "Le plat qui n'est pas sur la carte",
        description:
          "Repère le plat que le chef prépare hors carte ce soir, et commande-le par son vrai nom.",
        archetypeDominant: 'accomplisseur',
        duree: 'moyenne',
        theme: 'gastronomie',
        modeInteraction: 'solo',
        recompenseBase: 5,
      },
      {
        titre: 'La table des inconnus',
        description:
          "Installez-vous à deux à la grande table commune et repartez en ayant appris trois choses sur vos voisins de table.",
        archetypeDominant: 'socialisateur',
        duree: 'longue',
        theme: 'humour_insolite',
        modeInteraction: 'duo_defi_complementarite',
        recompenseBase: 8,
      },
    ],
  },
  {
    email: 'salut@librairielaplume.fr',
    motDePasse: 'demo-librairie-plume',
    nom: 'Librairie La Plume',
    adresse: '28 rue Oberkampf, 75011 Paris',
    latitude: 48.8645,
    longitude: 2.3712,
    typeEtablissement: 'librairie',
    capaciteEstimee: 25,
    rechargement: 60,
    missions: [
      {
        titre: 'La première phrase',
        description:
          "Ouvre trois romans au hasard, lis leur première phrase, et repars avec celui qui t'a le plus donné envie de continuer.",
        archetypeDominant: 'explorateur',
        duree: 'courte',
        theme: 'culture',
        modeInteraction: 'solo',
        recompenseBase: 4,
      },
    ],
  },
  {
    email: 'hello@barlecomptoir.fr',
    motDePasse: 'demo-bar-comptoir',
    nom: 'Bar Le Comptoir',
    adresse: '9 rue de Lappe, 75011 Paris',
    latitude: 48.8531,
    longitude: 2.3755,
    typeEtablissement: 'bar',
    capaciteEstimee: 80,
    rechargement: 150,
    missions: [
      {
        titre: 'Duel de devinettes au comptoir',
        description:
          "Affrontez-vous en trois devinettes posées par le barman : le premier à deux bonnes réponses gagne la manche.",
        archetypeDominant: 'competiteur',
        duree: 'courte',
        theme: 'jeux_esprit',
        modeInteraction: 'duo_defi_complementarite',
        recompenseBase: 7,
      },
      {
        titre: 'Le cocktail signature',
        description:
          "Devine les trois ingrédients principaux de notre cocktail maison sans les demander à personne.",
        archetypeDominant: 'accomplisseur',
        duree: 'courte',
        theme: 'gastronomie',
        modeInteraction: 'solo',
        recompenseBase: 4,
      },
    ],
  },
  {
    email: 'reservation@hotelduparc.fr',
    motDePasse: 'demo-hotel-du-parc',
    nom: 'Hôtel du Parc',
    adresse: '55 boulevard Voltaire, 75011 Paris',
    latitude: 48.8608,
    longitude: 2.3792,
    typeEtablissement: 'hôtel',
    capaciteEstimee: 120,
    rechargement: 90,
    missions: [
      {
        titre: 'La vue du cinquième',
        description:
          "Monte jusqu'au palier du cinquième étage et retrouve, depuis la fenêtre, le monument qu'on aperçoit entre deux toits.",
        archetypeDominant: 'explorateur',
        duree: 'courte',
        theme: 'culture',
        modeInteraction: 'solo',
        recompenseBase: 3,
      },
    ],
  },
];

export interface JoueurDemo {
  pseudo: string;
  email: string;
  motDePasse: string;
  // Les 4 curseurs : découverte/habitude, compétition/coopération,
  // seul/en groupe, objectif clair/improvisation.
  curseurs: [number, number, number, number];
  // Index des lieux où ce joueur est passé, dans l'ordre.
  visites: number[];
  avis?: { lieu: number; note: number; commentaire: string }[];
}

export const JOUEURS: JoueurDemo[] = [
  {
    pseudo: 'Camille',
    email: 'camille@exemple.fr',
    motDePasse: 'demo-camille',
    curseurs: [18, 72, 68, 45],
    visites: [0, 1, 2],
    avis: [
      { lieu: 0, note: 5, commentaire: 'Le meilleur filtre du quartier, et on peut y rester des heures.' },
      { lieu: 2, note: 4, commentaire: 'Petite mais très bien choisie. La libraire conseille vraiment.' },
    ],
  },
  {
    pseudo: 'Raphaël',
    email: 'raphael@exemple.fr',
    motDePasse: 'demo-raphael',
    curseurs: [35, 22, 30, 70],
    visites: [3, 1],
    avis: [{ lieu: 3, note: 4, commentaire: 'Ambiance au top le jeudi soir. Un peu bruyant sinon.' }],
  },
  {
    pseudo: 'Inès',
    email: 'ines@exemple.fr',
    motDePasse: 'demo-ines',
    curseurs: [12, 65, 80, 30],
    visites: [0, 3, 4],
    avis: [{ lieu: 0, note: 5, commentaire: 'On y vient pour le café, on y reste pour les gens.' }],
  },
  {
    pseudo: 'Yanis',
    email: 'yanis@exemple.fr',
    motDePasse: 'demo-yanis',
    curseurs: [60, 40, 25, 55],
    visites: [1],
    avis: [{ lieu: 1, note: 5, commentaire: 'Le plat hors carte valait vraiment le détour.' }],
  },
  {
    pseudo: 'Salomé',
    email: 'salome@exemple.fr',
    motDePasse: 'demo-salome',
    curseurs: [25, 78, 72, 40],
    visites: [2, 0],
  },
  {
    pseudo: 'Théo',
    email: 'theo@exemple.fr',
    motDePasse: 'demo-theo',
    curseurs: [45, 18, 35, 62],
    visites: [3],
  },
  {
    pseudo: 'Léna',
    email: 'lena@exemple.fr',
    motDePasse: 'demo-lena',
    curseurs: [30, 60, 55, 50],
    visites: [4, 1],
  },
  {
    pseudo: 'Malo',
    email: 'malo@exemple.fr',
    motDePasse: 'demo-malo',
    curseurs: [70, 45, 20, 35],
    visites: [],
  },
];

export const EVENEMENTS: { lieu: number; titre: string; description: string; dansNJours: number }[] = [
  {
    lieu: 3,
    titre: 'Blind test des années 90',
    description:
      'Équipes de deux, trois manches, et une tournée offerte à l’équipe gagnante. Inscription sur place à partir de 19 h.',
    dansNJours: 3,
  },
  {
    lieu: 0,
    titre: 'Matin lecture',
    description:
      'On ouvre une heure plus tôt, sans musique : venez lire au calme, le premier café est à moitié prix.',
    dansNJours: 6,
  },
];
