import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Notification } from './notification.entity';
import { PushSubscription } from './push-subscription.entity';
import { PushService } from './push.service';
import { NotificationsController } from './notifications.controller';
import { NotificationsService } from './notifications.service';

// Module feuille : il ne dépend de personne, donc tous les autres peuvent
// l'utiliser sans créer de dépendance circulaire.
@Module({
  imports: [TypeOrmModule.forFeature([Notification, PushSubscription])],
  controllers: [NotificationsController],
  providers: [NotificationsService, PushService],
  exports: [NotificationsService],
})
export class NotificationsModule {}
