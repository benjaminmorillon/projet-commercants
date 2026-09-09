import { Module } from '@nestjs/common';
import { ServeStaticModule } from '@nestjs/serve-static';
import { TypeOrmModule } from '@nestjs/typeorm';
import { join } from 'path';
import { PlayersModule } from './players/players.module';
import { User } from './users/user.entity';
import { PlayerProfile } from './players/player-profile.entity';

@Module({
  imports: [
    TypeOrmModule.forRoot({
      type: 'better-sqlite3',
      database: join(__dirname, '..', 'data', 'app.sqlite'),
      entities: [User, PlayerProfile],
      synchronize: true,
    }),
    ServeStaticModule.forRoot({
      rootPath: join(__dirname, '..', 'public'),
    }),
    PlayersModule,
  ],
})
export class AppModule {}
