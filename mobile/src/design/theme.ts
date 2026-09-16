/**
 * Le système de design, repris tel quel de l'identité du site.
 *
 * Les mêmes valeurs, aux mêmes noms : le jour où l'accent change sur le web,
 * il change ici de la même façon. Deux fichiers à garder d'accord, c'est une
 * dette — mais elle est explicite et tient en trente lignes, là où partager
 * réellement les jetons entre une feuille CSS et React Native demanderait un
 * outil de build supplémentaire pour un gain nul à ce stade.
 *
 * Le parti pris reste le même : la nuit, une seule couleur vive pour
 * l'action, la hiérarchie par la lumière.
 */
export const couleurs = {
  // Le fond est volontairement très bas : c'est l'écart avec les cartes, et
  // lui seul, qui les fait remonter vers le lecteur. Il reste bleu-violet —
  // ce n'est jamais un noir d'écran éteint.
  nuit: '#050410',
  fond: '#08060f',
  carte: '#171327',
  surface: '#1e1932',
  haut: '#282141',

  encre: '#f3f1fa',
  encreDouce: '#a49dbe',
  encreFaible: '#6f6789',
  encreInverse: '#ffffff',

  trait: '#241e3a',
  traitFort: '#342c52',

  accent: '#7c5cff',
  accentClair: '#9d85ff',
  accentFonce: '#6344e8',
  accentDoux: 'rgba(124, 92, 255, 0.14)',
  accentEncre: '#c3b2ff',

  positif: '#34d399',
  positifDoux: 'rgba(52, 211, 153, 0.14)',
  negatif: '#fb7185',
  negatifDoux: 'rgba(251, 113, 133, 0.14)',
  attention: '#fbbf24',
  attentionDoux: 'rgba(251, 191, 36, 0.13)',
} as const;

export const rayons = {
  sm: 10,
  md: 16,
  lg: 22,
  plein: 999,
} as const;

/** Une échelle d'espacement, pour que les marges ne soient pas au jugé. */
export const espaces = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
} as const;

export const typo = {
  titre: { fontSize: 30, fontWeight: '700' as const, letterSpacing: -0.6 },
  sousTitre: { fontSize: 17, fontWeight: '600' as const, letterSpacing: -0.2 },
  corps: { fontSize: 15, fontWeight: '400' as const },
  petit: { fontSize: 13, fontWeight: '400' as const },
  minuscule: { fontSize: 11, fontWeight: '600' as const, letterSpacing: 0.3 },
} as const;

/** La lueur violette du bouton principal. Elle appartient au fond violet. */
export const lueurAccent = {
  shadowColor: couleurs.accent,
  shadowOpacity: 0.4,
  shadowRadius: 14,
  shadowOffset: { width: 0, height: 6 },
  elevation: 6,
};

/**
 * La couleur des écrans.
 *
 * Tout l'écran était du même bleu-violet, page après page : rien ne disait
 * au joueur qu'il venait de changer d'endroit.
 *
 * Ce n'est PAS l'action qui change de couleur. Si les boutons changeaient de
 * teinte d'un écran à l'autre, on perdrait le seul repère fiable de
 * l'interface — et l'écran du quartier, avec ses boutons verts, dirait
 * « réussi » sur chacun d'eux. Le violet reste la couleur de l'action.
 *
 * C'est l'ÉCRAN qui a une teinte, et elle n'apparaît qu'à trois endroits :
 * un trait court au-dessus du titre, l'onglet courant dans la barre du bas,
 * et un halo très pâle en haut. Trois touches, jamais une quatrième.
 *
 * Mêmes valeurs que le site, à l'identique — voir « 27. La couleur des
 * pages » dans backend/public/style.css.
 */
export type NomUnivers = 'defaut' | 'profil' | 'missions' | 'carte' | 'code';

interface Univers {
  /** Le trait de signature et l'icône de l'onglet courant. */
  teinte: string;
  /** La même couleur, éclaircie pour rester lisible sur le fond noir. */
  encre: string;
  /** Les trois composantes du halo, à donner à `rgba()` avec l'opacité. */
  halo: string;
}

export const univers: Record<NomUnivers, Univers> = {
  // Les écrans sans identité propre — Lieux, Offres, Amis, Duos, l'espace
  // commerçant — gardent le violet du site. Quatre teintes, pas onze :
  // au-delà, ce n'est plus un repère, c'est un arc-en-ciel.
  defaut: { teinte: '#7c5cff', encre: '#c3b2ff', halo: '124, 92, 255' },

  // La page de soi garde la couleur mère.
  profil: { teinte: '#7c5cff', encre: '#c3b2ff', halo: '124, 92, 255' },

  // Déjà la couleur de la première voie de l'arbre.
  missions: { teinte: '#38bdf8', encre: '#7dd3fc', halo: '56, 189, 248' },

  // Un vert d'eau, plus bleu que le vert « réussi » (#34d399) : on ne les
  // confond pas.
  carte: { teinte: '#2dd4bf', encre: '#5eead4', halo: '45, 212, 191' },

  // L'écran qu'on tend à quelqu'un par-dessus un comptoir : le plus présent
  // des quatre.
  code: { teinte: '#f59e0b', encre: '#fcd34d', halo: '245, 158, 11' },
};
