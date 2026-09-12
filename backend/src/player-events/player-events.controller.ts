import { Controller, Get, Param } from '@nestjs/common';
import { PlayerEventsService } from './player-events.service';

@Controller('players')
export class PlayerEventsController {
  constructor(private readonly events: PlayerEventsService) {}

  @Get(':id/events')
  list(@Param('id') id: string) {
    return this.events.listForPlayer(id);
  }
}
