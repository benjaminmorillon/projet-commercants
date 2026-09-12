import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Business } from '../businesses/business.entity';
import { CheckIn } from '../checkins/checkin.entity';
import { Mission } from '../missions/mission.entity';
import { PlayerEvent } from '../player-events/player-event.entity';
import { PlayerProgression } from '../progression/player-progression.entity';
import { ZoneDecouverte } from '../unlocking/zone-decouverte.entity';
import { MissionValidation } from '../validations/mission-validation.entity';
import { CollectionController } from './collection.controller';
import { CollectionService } from './collection.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      PlayerProgression,
      ZoneDecouverte,
      PlayerEvent,
      CheckIn,
      Business,
      MissionValidation,
      Mission,
    ]),
  ],
  controllers: [CollectionController],
  providers: [CollectionService],
  exports: [CollectionService],
})
export class CollectionModule {}
