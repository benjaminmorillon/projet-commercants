import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { NotificationsModule } from '../notifications/notifications.module';
import { PlayerEvent } from '../player-events/player-event.entity';
import { PlayerBadge } from './player-badge.entity';
import { PlayerProgression } from './player-progression.entity';
import { ProgressionController } from './progression.controller';
import { ProgressionService } from './progression.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([PlayerProgression, PlayerBadge, PlayerEvent]),
    NotificationsModule,
  ],
  controllers: [ProgressionController],
  providers: [ProgressionService],
  exports: [ProgressionService],
})
export class ProgressionModule {}
