import { SetMetadata } from '@nestjs/common';

// Routes accessibles sans être connecté : l'inscription, la connexion, et la
// consultation du catalogue public.
export const CLE_PUBLIC = 'route_publique';
export const Public = () => SetMetadata(CLE_PUBLIC, true);

// Routes qui portent légitimement l'identifiant d'un AUTRE joueur que celui
// qui est connecté (consulter le profil d'un ami, par exemple).
export const CLE_AUTRE_JOUEUR = 'autre_joueur_autorise';
export const AutreJoueurAutorise = () => SetMetadata(CLE_AUTRE_JOUEUR, true);
