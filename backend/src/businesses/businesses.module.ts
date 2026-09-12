import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BalancingModule } from '../balancing/balancing.module';
import { CheckinsModule } from '../checkins/checkins.module';
import { MissionsModule } from '../missions/missions.module';
import { User } from '../users/user.entity';
import { Business } from './business.entity';
import { BusinessesController } from './businesses.controller';
import { BusinessesService } from './businesses.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([User, Business]),
    MissionsModule,
    CheckinsModule,
    BalancingModule,
  ],
  controllers: [BusinessesController],
  providers: [BusinessesService],
})
export class BusinessesModule {}
