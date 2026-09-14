import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PlayerProfile } from '../players/player-profile.entity';
import { PlayerProgression } from '../progression/player-progression.entity';
import { MissionValidation } from '../validations/mission-validation.entity';
import { ArbreService } from './arbre.service';
import { Mission } from './mission.entity';
import { MissionsController } from './missions.controller';
import { MissionsService } from './missions.service';

@Module({
  imports: [
    // L'arbre lit les validations, le profil et le niveau du joueur. On
    // déclare les dépôts ici plutôt que d'importer les modules concernés :
    // ValidationsModule importe déjà MissionsModule, et deux modules qui
    // s'importent l'un l'autre empêchent Nest de démarrer.
    TypeOrmModule.forFeature([Mission, MissionValidation, PlayerProfile, PlayerProgression]),
  ],
  controllers: [MissionsController],
  providers: [MissionsService, ArbreService],
  exports: [MissionsService, ArbreService],
})
export class MissionsModule {}
