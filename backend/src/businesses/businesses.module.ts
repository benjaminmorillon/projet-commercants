import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MissionsModule } from '../missions/missions.module';
import { User } from '../users/user.entity';
import { Business } from './business.entity';
import { BusinessesController } from './businesses.controller';
import { BusinessesService } from './businesses.service';

@Module({
  imports: [TypeOrmModule.forFeature([User, Business]), MissionsModule],
  controllers: [BusinessesController],
  providers: [BusinessesService],
})
export class BusinessesModule {}
