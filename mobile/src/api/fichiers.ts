/**
 * Choisir un fichier sur le téléphone.
 *
 * Le serveur attend une « data URL » : le fichier encodé en texte, précédé de
 * son type. Le sélecteur, lui, rend deux choses différentes selon l'endroit
 * où l'application tourne — une data URL sur le web, un chemin `file://` sur
 * un vrai téléphone. Cette fonction ramène les deux au même.
 *
 * La conversion passe par `fetch` puis `FileReader`, qui existent des deux
 * côtés : c'est ce qui évite d'embarquer un module de plus pour lire un
 * fichier local.
 */
import * as DocumentPicker from 'expo-document-picker';

export interface FichierChoisi {
  nom: string;
  dataUrl: string;
}

/** Ce que le serveur accepte, dit au sélecteur pour qu'il filtre d'avance. */
export const TYPES_ACCEPTES = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];

/** `null` quand la personne referme le sélecteur sans rien choisir. */
export async function choisirFichier(): Promise<FichierChoisi | null> {
  const resultat = await DocumentPicker.getDocumentAsync({
    type: TYPES_ACCEPTES,
    multiple: false,
    copyToCacheDirectory: true,
  });

  if (resultat.canceled || resultat.assets.length === 0) {
    return null;
  }

  const asset = resultat.assets[0];
  return {
    nom: asset.name || 'document',
    dataUrl: await enDataUrl(asset.uri),
  };
}

async function enDataUrl(uri: string): Promise<string> {
  // Sur le web, le sélecteur rend déjà une data URL : rien à faire.
  if (uri.startsWith('data:')) {
    return uri;
  }

  const blob = await (await fetch(uri)).blob();

  return new Promise<string>((resoudre, rejeter) => {
    const lecteur = new FileReader();
    lecteur.onerror = () => rejeter(new Error('Impossible de lire ce fichier.'));
    lecteur.onload = () => resoudre(String(lecteur.result));
    lecteur.readAsDataURL(blob);
  });
}
