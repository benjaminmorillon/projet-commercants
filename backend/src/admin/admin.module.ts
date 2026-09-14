import { Global, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Business } from '../businesses/business.entity';
import { Compte } from '../ledger/compte.entity';
import { LedgerModule } from '../ledger/ledger.module';
import { PlayerProfile } from '../players/player-profile.entity';
import { PlayerProgression } from '../progression/player-progression.entity';
import { Campaign } from '../campaigns/campaign.entity';
import { CheckIn } from '../checkins/checkin.entity';
import { GroupMission } from '../duos/group-mission.entity';
import { Event } from '../events/event.entity';
import { Mission } from '../missions/mission.entity';
import { User } from '../users/user.entity';
import { MissionValidation } from '../validations/mission-validation.entity';
import { AdminController } from './admin.controller';
import { ContenusController } from './contenus.controller';
import { ContenusService } from './contenus.service';
import { ComptesController } from './comptes.controller';
import { ComptesService } from './comptes.service';
import { RegistreService } from './registre.service';
import { GeocodageService } from './geocodage/geocodage.service';
import { AdminGuard } from './admin.guard';
import { JournalAdmin } from './journal-admin.entity';
import { JournalService } from './journal.service';
import { Reglage } from './reglage.entity';
import { ReglagesService } from './reglages.service';

/**
 * Module global : ReglagesService est lu depuis à peu près partout
 * (check-in, missions, XP, jetons...). Le déclarer global évite d'ajouter
 * un import dans chaque module du projet, et surtout évite d'oublier.
 */
@Global()
@Module({
  imports: [
    TypeOrmModule.forFeature([
      Reglage,
      JournalAdmin,
      // En lecture/écriture pour l'administration des contenus.
      Business,
      User,
      Mission,
      Event,
      MissionValidation,
      GroupMission,
      Campaign,
      CheckIn,
      // Pour l'administration des comptes et du registre de jetons.
      PlayerProfile,
      PlayerProgression,
      Compte,
    ]),
    LedgerModule,
  ],
  controllers: [AdminController, ContenusController, ComptesController],
  providers: [
    ReglagesService,
    JournalService,
    ContenusService,
    GeocodageService,
    ComptesService,
    RegistreService,
    AdminGuard,
  ],
  exports: [ReglagesService, JournalService],
})
export class AdminModule {}
