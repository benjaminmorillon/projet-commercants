import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from '../users/user.entity';
import { PlayerProfile } from './player-profile.entity';
import { PlayersController } from './players.controller';
import { PlayersService } from './players.service';

@Module({
  imports: [TypeOrmModule.forFeature([User, PlayerProfile])],
  controllers: [PlayersController],
  providers: [PlayersService],
})
export class PlayersModule {}
