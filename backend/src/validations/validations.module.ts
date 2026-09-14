import { Module } from '@nestjs/common';
import { OwnershipModule } from '../auth/ownership.module';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BalancingModule } from '../balancing/balancing.module';
import { Business } from '../businesses/business.entity';
import { CheckIn } from '../checkins/checkin.entity';
import { Mission } from '../missions/mission.entity';
import { MissionsModule } from '../missions/missions.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { PlayerEventsModule } from '../player-events/player-events.module';
import { UnlockingModule } from '../unlocking/unlocking.module';
import { User } from '../users/user.entity';
import { WalletModule } from '../wallet/wallet.module';
import { BusinessValidationsController } from './business-validations.controller';
import { MissionValidation } from './mission-validation.entity';
import { PlayerValidationsController } from './player-validations.controller';
import { ValidationsController } from './validations.controller';
import { ValidationsService } from './validations.service';

@Module({
  imports: [
    OwnershipModule,
    TypeOrmModule.forFeature([MissionValidation, Mission, User, CheckIn, Business]),
    MissionsModule,
    WalletModule,
    BalancingModule,
    PlayerEventsModule,
    UnlockingModule,
    NotificationsModule,
  ],
  controllers: [
    PlayerValidationsController,
    BusinessValidationsController,
    ValidationsController,
  ],
  providers: [ValidationsService],
})
export class ValidationsModule {}
