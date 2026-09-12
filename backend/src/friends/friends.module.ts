import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Mission } from '../missions/mission.entity';
import { PlayerEventsModule } from '../player-events/player-events.module';
import { PlayerProfile } from '../players/player-profile.entity';
import { User } from '../users/user.entity';
import { CollectionModule } from '../collection/collection.module';
import { UnlockingModule } from '../unlocking/unlocking.module';
import { MissionValidation } from '../validations/mission-validation.entity';
import { FriendRequestsController } from './friend-requests.controller';
import { Friendship } from './friendship.entity';
import { FriendsService } from './friends.service';
import { PlayerFriendsController } from './player-friends.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([Friendship, User, PlayerProfile, MissionValidation, Mission]),
    PlayerEventsModule,
    UnlockingModule,
    CollectionModule,
  ],
  controllers: [PlayerFriendsController, FriendRequestsController],
  providers: [FriendsService],
})
export class FriendsModule {}
