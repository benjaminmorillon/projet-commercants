/**
 * Où est le joueur.
 *
 * Un point à part, parce que la position n'est pas une donnée comme une
 * autre : elle demande une autorisation, elle peut être refusée, et elle peut
 * simplement ne pas arriver (en intérieur, en sous-sol, au démarrage du GPS).
 *
 * L'application doit rester utilisable dans les trois cas. On ne rend donc
 * jamais une erreur brute : on rend un ÉTAT, que l'écran sait afficher.
 */
import * as Location from 'expo-location';

export type EtatPosition =
  | { etat: 'attente' }
  | { etat: 'refusee' }
  | { etat: 'indisponible'; raison: string }
  | { etat: 'connue'; latitude: number; longitude: number; precisionMetres: number | null };

export async function demanderPosition(): Promise<EtatPosition> {
  let autorisation: Location.LocationPermissionResponse;
  try {
    autorisation = await Location.requestForegroundPermissionsAsync();
  } catch (e) {
    return { etat: 'indisponible', raison: (e as Error).message };
  }

  if (!autorisation.granted) {
    return { etat: 'refusee' };
  }

  try {
    const point = await Location.getCurrentPositionAsync({
      // « Balanced » suffit très largement : le rayon de validation est de
      // 150 m. Demander la précision maximale userait la batterie et ferait
      // attendre plusieurs secondes de plus pour un gain nul.
      accuracy: Location.Accuracy.Balanced,
    });

    return {
      etat: 'connue',
      latitude: point.coords.latitude,
      longitude: point.coords.longitude,
      precisionMetres: point.coords.accuracy ?? null,
    };
  } catch (e) {
    return { etat: 'indisponible', raison: (e as Error).message };
  }
}

/**
 * Distance à vol d'oiseau entre deux points, en mètres (formule de Haversine).
 *
 * La même que côté serveur — mais calculée ici pour AFFICHER une distance,
 * jamais pour décider. C'est le serveur qui tranche si un check-in est valide,
 * avec sa propre mesure : un téléphone peut mentir sur sa position, pas le
 * calcul du serveur sur ce qu'il a reçu.
 */
export function distanceEnMetres(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
): number {
  const RAYON_TERRE = 6371000;
  const rad = (d: number) => (d * Math.PI) / 180;
  const dLat = rad(lat2 - lat1);
  const dLon = rad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(rad(lat1)) * Math.cos(rad(lat2)) * Math.sin(dLon / 2) ** 2;
  return RAYON_TERRE * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/** « 80 m », « 1,2 km » : une distance telle qu'on la dit. */
export function distanceLisible(metres: number): string {
  if (metres < 1000) {
    return `${Math.round(metres)} m`;
  }
  return `${(metres / 1000).toFixed(1).replace('.', ',')} km`;
}
