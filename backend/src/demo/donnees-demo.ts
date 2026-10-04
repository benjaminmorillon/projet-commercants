// Le quartier de démonstration : le centre de Nantes.
//
// La GÉOGRAPHIE est vraie — ce sont les rues, les places et les quais du
// centre-ville, avec des coordonnées posées à la main d'après la carte. Les
// points tombent au bon endroit à une centaine de mètres près ; le
// géocodage du back-office les recalera exactement le jour où le serveur
// aura accès à Internet.
//
// Les NOMS de commerces, eux, sont inventés. C'est délibéré : ces fiches
// portent des missions, des offres et des avis écrits de toutes pièces.
// Les accrocher à des établissements réels reviendrait à leur faire dire des
// choses qu'ils n'ont jamais dites — gênant le jour où on leur montre
// l'application, et malhonnête vis-à-vis de qui regarde la démonstration.
// Le jour où de vrais partenaires auront accepté, leurs noms prendront la
// place de ceux-ci, depuis le back-office et sans toucher au code.
//
// Rien n'est absurde pour autant : chaque mission est une mission qu'un
// commerçant de Nantes pourrait réellement écrire, et chaque lieu a le genre
// de missions que son type de commerce rend possible.

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
    email: 'bonjour@cafejules.fr',
    motDePasse: 'demo-cafe-jules',
    nom: 'Café Jules',
    adresse: '4 rue Kervégan, 44000 Nantes',
    latitude: 47.2124,
    longitude: -1.5577,
    typeEtablissement: 'café',
    capaciteEstimee: 40,
    rechargement: 120,
    missions: [
      {
        titre: 'Le quai englouti',
        description:
          "L'île Feydeau était une vraie île, et l'eau passait là où tu marches. Trouve sur une façade de la rue la trace de ce temps-là, et dis au comptoir ce que tu as vu.",
        archetypeDominant: 'explorateur',
        duree: 'courte',
        theme: 'culture',
        modeInteraction: 'solo',
        recompenseBase: 3,
      },
      {
        titre: 'Le roman qu’il n’a pas écrit',
        description:
          'Jules Verne est né à cent mètres d’ici. Avec ton binôme, inventez le titre du roman qu’il aurait tiré de votre quartier, et faites-le valider au comptoir.',
        archetypeDominant: 'socialisateur',
        duree: 'moyenne',
        theme: 'culture',
        modeInteraction: 'duo_affinite_naturelle',
        recompenseBase: 6,
      },
    ],
  },
  {
    email: 'contact@lafourneedupilori.fr',
    motDePasse: 'demo-fournee-pilori',
    nom: 'La Fournée du Pilori',
    adresse: '2 place du Pilori, 44000 Nantes',
    latitude: 47.2152,
    longitude: -1.5558,
    typeEtablissement: 'boulangerie',
    capaciteEstimee: 15,
    rechargement: 60,
    missions: [
      {
        titre: 'Avant la première fournée',
        description:
          'Passe avant 8 h 30 et demande ce qui sort du four à cette heure-là. Reviens un autre matin : ce ne sera pas le même.',
        archetypeDominant: 'accomplisseur',
        duree: 'courte',
        theme: 'gastronomie',
        modeInteraction: 'solo',
        recompenseBase: 2,
      },
    ],
  },
  {
    email: 'salut@cinquantepages.fr',
    motDePasse: 'demo-cinquante-pages',
    nom: 'Librairie Les Cinquante Pages',
    adresse: '18 cours des 50-Otages, 44000 Nantes',
    latitude: 47.2155,
    longitude: -1.557,
    typeEtablissement: 'librairie',
    capaciteEstimee: 20,
    rechargement: 45,
    missions: [
      {
        titre: 'La cinquantième page',
        description:
          'Ouvre à la page 50 un livre que tu n’as jamais lu, lis-en trois lignes à voix haute au libraire, et repars avec ce qu’il te conseillera ensuite.',
        archetypeDominant: 'explorateur',
        duree: 'courte',
        theme: 'culture',
        modeInteraction: 'solo',
        recompenseBase: 3,
      },
      {
        titre: 'Le défi du libraire',
        description:
          'Le libraire te donne trois indices sur un livre du magasin. Retrouve-le en moins de dix minutes — le tableau des temps est derrière la caisse.',
        archetypeDominant: 'competiteur',
        duree: 'moyenne',
        theme: 'jeux_esprit',
        modeInteraction: 'solo',
        recompenseBase: 5,
      },
    ],
  },
  {
    email: 'hello@legrandgraslin.fr',
    motDePasse: 'demo-grand-graslin',
    nom: 'Le Grand Graslin',
    adresse: '3 rue Scribe, 44000 Nantes',
    latitude: 47.2127,
    longitude: -1.5617,
    typeEtablissement: 'bar',
    capaciteEstimee: 80,
    rechargement: 150,
    missions: [
      {
        titre: 'Le verre sans nom',
        description:
          'Demande « celui qui n’est pas sur l’ardoise ». Tu sauras ce que c’est après l’avoir goûté, pas avant.',
        archetypeDominant: 'explorateur',
        duree: 'courte',
        theme: 'gastronomie',
        modeInteraction: 'solo',
        recompenseBase: 3,
      },
      {
        titre: 'Duel de culture nantaise',
        description:
          'Deux joueurs, dix questions sur la ville posées par le bar. Celui qui perd choisit la musique suivante — et l’assume.',
        archetypeDominant: 'competiteur',
        duree: 'moyenne',
        theme: 'jeux_esprit',
        modeInteraction: 'duo_defi_complementarite',
        recompenseBase: 7,
      },
    ],
  },
  {
    email: 'reception@hoteldeladuchesse.fr',
    motDePasse: 'demo-hotel-duchesse',
    nom: 'Hôtel de la Duchesse',
    adresse: '9 rue du Château, 44000 Nantes',
    latitude: 47.2156,
    longitude: -1.5505,
    typeEtablissement: 'hôtel',
    capaciteEstimee: 120,
    rechargement: 90,
    missions: [
      {
        titre: 'La fenêtre du troisième',
        description:
          'Depuis le palier du troisième étage, on aperçoit une tour du château entre deux toits. Dis à la réception laquelle.',
        archetypeDominant: 'explorateur',
        duree: 'courte',
        theme: 'culture',
        modeInteraction: 'solo',
        recompenseBase: 3,
      },
      {
        titre: 'Le voyageur d’un soir',
        description:
          'Un client de l’hôtel ne connaît pas Nantes. Avec ton binôme, écrivez-lui un parcours de trois adresses sur un carton, et laissez-le à la réception.',
        archetypeDominant: 'socialisateur',
        duree: 'moyenne',
        theme: 'humour_insolite',
        modeInteraction: 'duo_affinite_naturelle',
        recompenseBase: 6,
      },
    ],
  },
  {
    email: 'contact@creperiedubouffay.fr',
    motDePasse: 'demo-creperie-bouffay',
    nom: 'Crêperie du Bouffay',
    adresse: '7 rue de la Juiverie, 44000 Nantes',
    latitude: 47.2149,
    longitude: -1.5544,
    typeEtablissement: 'crêperie',
    capaciteEstimee: 45,
    rechargement: 75,
    missions: [
      {
        titre: 'Le pli du maître',
        description:
          'Demande qu’on te montre comment se plie une galette, puis refais-le. C’est la crêpière qui juge.',
        archetypeDominant: 'accomplisseur',
        duree: 'courte',
        theme: 'gastronomie',
        modeInteraction: 'solo',
        recompenseBase: 3,
      },
      {
        titre: 'La table des inconnus',
        description:
          'Quatre joueurs qui ne se connaissent pas, une table, et une question tirée au sort posée au milieu. On repart quand la galette est finie.',
        archetypeDominant: 'socialisateur',
        duree: 'moyenne',
        theme: 'gastronomie',
        modeInteraction: 'groupe',
        recompenseBase: 8,
      },
    ],
  },
  {
    email: 'cave@muscadetvolant.fr',
    motDePasse: 'demo-muscadet-volant',
    nom: 'Le Muscadet Volant',
    adresse: '12 rue Jean-Jacques Rousseau, 44000 Nantes',
    latitude: 47.2122,
    longitude: -1.5631,
    typeEtablissement: 'caviste',
    capaciteEstimee: 25,
    rechargement: 80,
    missions: [
      {
        titre: 'Trois verres, une rivière',
        description:
          'Trois muscadets, trois coteaux. Devine lequel vient de Sèvre-et-Maine — le caviste te dira ce qui aurait dû te mettre sur la piste.',
        archetypeDominant: 'explorateur',
        duree: 'moyenne',
        theme: 'gastronomie',
        modeInteraction: 'solo',
        recompenseBase: 5,
      },
    ],
  },
  {
    email: 'bonjour@cheztalensac.fr',
    motDePasse: 'demo-chez-talensac',
    nom: 'Chez Talensac',
    adresse: '5 rue Talensac, 44000 Nantes',
    latitude: 47.2212,
    longitude: -1.5555,
    typeEtablissement: 'restaurant',
    capaciteEstimee: 55,
    rechargement: 110,
    missions: [
      {
        titre: 'Le plat qui n’est pas sur la carte',
        description:
          'Le chef fait son marché le matin, à cent mètres d’ici. Demande ce qu’il a trouvé aujourd’hui, et commande-le sans savoir ce que c’est.',
        archetypeDominant: 'explorateur',
        duree: 'courte',
        theme: 'gastronomie',
        modeInteraction: 'solo',
        recompenseBase: 4,
      },
      {
        titre: 'Le panier du mardi',
        description:
          'Passez d’abord au marché de Talensac, rapportez un produit à deux, et le chef vous dira ce qu’il en ferait — et pourquoi vous avez bien ou mal choisi.',
        archetypeDominant: 'accomplisseur',
        duree: 'longue',
        theme: 'gastronomie',
        modeInteraction: 'duo_affinite_naturelle',
        recompenseBase: 9,
      },
    ],
  },
  {
    email: 'contact@leberlingot.fr',
    motDePasse: 'demo-le-berlingot',
    nom: 'Le Berlingot',
    adresse: 'Passage Pommeraye, 44000 Nantes',
    latitude: 47.2133,
    longitude: -1.56,
    typeEtablissement: 'confiserie',
    capaciteEstimee: 12,
    rechargement: 50,
    missions: [
      {
        titre: 'Les marches comptées',
        description:
          'Compte les marches du passage, du bas jusqu’en haut, et donne ton chiffre au comptoir. On te dira si tu as compté comme tout le monde.',
        archetypeDominant: 'accomplisseur',
        duree: 'courte',
        theme: 'culture',
        modeInteraction: 'solo',
        recompenseBase: 2,
      },
      {
        titre: 'Trois mots pour un parfum',
        description:
          'Choisis un berlingot sans le montrer, et fais deviner son parfum à quelqu’un en trois mots maximum.',
        archetypeDominant: 'socialisateur',
        duree: 'courte',
        theme: 'jeux_esprit',
        modeInteraction: 'duo_affinite_naturelle',
        recompenseBase: 4,
      },
    ],
  },
  {
    email: 'atelier@atelierduquai.fr',
    motDePasse: 'demo-atelier-du-quai',
    nom: 'L’Atelier du Quai',
    adresse: '40 quai de la Fosse, 44000 Nantes',
    latitude: 47.211,
    longitude: -1.565,
    typeEtablissement: 'artisan',
    capaciteEstimee: 10,
    rechargement: 40,
    missions: [
      {
        titre: 'La main de l’artisan',
        description:
          'L’artisan te pose une question sur son métier. Si tu réponds juste, il t’ouvre l’atelier du fond.',
        archetypeDominant: 'explorateur',
        duree: 'moyenne',
        theme: 'art',
        modeInteraction: 'solo',
        recompenseBase: 6,
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
    visites: [0, 2, 5],
    avis: [
      {
        lieu: 0,
        note: 5,
        commentaire: 'Le meilleur filtre de l’île, et on peut y rester des heures sans qu’on vous presse.',
      },
      { lieu: 2, note: 4, commentaire: 'Petite, mais très bien choisie. Le libraire conseille vraiment.' },
    ],
  },
  {
    pseudo: 'Raphaël',
    email: 'raphael@exemple.fr',
    motDePasse: 'demo-raphael',
    curseurs: [35, 22, 30, 70],
    visites: [3, 2],
    avis: [{ lieu: 3, note: 4, commentaire: 'Ambiance au top le jeudi soir. Un peu bruyant le reste du temps.' }],
  },
  {
    pseudo: 'Inès',
    email: 'ines@exemple.fr',
    motDePasse: 'demo-ines',
    curseurs: [12, 65, 80, 30],
    visites: [0, 3, 5],
    avis: [{ lieu: 5, note: 5, commentaire: 'Venue seule, repartie avec trois numéros. La table des inconnus marche.' }],
  },
  {
    pseudo: 'Yanis',
    email: 'yanis@exemple.fr',
    motDePasse: 'demo-yanis',
    curseurs: [60, 40, 25, 55],
    visites: [7],
    avis: [{ lieu: 7, note: 5, commentaire: 'Le plat du marché valait vraiment le détour. À refaire un mardi.' }],
  },
  {
    pseudo: 'Salomé',
    email: 'salome@exemple.fr',
    motDePasse: 'demo-salome',
    curseurs: [25, 78, 72, 40],
    visites: [2, 0, 8],
    avis: [{ lieu: 8, note: 4, commentaire: 'On y entre pour les marches, on en ressort avec un sachet.' }],
  },
  {
    pseudo: 'Théo',
    email: 'theo@exemple.fr',
    motDePasse: 'demo-theo',
    curseurs: [45, 18, 35, 62],
    visites: [3, 6],
  },
  {
    pseudo: 'Léna',
    email: 'lena@exemple.fr',
    motDePasse: 'demo-lena',
    curseurs: [30, 60, 55, 50],
    visites: [1, 7],
    avis: [{ lieu: 1, note: 5, commentaire: 'Arriver à 8 h et demander ce qui sort du four : meilleure idée de la semaine.' }],
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
    titre: 'Blind test nantais',
    description:
      'Équipes de deux, trois manches, et une tournée offerte à l’équipe gagnante. Inscription sur place à partir de 19 h.',
    dansNJours: 3,
  },
  {
    lieu: 0,
    titre: 'Matin lecture sur l’île',
    description:
      'On ouvre une heure plus tôt, sans musique : venez lire au calme, le premier café est à moitié prix.',
    dansNJours: 6,
  },
  {
    lieu: 7,
    titre: 'Retour du marché',
    description:
      'Le chef revient de Talensac à midi et cuisine ce qu’il a trouvé, devant vous. Douze couverts, pas un de plus.',
    dansNJours: 2,
  },
];
