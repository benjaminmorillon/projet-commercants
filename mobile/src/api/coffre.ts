/**
 * Où ranger le jeton de session, selon la plateforme.
 *
 * Sur un TÉLÉPHONE, dans le coffre du système : Keychain sur iOS, Keystore
 * sur Android. La valeur y est chiffrée par le système d'exploitation, et pas
 * posée dans un fichier de préférences qu'on lirait sur un appareil débloqué.
 *
 * Dans un NAVIGATEUR (`npm run web`), ce coffre n'existe pas — il n'y a ni
 * Keychain ni Keystore — et expo-secure-store n'y fonctionne tout simplement
 * pas. On se rabat sur le stockage local du navigateur.
 *
 * Il faut le dire clairement : ce stockage-là N'EST PAS un coffre. Il est
 * lisible par tout script qui tournerait dans la page. L'aperçu web est une
 * commodité de développement — pour voir l'application sans téléphone sous la
 * main — pas une façon de la mettre entre les mains du public. L'application
 * livrée est native, et c'est le vrai coffre qui s'y applique.
 */
import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';

const surLeWeb = Platform.OS === 'web';

export async function lireDuCoffre(cle: string): Promise<string | null> {
  if (surLeWeb) {
    try {
      return globalThis.localStorage?.getItem(cle) ?? null;
    } catch {
      // Navigation privée, stockage refusé : on repart de zéro plutôt que
      // de laisser l'application planter au démarrage.
      return null;
    }
  }
  return SecureStore.getItemAsync(cle);
}

export async function ecrireDansLeCoffre(cle: string, valeur: string): Promise<void> {
  if (surLeWeb) {
    try {
      globalThis.localStorage?.setItem(cle, valeur);
    } catch {
      // Rien à faire : la session ne survivra pas au rechargement, mais elle
      // tient tant que la page reste ouverte.
    }
    return;
  }
  await SecureStore.setItemAsync(cle, valeur);
}

export async function viderLeCoffre(cle: string): Promise<void> {
  if (surLeWeb) {
    try {
      globalThis.localStorage?.removeItem(cle);
    } catch {
      // Idem.
    }
    return;
  }
  await SecureStore.deleteItemAsync(cle);
}
