import { Module } from '@nestjs/common';
import { OwnershipModule } from '../auth/ownership.module';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Business } from '../businesses/business.entity';
import { Event } from './event.entity';
import { EventsController } from './events.controller';
import { EventsService } from './events.service';

@Module({
  imports: [OwnershipModule,
    TypeOrmModule.forFeature([Event, Business])],
  controllers: [EventsController],
  providers: [EventsService],
})
export class EventsModule {}
