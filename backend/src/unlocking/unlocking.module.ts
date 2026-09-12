import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CheckIn } from '../checkins/checkin.entity';
import { PlayerEvent } from '../player-events/player-event.entity';
import { PlayerProfile } from '../players/player-profile.entity';
import { PlayerProgression } from '../progression/player-progression.entity';
import { ProgressionModule } from '../progression/progression.module';
import { MissionValidation } from '../validations/mission-validation.entity';
import { UnlockingController } from './unlocking.controller';
import { UnlockingService } from './unlocking.service';
import { ZoneDecouverte } from './zone-decouverte.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      PlayerProfile,
      PlayerEvent,
      CheckIn,
      PlayerProgression,
      MissionValidation,
      ZoneDecouverte,
    ]),
    ProgressionModule,
  ],
  controllers: [UnlockingController],
  providers: [UnlockingService],
  exports: [UnlockingService],
})
export class UnlockingModule {}
