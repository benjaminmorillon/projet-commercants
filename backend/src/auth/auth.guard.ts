import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthService } from './auth.service';
import { lireCookie, NOM_COOKIE_SESSION } from './cookies';
import { CLE_AUTRE_JOUEUR, CLE_PUBLIC } from './public.decorator';

/**
 * Deux vérifications, appliquées à toutes les routes d'un coup :
 *
 * 1. être connecté (sauf routes marquées @Public) ;
 * 2. n'agir que pour soi — dès qu'une route porte un identifiant de joueur
 *    (`/players/:id/...`, un paramètre ou un champ `playerId`), il doit être
 *    celui de la personne connectée. C'est ce qui empêche de piloter le
 *    compte de quelqu'un d'autre en changeant l'identifiant dans l'URL.
 */
@Injectable()
export class AuthGuard implements CanActivate {
  constructor(
    private readonly auth: AuthService,
    private readonly reflector: Reflector,
  ) {}

  async canActivate(contexte: ExecutionContext): Promise<boolean> {
    const cibles = [contexte.getHandler(), contexte.getClass()];

    if (this.reflector.getAllAndOverride<boolean>(CLE_PUBLIC, cibles)) {
      return true;
    }

    const requete = contexte.switchToHttp().getRequest();
    const jeton = lireCookie(requete.headers?.cookie, NOM_COOKIE_SESSION);
    const utilisateur = await this.auth.utilisateurDuJeton(jeton);

    if (!utilisateur) {
      throw new UnauthorizedException('Connecte-toi pour accéder à cette page.');
    }
    requete.utilisateur = utilisateur;

    if (this.reflector.getAllAndOverride<boolean>(CLE_AUTRE_JOUEUR, cibles)) {
      return true;
    }

    const revendique = this.identifiantJoueurRevendique(requete);
    if (revendique && revendique !== utilisateur.id) {
      throw new ForbiddenException("Tu ne peux agir que pour ton propre compte.");
    }

    return true;
  }

  // L'identifiant de joueur que la requête prétend représenter, s'il y en a un.
  private identifiantJoueurRevendique(requete: {
    params?: Record<string, string>;
    body?: Record<string, unknown>;
    route?: { path?: string };
    path?: string;
  }): string | null {
    const params = requete.params ?? {};

    if (typeof params.playerId === 'string') {
      return params.playerId;
    }

    // `/players/:id/...` : le `:id` désigne toujours le joueur.
    const chemin = requete.route?.path ?? requete.path ?? '';
    if (/^\/?players\//.test(chemin) && typeof params.id === 'string') {
      return params.id;
    }

    const corps = requete.body ?? {};
    if (typeof corps.playerId === 'string') {
      return corps.playerId;
    }

    return null;
  }
}
