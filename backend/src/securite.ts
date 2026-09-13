import { NextFunction, Request, Response } from 'express';

/**
 * En-têtes de sécurité posés sur toutes les réponses, et redirection vers
 * HTTPS en production. Écrit à la main plutôt qu'avec une bibliothèque : il
 * n'y a que quelques lignes, et on voit exactement ce qu'on envoie.
 */
export function enProduction(): boolean {
  return process.env.NODE_ENV === 'production';
}

// Ce que la page a le droit de charger. Tout le code et les polices sont
// servis par nous ; seules les tuiles de carte et Overpass viennent d'ailleurs.
const CSP = [
  "default-src 'self'",
  "script-src 'self'",
  // Les barres de progression et les marqueurs de carte posent leur largeur
  // et leur position en style direct : il faut l'autoriser.
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https://*.tile.openstreetmap.org",
  "connect-src 'self' https://*.tile.openstreetmap.org https://overpass-api.de",
  "font-src 'self'",
  "worker-src 'self' blob:",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
].join('; ');

export function entetesDeSecurite(requete: Request, reponse: Response, suite: NextFunction): void {
  // Redirection vers HTTPS : derrière un proxy (Heroku, Fly, Nginx...) c'est
  // `x-forwarded-proto` qui dit comment le visiteur est vraiment arrivé.
  if (enProduction()) {
    const protocole = (requete.headers['x-forwarded-proto'] as string) ?? requete.protocol;
    if (protocole !== 'https') {
      reponse.redirect(308, `https://${requete.headers.host}${requete.originalUrl}`);
      return;
    }
    // Et une fois en HTTPS, on demande au navigateur de ne plus jamais
    // revenir en clair sur ce domaine.
    reponse.setHeader('Strict-Transport-Security', 'max-age=15552000; includeSubDomains');
  }

  reponse.setHeader('Content-Security-Policy', CSP);
  // Pas d'interprétation « créative » du type de fichier par le navigateur.
  reponse.setHeader('X-Content-Type-Options', 'nosniff');
  // Le site ne doit pas pouvoir être encadré dans une autre page (clickjacking).
  reponse.setHeader('X-Frame-Options', 'DENY');
  // On n'envoie pas l'adresse complète de nos pages aux sites externes.
  reponse.setHeader('Referrer-Policy', 'same-origin');
  // Aucune de ces permissions n'est utilisée par le site.
  reponse.setHeader('Permissions-Policy', 'camera=(), microphone=(), payment=()');

  suite();
}
