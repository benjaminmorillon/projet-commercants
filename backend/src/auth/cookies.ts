// Lecture de l'en-tête Cookie, sans dépendance : on n'a besoin que d'y
// retrouver notre propre jeton de session.

export const NOM_COOKIE_SESSION = 'session';

export function lireCookie(entete: string | undefined, nom: string): string | null {
  if (!entete) {
    return null;
  }
  for (const morceau of entete.split(';')) {
    const separateur = morceau.indexOf('=');
    if (separateur === -1) {
      continue;
    }
    if (morceau.slice(0, separateur).trim() === nom) {
      return decodeURIComponent(morceau.slice(separateur + 1).trim());
    }
  }
  return null;
}
