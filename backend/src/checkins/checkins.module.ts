import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Business } from '../businesses/business.entity';
import { PlayerEventsModule } from '../player-events/player-events.module';
import { User } from '../users/user.entity';
import { CheckIn } from './checkin.entity';
import { CheckinsController } from './checkins.controller';
import { CheckinsService } from './checkins.service';
import { Review } from './review.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Business, User, CheckIn, Review]), PlayerEventsModule],
  controllers: [CheckinsController],
  providers: [CheckinsService],
  exports: [CheckinsService],
})
export class CheckinsModule {}
