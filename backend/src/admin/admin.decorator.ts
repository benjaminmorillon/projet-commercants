import { SetMetadata } from '@nestjs/common';

// Marque une route comme réservée à l'administration du site.
//
// Deux effets, et il faut les deux :
//  - AdminGuard exige que le compte connecté ait le droit d'administrer ;
//  - AuthGuard lève sa règle « on n'agit que pour soi », parce qu'un
//    administrateur agit précisément sur les comptes des autres.
//
// Poser @Admin() sans @UseGuards(AdminGuard) ouvrirait donc la route à tout
// le monde. Pour éviter ce piège, on expose plus bas un décorateur unique
// qui fait les deux d'un coup : c'est celui-là qu'on utilise.
export const CLE_ADMIN = 'route_admin';
export const MarqueAdmin = () => SetMetadata(CLE_ADMIN, true);
