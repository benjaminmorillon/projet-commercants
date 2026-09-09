import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CheckIn } from '../checkins/checkin.entity';
import { Mission } from '../missions/mission.entity';
import { User } from '../users/user.entity';
import { WalletModule } from '../wallet/wallet.module';
import { BusinessValidationsController } from './business-validations.controller';
import { MissionValidation } from './mission-validation.entity';
import { PlayerValidationsController } from './player-validations.controller';
import { ValidationsController } from './validations.controller';
import { ValidationsService } from './validations.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([MissionValidation, Mission, User, CheckIn]),
    WalletModule,
  ],
  controllers: [
    PlayerValidationsController,
    BusinessValidationsController,
    ValidationsController,
  ],
  providers: [ValidationsService],
})
export class ValidationsModule {}
