import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  applyDecorators,
  UseGuards,
} from '@nestjs/common';
import { MarqueAdmin } from './admin.decorator';

/**
 * Le droit d'administrer le site.
 *
 * AuthGuard (global) a déjà vérifié que quelqu'un est connecté et posé le
 * compte sur la requête. Il ne reste qu'à vérifier le drapeau.
 */
@Injectable()
export class AdminGuard implements CanActivate {
  canActivate(contexte: ExecutionContext): boolean {
    const requete = contexte.switchToHttp().getRequest();

    if (!requete.utilisateur?.administrateur) {
      // Même message qu'une page inexistante ne serait pas plus sûr ici :
      // il faut être connecté pour arriver jusqu'à ce point.
      throw new ForbiddenException("Cet espace est réservé à l'administration.");
    }

    return true;
  }
}

// Le décorateur à utiliser sur les contrôleurs d'administration : il pose la
// marque ET le garde, pour qu'on ne puisse pas en oublier un des deux.
export const Admin = () => applyDecorators(MarqueAdmin(), UseGuards(AdminGuard));
