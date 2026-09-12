import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BalancingModule } from '../balancing/balancing.module';
import { Business } from '../businesses/business.entity';
import { CheckinsModule } from '../checkins/checkins.module';
import { Mission } from '../missions/mission.entity';
import { UnlockingModule } from '../unlocking/unlocking.module';
import { MissionValidation } from '../validations/mission-validation.entity';
import { MapController } from './map.controller';
import { MapService } from './map.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([Business, Mission, MissionValidation]),
    BalancingModule,
    CheckinsModule,
    UnlockingModule,
  ],
  controllers: [MapController],
  providers: [MapService],
})
export class MapModule {}
