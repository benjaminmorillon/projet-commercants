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

// ---------------------------------------------------------------------------
// D'où vient le jeton de session, selon le client.
//
// Sur le WEB, il voyage dans un cookie `httpOnly` : le JavaScript de la page
// ne peut pas le lire, donc un script injecté ne peut pas le voler et s'en
// servir ailleurs.
//
// Sur un TÉLÉPHONE, il n'y a pas de navigateur pour porter un cookie, et pas
// de page web dans laquelle un script étranger pourrait s'injecter. Le jeton
// est donc remis à l'application, qui le range dans le coffre du téléphone
// (Keychain sur iOS, Keystore sur Android) et le renvoie dans l'en-tête
// `Authorization` à chaque requête.
//
// Le serveur accepte les deux, et n'a pas besoin de savoir lequel il a
// affaire : il ne lui faut qu'un jeton.
// ---------------------------------------------------------------------------

/** Le nom que l'application mobile se donne pour demander un jeton. */
export const CLIENT_MOBILE = 'mobile';

export function lireJetonAutorisation(entete: string | undefined): string | null {
  if (!entete) {
    return null;
  }
  const morceaux = entete.trim().split(/\s+/);
  if (morceaux.length !== 2 || morceaux[0].toLowerCase() !== 'bearer') {
    return null;
  }
  return morceaux[1] || null;
}

/** Le jeton de la requête, d'où qu'il vienne. */
export function jetonDeLaRequete(entetes: {
  cookie?: string;
  authorization?: string;
}): string | null {
  return (
    lireJetonAutorisation(entetes?.authorization) ??
    lireCookie(entetes?.cookie, NOM_COOKIE_SESSION)
  );
}
