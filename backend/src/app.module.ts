import { Module } from '@nestjs/common';
import { ServeStaticModule } from '@nestjs/serve-static';
import { TypeOrmModule } from '@nestjs/typeorm';
import { join } from 'path';
import { PlayersModule } from './players/players.module';
import { User } from './users/user.entity';
import { PlayerProfile } from './players/player-profile.entity';
import { MissionsModule } from './missions/missions.module';
import { Mission } from './missions/mission.entity';
import { BusinessesModule } from './businesses/businesses.module';
import { Business } from './businesses/business.entity';
import { CheckinsModule } from './checkins/checkins.module';
import { CheckIn } from './checkins/checkin.entity';
import { Review } from './checkins/review.entity';
import { WalletModule } from './wallet/wallet.module';
import { Wallet } from './wallet/wallet.entity';
import { Transaction } from './wallet/transaction.entity';
import { ValidationsModule } from './validations/validations.module';
import { MissionValidation } from './validations/mission-validation.entity';
import { FriendsModule } from './friends/friends.module';
import { Friendship } from './friends/friendship.entity';
import { EventsModule } from './events/events.module';
import { Event } from './events/event.entity';
import { PlayerEventsModule } from './player-events/player-events.module';
import { PlayerEvent } from './player-events/player-event.entity';
import { CampaignsModule } from './campaigns/campaigns.module';
import { Campaign } from './campaigns/campaign.entity';
import { CampaignTarget } from './campaigns/campaign-target.entity';

@Module({
  imports: [
    TypeOrmModule.forRoot({
      type: 'better-sqlite3',
      database: join(__dirname, '..', 'data', 'app.sqlite'),
      entities: [
        User,
        PlayerProfile,
        Mission,
        Business,
        CheckIn,
        Review,
        Wallet,
        Transaction,
        MissionValidation,
        Friendship,
        Event,
        Campaign,
        CampaignTarget,
        PlayerEvent,
      ],
      synchronize: true,
    }),
    ServeStaticModule.forRoot({
      rootPath: join(__dirname, '..', 'public'),
    }),
    PlayersModule,
    MissionsModule,
    BusinessesModule,
    CheckinsModule,
    WalletModule,
    ValidationsModule,
    FriendsModule,
    EventsModule,
    CampaignsModule,
    PlayerEventsModule,
  ],
})
export class AppModule {}
