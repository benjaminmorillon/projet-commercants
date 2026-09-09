import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CheckIn } from '../checkins/checkin.entity';
import { Mission } from '../missions/mission.entity';
import { User } from '../users/user.entity';
import { Transaction } from './transaction.entity';
import { Wallet } from './wallet.entity';
import { WalletController } from './wallet.controller';
import { WalletService } from './wallet.service';

@Module({
  imports: [TypeOrmModule.forFeature([User, Mission, CheckIn, Wallet, Transaction])],
  controllers: [WalletController],
  providers: [WalletService],
})
export class WalletModule {}
