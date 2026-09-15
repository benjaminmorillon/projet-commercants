// ---------------------------------------------------------------------------
// Les distances.
//
// Ces deux fonctions vivaient dans `api/position.ts`, qui importe le module
// de géolocalisation d'Expo — et un fichier qui parle au téléphone ne se
// teste pas. Elles sont pures : elles vivent donc ici, où elles peuvent
// l'être. `api/position.ts` les réexporte, pour que rien n'ait à changer
// ailleurs.
// ---------------------------------------------------------------------------

const RAYON_TERRE_METRES = 6_371_000;

/**
 * Distance à vol d'oiseau entre deux points GPS (formule de Haversine).
 *
 * Elle sert à AFFICHER : trier les commerces du plus proche au plus loin et
 * dire « à 300 m ». Elle n'autorise rien — enregistrer une venue passe par le
 * code de présence scanné par le commerçant.
 */
export function distanceEnMetres(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
): number {
  const rad = (d: number) => (d * Math.PI) / 180;
  const dLat = rad(lat2 - lat1);
  const dLon = rad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(rad(lat1)) * Math.cos(rad(lat2)) * Math.sin(dLon / 2) ** 2;
  return RAYON_TERRE_METRES * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/**
 * « 80 m », « 1,2 km » : une distance telle qu'on la dit.
 *
 * L'arrondi se fait sur des ENTIERS avant la division, et non avec
 * `toFixed`. Sur 1450 m, `(1.45).toFixed(1)` rend « 1.4 » : le nombre 1,45
 * n'existe pas exactement en machine, il vaut un cheveu de moins, et
 * l'arrondi tombe du mauvais côté. Personne ne le remarquerait, et c'est bien
 * le problème.
 */
export function distanceLisible(metres: number): string {
  if (metres < 1000) {
    return `${Math.round(metres)} m`;
  }
  const centaines = Math.round(metres / 100);
  const km = Math.floor(centaines / 10);
  const reste = centaines % 10;
  return `${km},${reste} km`;
}
