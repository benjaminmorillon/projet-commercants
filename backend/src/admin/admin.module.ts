import { Global, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Business } from '../businesses/business.entity';
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
    ]),
  ],
  controllers: [AdminController, ContenusController],
  providers: [ReglagesService, JournalService, ContenusService, AdminGuard],
  exports: [ReglagesService, JournalService],
})
export class AdminModule {}
