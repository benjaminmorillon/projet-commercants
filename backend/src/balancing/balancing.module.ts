import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Business } from '../businesses/business.entity';
import { CheckIn } from '../checkins/checkin.entity';
import { Review } from '../checkins/review.entity';
import { BalancingService } from './balancing.service';

@Module({
  imports: [TypeOrmModule.forFeature([Business, CheckIn, Review])],
  providers: [BalancingService],
  exports: [BalancingService],
})
export class BalancingModule {}
