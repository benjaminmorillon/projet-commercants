import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PlayerProfile } from '../players/player-profile.entity';
import { ProgressionModule } from '../progression/progression.module';
import { PlayerEvent } from './player-event.entity';
import { PlayerEventsController } from './player-events.controller';
import { PlayerEventsService } from './player-events.service';

@Module({
  imports: [TypeOrmModule.forFeature([PlayerEvent, PlayerProfile]), ProgressionModule],
  controllers: [PlayerEventsController],
  providers: [PlayerEventsService],
  exports: [PlayerEventsService],
})
export class PlayerEventsModule {}
