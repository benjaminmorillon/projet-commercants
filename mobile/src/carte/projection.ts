// ---------------------------------------------------------------------------
// Le plan du quartier.
//
// Pas une carte : un PLAN. Il n'y a ni rues ni bâtiments — seulement le
// joueur au centre, les commerces posés à leur vraie direction et à leur
// vraie distance, et les quartiers déjà levés.
//
// C'est un choix assumé : une vraie carte demande une bibliothèque native,
// une version d'essai fabriquée à chaque fois, et une clé Google sur Android.
// Ce plan-là ne demande rien, et répond déjà aux deux questions qu'on se pose
// en regardant une carte : qu'est-ce qu'il y a autour de moi, et où suis-je
// allé ?
//
// Tout est ici, pur et testé. L'écran ne fait que dessiner ce que ces
// fonctions calculent.
// ---------------------------------------------------------------------------

export interface PointGps {
  latitude: number;
  longitude: number;
}

export interface PointPlan {
  /** Pixels depuis le centre, positif vers la droite (l'est). */
  x: number;
  /** Pixels depuis le centre, positif vers le bas (le sud). */
  y: number;
}

/**
 * Un degré de latitude fait toujours à peu près la même longueur : la Terre
 * est presque ronde, et on ne cherche pas la précision géodésique — on place
 * des points à quelques centaines de mètres les uns des autres.
 */
export const METRES_PAR_DEGRE_LATITUDE = 111_320;

/**
 * Un degré de longitude, lui, rétrécit à mesure qu'on monte vers les pôles.
 * À Paris il vaut environ 73 km, contre 111 km à l'équateur. Ignorer ça
 * étirerait le plan d'un tiers dans le sens est-ouest.
 */
export function metresParDegreLongitude(latitude: number): number {
  return METRES_PAR_DEGRE_LATITUDE * Math.cos((latitude * Math.PI) / 180);
}

/**
 * Où poser un point sur le plan, en pixels depuis le centre.
 *
 * L'axe vertical est INVERSÉ par rapport au monde : sur un écran, y grandit
 * vers le bas, alors que la latitude grandit vers le nord. Sans cette
 * inversion, le plan serait un miroir — et on enverrait les gens dans la
 * direction opposée.
 */
export function versLePlan(
  centre: PointGps,
  point: PointGps,
  metresParPixel: number,
): PointPlan {
  const dLat = point.latitude - centre.latitude;
  const dLon = point.longitude - centre.longitude;

  const estOuest = dLon * metresParDegreLongitude(centre.latitude);
  const nordSud = dLat * METRES_PAR_DEGRE_LATITUDE;

  return {
    x: estOuest / metresParPixel,
    y: -nordSud / metresParPixel,
  };
}

/**
 * Les lieux du quartier : les plus proches, et rien d'autre.
 *
 * Sans ce tri, l'échelle est dictée par le commerce le plus lointain. Sur un
 * jeu de données étalé sur toute une ville, le plan se dézoome jusqu'à ce
 * qu'un quartier de 500 m tienne dans dix pixels — et le voile, qui est tout
 * l'intérêt de la carte, devient invisible sous les pastilles.
 *
 * L'écran s'appelle « Le quartier » : il montre le quartier.
 */
export function lieuxDuQuartier<T extends PointGps>(
  centre: PointGps,
  lieux: T[],
  combien = 10,
): T[] {
  return [...lieux]
    .map((lieu) => {
      const enMetres = versLePlan(centre, lieu, 1);
      return { lieu, distance: Math.hypot(enMetres.x, enMetres.y) };
    })
    .sort((a, b) => a.distance - b.distance)
    .slice(0, Math.max(1, combien))
    .map((x) => x.lieu);
}

/**
 * L'échelle la plus serrée qu'on s'autorise.
 *
 * Un plan qui s'appelle « Le quartier » doit montrer au moins un quartier
 * entier, et un bout de ses voisins — sinon le voile n'a plus de sens : on
 * ne voit qu'une grande zone colorée sans savoir où elle s'arrête.
 *
 * Le cas arrive pour de bon : plusieurs commerces à la même adresse, ou un
 * joueur au milieu d'une rue commerçante. Sans ce plancher, le plan se
 * rapproche jusqu'à ce qu'un quartier déborde de l'écran.
 */
export function echelleMinimale(
  centre: PointGps,
  tailleDegres: number,
  cotePixels: number,
  quartiersDeLarge = 2.5,
): number {
  const largeurQuartier = tailleDegres * metresParDegreLongitude(centre.latitude);
  return (largeurQuartier * quartiersDeLarge) / cotePixels;
}

/**
 * L'échelle qui fait tenir tout le monde dans le cadre.
 *
 * `rayonPixels` est la demi-largeur du plan. On prend le point le plus
 * éloigné et on le place au bord, avec un peu de marge pour que sa pastille
 * ne soit pas coupée en deux.
 *
 * Les bornes ne sont pas cosmétiques : sans minimum, deux commerces voisins
 * donneraient une échelle où un pas de travers traverse la moitié de l'écran ;
 * sans maximum, un lieu à l'autre bout du pays écraserait tout le quartier en
 * un seul point.
 */
export function echellePourTout(
  centre: PointGps,
  points: PointGps[],
  rayonPixels: number,
  minimum = 1.5,
  maximum = 40,
): number {
  if (points.length === 0 || rayonPixels <= 0) {
    return minimum;
  }

  let plusLoin = 0;
  for (const point of points) {
    const enMetres = versLePlan(centre, point, 1);
    plusLoin = Math.max(plusLoin, Math.hypot(enMetres.x, enMetres.y));
  }

  if (plusLoin === 0) {
    return minimum;
  }

  // 0,88 : la marge qui garde la pastille du point le plus lointain entière.
  const ideale = plusLoin / (rayonPixels * 0.88);
  return Math.min(maximum, Math.max(minimum, ideale));
}

// ---------------------------------------------------------------------------
// Les quartiers.
//
// Le monde est découpé en cases de `tailleDegres` de côté, et chaque case
// porte une clé « ligne:colonne ». Le serveur dit lesquelles sont levées ;
// il reste à savoir où les dessiner.
// ---------------------------------------------------------------------------

export interface Quartier {
  cle: string;
  /** Le coin sud-ouest, en degrés. */
  sud: number;
  ouest: number;
}

/** Retrouve la position d'un quartier à partir de sa clé. */
export function quartierDepuisLaCle(cle: string, tailleDegres: number): Quartier | null {
  const morceaux = cle.split(':');
  if (morceaux.length !== 2) return null;

  const ligne = Number(morceaux[0]);
  const colonne = Number(morceaux[1]);
  // `Number('')` vaut zéro, et zéro est une coordonnée valide : une clé
  // tronquée dessinerait un quartier au large de l'Afrique.
  if (morceaux[0] === '' || morceaux[1] === '') return null;
  if (!Number.isFinite(ligne) || !Number.isFinite(colonne)) return null;

  return { cle, sud: ligne * tailleDegres, ouest: colonne * tailleDegres };
}

export interface RectanglePlan {
  cle: string;
  x: number;
  y: number;
  largeur: number;
  hauteur: number;
}

/** Le rectangle à dessiner pour un quartier, en pixels depuis le centre. */
export function quartierSurLePlan(
  quartier: Quartier,
  centre: PointGps,
  tailleDegres: number,
  metresParPixel: number,
): RectanglePlan {
  // Le coin NORD-ouest : sur un écran, un rectangle se pose par son coin haut
  // gauche, et le haut c'est le nord.
  const coin = versLePlan(
    centre,
    { latitude: quartier.sud + tailleDegres, longitude: quartier.ouest },
    metresParPixel,
  );

  return {
    cle: quartier.cle,
    x: coin.x,
    y: coin.y,
    largeur: (tailleDegres * metresParDegreLongitude(centre.latitude)) / metresParPixel,
    hauteur: (tailleDegres * METRES_PAR_DEGRE_LATITUDE) / metresParPixel,
  };
}
