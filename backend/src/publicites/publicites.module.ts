import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { OwnershipModule } from '../auth/ownership.module';
import { Business } from '../businesses/business.entity';
import { CheckIn } from '../checkins/checkin.entity';
import { LedgerModule } from '../ledger/ledger.module';
import { OuverturePublicite } from './ouverture.entity';
import { Publicite } from './publicite.entity';
import { User } from '../users/user.entity';
import {
  BusinessPublicitesController,
  PublicitesController,
} from './publicites.controller';
import { PublicitesService } from './publicites.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([Publicite, OuverturePublicite, Business, CheckIn, User]),
    OwnershipModule,
    LedgerModule,
  ],
  controllers: [BusinessPublicitesController, PublicitesController],
  providers: [PublicitesService],
  exports: [PublicitesService],
})
export class PublicitesModule {}
