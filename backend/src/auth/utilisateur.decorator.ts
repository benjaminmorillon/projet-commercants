import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { UtilisateurConnecte } from './auth.service';

/** La personne connectée, telle que le garde l'a résolue depuis le cookie. */
export const Utilisateur = createParamDecorator(
  (_donnees: unknown, contexte: ExecutionContext): UtilisateurConnecte =>
    contexte.switchToHttp().getRequest().utilisateur,
);
