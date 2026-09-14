import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Business } from '../businesses/business.entity';
import { BusinessOwnerGuard } from './business-owner.guard';

/**
 * Fournit le garde de propriété d'un établissement aux modules qui en ont
 * besoin.
 *
 * `TypeOrmModule` est réexporté, et ce n'est pas accessoire : un garde voit
 * ses dépendances résolues dans le module où il est UTILISÉ, pas dans celui
 * qui le déclare. Sans cette ligne, chaque module qui pose ce garde devrait
 * penser à déclarer lui aussi le dépôt des établissements — et celui qui
 * l'oublie ne s'en aperçoit qu'au démarrage, pas à la compilation.
 */
@Module({
  imports: [TypeOrmModule.forFeature([Business])],
  providers: [BusinessOwnerGuard],
  exports: [BusinessOwnerGuard, TypeOrmModule],
})
export class OwnershipModule {}
