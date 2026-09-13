// Titres et objets de collection (section 2.9 des specs) : la partie du
// système de récompenses qui ne sert à rien mécaniquement, mais qui raconte
// ce que le joueur a fait. Tout est décrit ici en fonctions pures.

export interface StatsCollection {
  niveau: number;
  quartiersLeves: number;
  avisPublies: number;
  duosAccomplis: number;
  dons: number;
  lieuxDifferentsVisites: number;
  visitesParLieu: Map<string, number>;
  typesEtablissementVisites: Set<string>;
  themesAccomplis: Set<string>;
}

export function statsVides(): StatsCollection {
  return {
    niveau: 1,
    quartiersLeves: 0,
    avisPublies: 0,
    duosAccomplis: 0,
    dons: 0,
    lieuxDifferentsVisites: 0,
    visitesParLieu: new Map(),
    typesEtablissementVisites: new Set(),
    themesAccomplis: new Set(),
  };
}

// ---------------------------------------------------------------------------
// Les titres : une étiquette que le joueur porte sur son profil.
// ---------------------------------------------------------------------------

export interface Titre {
  id: string;
  libelle: string;
  // Ce qu'il faut faire pour l'obtenir, formulé pour le joueur.
  condition: string;
  estObtenu: (stats: StatsCollection) => boolean;
}

function visitesMax(stats: StatsCollection): number {
  let max = 0;
  stats.visitesParLieu.forEach((n) => {
    if (n > max) max = n;
  });
  return max;
}

export const TITRES: Titre[] = [
  {
    id: 'nouveau_venu',
    libelle: 'Nouveau venu',
    condition: 'Offert dès l’inscription.',
    estObtenu: () => true,
  },
  {
    id: 'habitue_du_quartier',
    libelle: 'Habitué du quartier',
    condition: 'Reviens 5 fois dans le même établissement.',
    estObtenu: (stats) => visitesMax(stats) >= 5,
  },
  {
    id: 'arpenteur',
    libelle: 'Arpenteur',
    condition: 'Lève 5 quartiers sur la carte.',
    estObtenu: (stats) => stats.quartiersLeves >= 5,
  },
  {
    id: 'curieux_des_rues',
    libelle: 'Curieux des rues',
    condition: 'Visite 10 établissements différents.',
    estObtenu: (stats) => stats.lieuxDifferentsVisites >= 10,
  },
  {
    id: 'bon_public',
    libelle: 'Bon public',
    condition: 'Publie 5 avis.',
    estObtenu: (stats) => stats.avisPublies >= 5,
  },
  {
    id: 'ame_du_duo',
    libelle: 'Âme du duo',
    condition: 'Accomplis 3 missions à deux.',
    estObtenu: (stats) => stats.duosAccomplis >= 3,
  },
  {
    id: 'main_tendue',
    libelle: 'Main tendue',
    condition: 'Donne 3 fois tes jetons à une cause.',
    estObtenu: (stats) => stats.dons >= 3,
  },
  {
    id: 'figure_locale',
    libelle: 'Figure locale',
    condition: 'Atteins le niveau 5.',
    estObtenu: (stats) => stats.niveau >= 5,
  },
];

export function titresObtenus(stats: StatsCollection): Titre[] {
  return TITRES.filter((titre) => titre.estObtenu(stats));
}

export function titreEstObtenu(titreId: string, stats: StatsCollection): boolean {
  const titre = TITRES.find((t) => t.id === titreId);
  return Boolean(titre && titre.estObtenu(stats));
}

export function libelleTitre(titreId: string | null): string | null {
  if (!titreId) {
    return null;
  }
  return TITRES.find((t) => t.id === titreId)?.libelle ?? null;
}

// ---------------------------------------------------------------------------
// Les objets de collection : deux séries à compléter, un item par type de
// lieu poussé et un item par thème de mission accompli.
// ---------------------------------------------------------------------------

export interface ItemCollection {
  id: string;
  nom: string;
  icone: string;
  // Ce qui le fait tomber dans la collection.
  obtenuPar: string;
}

export interface SerieCollection {
  id: string;
  nom: string;
  description: string;
  items: (ItemCollection & { obtenu: boolean })[];
  obtenus: number;
  total: number;
  complete: boolean;
}

// Une clé par type d'établissement, avec les orthographes courantes qu'un
// commerçant peut saisir (le champ est du texte libre).
export const ITEMS_LIEUX: (ItemCollection & { correspond: (type: string) => boolean })[] = [
  { id: 'bar', nom: 'Le sous-bock', icone: '🍺', obtenuPar: 'Pousser la porte d’un bar', correspond: (t) => /bar|pub|brasserie/i.test(t) },
  { id: 'restaurant', nom: 'La serviette pliée', icone: '🍽️', obtenuPar: 'Pousser la porte d’un restaurant', correspond: (t) => /restaurant|resto|pizz|burger/i.test(t) },
  { id: 'cafe', nom: 'La tasse ébréchée', icone: '☕', obtenuPar: 'Pousser la porte d’un café', correspond: (t) => /caf[eé]|salon de th/i.test(t) },
  { id: 'hotel', nom: 'La clé de chambre', icone: '🛏️', obtenuPar: 'Pousser la porte d’un hôtel', correspond: (t) => /h[oô]tel|auberge/i.test(t) },
  { id: 'boulangerie', nom: 'Le sachet de papier', icone: '🥐', obtenuPar: 'Pousser la porte d’une boulangerie', correspond: (t) => /boulang|p[aâ]tiss/i.test(t) },
  { id: 'librairie', nom: 'Le marque-page', icone: '📚', obtenuPar: 'Pousser la porte d’une librairie', correspond: (t) => /libr|livre/i.test(t) },
  { id: 'culture', nom: 'Le ticket déchiré', icone: '🎭', obtenuPar: 'Pousser la porte d’un lieu culturel', correspond: (t) => /mus[eé]e|galerie|cin[eé]ma|th[eé][aâ]tre/i.test(t) },
  { id: 'sport', nom: 'Le bracelet d’entrée', icone: '🏋️', obtenuPar: 'Pousser la porte d’un lieu sportif', correspond: (t) => /sport|salle|gym/i.test(t) },
];

// Un item par thème de la taxonomie des missions (section 2.10).
export const ITEMS_THEMES: (ItemCollection & { theme: string })[] = [
  { id: 'theme_culture', theme: 'culture', nom: 'Le carnet de notes', icone: '📜', obtenuPar: 'Accomplir une mission culture' },
  { id: 'theme_gastronomie', theme: 'gastronomie', nom: 'La fourchette tordue', icone: '🍴', obtenuPar: 'Accomplir une mission gastronomie' },
  { id: 'theme_musique', theme: 'musique', nom: 'Le médiator perdu', icone: '🎵', obtenuPar: 'Accomplir une mission musique' },
  { id: 'theme_art', theme: 'art', nom: 'Le crayon usé', icone: '🎨', obtenuPar: 'Accomplir une mission art' },
  { id: 'theme_humour_insolite', theme: 'humour_insolite', nom: 'Le nez rouge', icone: '🤡', obtenuPar: 'Accomplir une mission humour / insolite' },
  { id: 'theme_sport', theme: 'sport', nom: 'Le lacet cassé', icone: '👟', obtenuPar: 'Accomplir une mission sport' },
  { id: 'theme_jeux_esprit', theme: 'jeux_esprit', nom: 'La pièce du puzzle', icone: '🧩', obtenuPar: 'Accomplir une mission jeux d’esprit' },
];

function enSerie(
  id: string,
  nom: string,
  description: string,
  items: (ItemCollection & { obtenu: boolean })[],
): SerieCollection {
  const obtenus = items.filter((i) => i.obtenu).length;
  return {
    id,
    nom,
    description,
    items,
    obtenus,
    total: items.length,
    complete: obtenus === items.length,
  };
}

export function seriesCollection(stats: StatsCollection): SerieCollection[] {
  const typesVisites = [...stats.typesEtablissementVisites];

  const lieux = ITEMS_LIEUX.map(({ correspond, ...item }) => ({
    ...item,
    obtenu: typesVisites.some((type) => correspond(type)),
  }));

  const themes = ITEMS_THEMES.map(({ theme, ...item }) => ({
    ...item,
    obtenu: stats.themesAccomplis.has(theme),
  }));

  return [
    enSerie(
      'lieux',
      'Souvenirs de comptoir',
      'Un objet ramassé dans chaque type d’endroit où tu as posé le pied.',
      lieux,
    ),
    enSerie(
      'themes',
      'Carnet de missions',
      'Un objet par thème de mission que tu as mené jusqu’au bout.',
      themes,
    ),
  ];
}
