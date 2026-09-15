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

// Les distances sont calculées ailleurs, dans un fichier qui ne parle pas au
// téléphone et peut donc être testé. On les réexporte ici : les écrans les
// importaient depuis ce module, et il n'y a aucune raison de les faire
// changer d'adresse.
export { distanceEnMetres, distanceLisible } from '../carte/distances';
