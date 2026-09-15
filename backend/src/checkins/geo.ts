// La distance à vol d'oiseau entre deux points.
//
// Elle ne sert plus à autoriser une venue — c'est le code de présence scanné
// par le commerçant qui le fait depuis. Elle sert à AFFICHER : trier les
// lieux du plus proche au plus loin, dire « à 300 m », et calculer un
// déplacement dans le journal d'administration.
const EARTH_RADIUS_METERS = 6371000;

function toRadians(degrees: number): number {
  return (degrees * Math.PI) / 180;
}

/**
 * Distance à vol d'oiseau entre deux points GPS (formule de Haversine).
 */
export function distanceInMeters(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
): number {
  const dLat = toRadians(lat2 - lat1);
  const dLon = toRadians(lon2 - lon1);

  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRadians(lat1)) *
      Math.cos(toRadians(lat2)) *
      Math.sin(dLon / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return EARTH_RADIUS_METERS * c;
}
