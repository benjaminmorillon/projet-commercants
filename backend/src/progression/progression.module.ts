import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { NotificationsModule } from '../notifications/notifications.module';
import { PlayerEvent } from '../player-events/player-event.entity';
import { PlayerProfile } from '../players/player-profile.entity';
import { PouvoirsModule } from '../pouvoirs/pouvoirs.module';
import { PlayerBadge } from './player-badge.entity';
import { PlayerProgression } from './player-progression.entity';
import { ProgressionController } from './progression.controller';
import { ProgressionService } from './progression.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([PlayerProgression, PlayerBadge, PlayerEvent, PlayerProfile]),
    NotificationsModule,
    PouvoirsModule,
  ],
  controllers: [ProgressionController],
  providers: [ProgressionService],
  exports: [ProgressionService],
})
export class ProgressionModule {}
