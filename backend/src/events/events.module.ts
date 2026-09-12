import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Business } from '../businesses/business.entity';
import { Event } from './event.entity';
import { EventsController } from './events.controller';
import { EventsService } from './events.service';

@Module({
  imports: [TypeOrmModule.forFeature([Event, Business])],
  controllers: [EventsController],
  providers: [EventsService],
})
export class EventsModule {}
