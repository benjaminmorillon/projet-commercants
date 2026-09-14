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
  nuit: '#0b0913',
  fond: '#100d1b',
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
