/**
 * Le seul endroit d'où part une requête vers le serveur.
 *
 * Il porte trois responsabilités, et rien d'autre :
 *  1. savoir où joindre le serveur ;
 *  2. ranger le jeton de session dans le coffre du téléphone et le joindre à
 *     chaque requête ;
 *  3. transformer une réponse d'erreur en message lisible en français.
 *
 * Aucun écran ne parle directement au réseau : le jour où l'adresse change,
 * où le jeton se renouvelle ou où l'on ajoute un en-tête, il n'y a qu'ici à
 * toucher.
 */
import Constants from 'expo-constants';
import { ecrireDansLeCoffre, lireDuCoffre, viderLeCoffre } from './coffre';

const CLE_JETON = 'session';

/**
 * L'adresse du serveur.
 *
 * En développement, un téléphone ne sait pas ce qu'est « localhost » : ce
 * serait le téléphone lui-même. On déduit donc l'adresse de la machine de
 * développement de celle depuis laquelle Expo sert l'application.
 *
 * En production, elle vient de la configuration (app.json → extra.apiUrl).
 */
function adresseServeur(): string {
  const configuree = (Constants.expoConfig?.extra as { apiUrl?: string } | undefined)?.apiUrl;
  if (configuree) {
    return configuree.replace(/\/$/, '');
  }

  // Sur un vrai téléphone en développement, l'adresse de la machine est celle
  // depuis laquelle Expo sert l'application.
  const hote = Constants.expoConfig?.hostUri?.split(':')[0];
  if (hote) {
    return `http://${hote}:3000`;
  }

  // En version web (`npm run web`), c'est le navigateur qui sait où il est.
  if (typeof window !== 'undefined' && window.location?.hostname) {
    return `http://${window.location.hostname}:3000`;
  }

  // Dernier recours : utile seulement pour l'émulateur Android, dont
  // 10.0.2.2 désigne la machine hôte.
  return 'http://10.0.2.2:3000';
}

export const URL_SERVEUR = adresseServeur();

// --- Le jeton --------------------------------------------------------------
//
// Le rangement lui-même dépend de la plateforme (voir coffre.ts). Ici on ne
// s'occupe que de le garder aussi en mémoire, pour ne pas aller le relire à
// chaque requête.

let jetonEnMemoire: string | null = null;

export async function chargerJeton(): Promise<string | null> {
  if (jetonEnMemoire === null) {
    jetonEnMemoire = await lireDuCoffre(CLE_JETON);
  }
  return jetonEnMemoire;
}

export async function rangerJeton(jeton: string): Promise<void> {
  jetonEnMemoire = jeton;
  await ecrireDansLeCoffre(CLE_JETON, jeton);
}

export async function oublierJeton(): Promise<void> {
  jetonEnMemoire = null;
  await viderLeCoffre(CLE_JETON);
}

// --- Les requêtes ----------------------------------------------------------

export class ErreurApi extends Error {
  constructor(
    message: string,
    readonly statut: number,
  ) {
    super(message);
    this.name = 'ErreurApi';
  }
}

interface Options {
  methode?: 'GET' | 'POST' | 'PUT' | 'DELETE';
  corps?: unknown;
  /** Pour la connexion : la requête part sans jeton, forcément. */
  sansJeton?: boolean;
}

export async function appeler<T>(chemin: string, options: Options = {}): Promise<T> {
  const jeton = options.sansJeton ? null : await chargerJeton();

  const entetes: Record<string, string> = {
    // C'est cet en-tête qui dit au serveur de rendre le jeton dans sa réponse
    // plutôt que de poser un cookie que le téléphone ne saurait pas porter.
    'X-Client': 'mobile',
  };
  if (options.corps !== undefined) {
    entetes['Content-Type'] = 'application/json';
  }
  if (jeton) {
    entetes.Authorization = `Bearer ${jeton}`;
  }

  let reponse: Response;
  try {
    reponse = await fetch(`${URL_SERVEUR}${chemin}`, {
      method: options.methode ?? 'GET',
      headers: entetes,
      body: options.corps === undefined ? undefined : JSON.stringify(options.corps),
    });
  } catch {
    // `fetch` ne lève que sur un problème de réseau : c'est le seul cas où on
    // peut affirmer que le serveur n'a pas été joint.
    throw new ErreurApi(
      `Impossible de joindre le serveur (${URL_SERVEUR}). Vérifie qu'il tourne et que le téléphone est sur le même réseau.`,
      0,
    );
  }

  const texte = await reponse.text();
  const donnees = texte ? sansPlanter(texte) : null;

  if (!reponse.ok) {
    throw new ErreurApi(messageDe(donnees), reponse.status);
  }

  return donnees as T;
}

function sansPlanter(texte: string): unknown {
  try {
    return JSON.parse(texte);
  } catch {
    return null;
  }
}

/**
 * Le message d'erreur, tel que le serveur l'a écrit.
 *
 * NestJS renvoie soit une phrase, soit un tableau de phrases quand plusieurs
 * champs sont en cause. On rend toujours quelque chose de lisible : un écran
 * ne doit jamais afficher « undefined ».
 */
function messageDe(donnees: unknown): string {
  const message = (donnees as { message?: unknown } | null)?.message;
  if (Array.isArray(message)) {
    return message.join('\n');
  }
  if (typeof message === 'string' && message.trim() !== '') {
    return message;
  }
  return 'Une erreur est survenue.';
}

/** L'adresse d'une photo, ou null s'il n'y en a pas. */
export function urlPhoto(
  sujet: 'joueur' | 'commerce',
  id: string | undefined,
  version: number | null | undefined,
): string | null {
  if (!id || !version) {
    return null;
  }
  return `${URL_SERVEUR}/photos/${sujet}/${encodeURIComponent(id)}?v=${version}`;
}

/**
 * La source d'image à donner à `<Image>`, jeton compris.
 *
 * Le portrait d'un joueur n'est visible que par quelqu'un de connecté. Or une
 * balise image ne joint pas d'elle-même l'en-tête d'autorisation : sans ça,
 * toutes les photos de joueurs reviendraient en 401 et l'application
 * n'afficherait que des initiales.
 *
 * React Native permet de joindre des en-têtes à une image ; c'est ce qu'on
 * fait ici. (La photo d'un commerce est publique, elle n'en a pas besoin —
 * mais l'envoyer ne coûte rien et évite deux chemins de code.)
 */
export async function sourcePhoto(
  sujet: 'joueur' | 'commerce',
  id: string | undefined,
  version: number | null | undefined,
): Promise<{ uri: string; headers?: Record<string, string> } | null> {
  const uri = urlPhoto(sujet, id, version);
  if (!uri) {
    return null;
  }
  const jeton = await chargerJeton();
  return jeton ? { uri, headers: { Authorization: `Bearer ${jeton}` } } : { uri };
}
