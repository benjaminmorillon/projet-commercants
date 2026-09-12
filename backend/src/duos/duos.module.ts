import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BalancingModule } from '../balancing/balancing.module';
import { Business } from '../businesses/business.entity';
import { Mission } from '../missions/mission.entity';
import { PlayerEventsModule } from '../player-events/player-events.module';
import { PlayerProfile } from '../players/player-profile.entity';
import { User } from '../users/user.entity';
import { WalletModule } from '../wallet/wallet.module';
import { UnlockingModule } from '../unlocking/unlocking.module';
import { DuosController } from './duos.controller';
import { DuosService } from './duos.service';
import { GroupMissionParticipant } from './group-mission-participant.entity';
import { GroupMission } from './group-mission.entity';
import { PairingOutcome } from './pairing-outcome.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      GroupMission,
      GroupMissionParticipant,
      PairingOutcome,
      PlayerProfile,
      User,
      Mission,
      Business,
    ]),
    BalancingModule,
    WalletModule,
    PlayerEventsModule,
    UnlockingModule,
  ],
  controllers: [DuosController],
  providers: [DuosService],
})
export class DuosModule {}
