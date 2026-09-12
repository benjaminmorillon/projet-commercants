import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { CreateEventDto } from './dto/create-event.dto';
import { EventsService } from './events.service';

@Controller('businesses')
export class EventsController {
  constructor(private readonly events: EventsService) {}

  @Post(':id/events')
  create(@Param('id') id: string, @Body() dto: CreateEventDto) {
    return this.events.create(id, dto);
  }

  @Get(':id/events')
  list(@Param('id') id: string) {
    return this.events.findByBusiness(id);
  }
}
