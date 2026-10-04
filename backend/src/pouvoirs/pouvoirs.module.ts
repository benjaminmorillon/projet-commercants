import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { NotificationsModule } from '../notifications/notifications.module';
import { PouvoirJoueur } from './pouvoir-joueur.entity';
import { PouvoirsController } from './pouvoirs.controller';
import { PouvoirsService } from './pouvoirs.service';

@Module({
  imports: [TypeOrmModule.forFeature([PouvoirJoueur]), NotificationsModule],
  controllers: [PouvoirsController],
  providers: [PouvoirsService],
  exports: [PouvoirsService],
})
export class PouvoirsModule {}
