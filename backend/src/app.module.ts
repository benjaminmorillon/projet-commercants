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

@Module({
  imports: [
    TypeOrmModule.forRoot({
      type: 'better-sqlite3',
      database: join(__dirname, '..', 'data', 'app.sqlite'),
      entities: [User, PlayerProfile, Mission, Business],
      synchronize: true,
    }),
    ServeStaticModule.forRoot({
      rootPath: join(__dirname, '..', 'public'),
    }),
    PlayersModule,
    MissionsModule,
    BusinessesModule,
  ],
})
export class AppModule {}
