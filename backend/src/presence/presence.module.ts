import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { OwnershipModule } from '../auth/ownership.module';
import { Business } from '../businesses/business.entity';
import { CheckIn } from '../checkins/checkin.entity';
import { CheckinsModule } from '../checkins/checkins.module';
import { PhotosModule } from '../photos/photos.module';
import { User } from '../users/user.entity';
import { CodePresence } from './code-presence.entity';
import { BusinessPresenceController, PresenceController } from './presence.controller';
import { PresenceService } from './presence.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([CodePresence, User, Business, CheckIn]),
    OwnershipModule,
    CheckinsModule,
    PhotosModule,
  ],
  controllers: [PresenceController, BusinessPresenceController],
  providers: [PresenceService],
  exports: [PresenceService],
})
export class PresenceModule {}
