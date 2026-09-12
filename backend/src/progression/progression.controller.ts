import { Controller, Get, Param } from '@nestjs/common';
import { ProgressionService } from './progression.service';

@Controller('players')
export class ProgressionController {
  constructor(private readonly progression: ProgressionService) {}

  @Get(':id/progression')
  get(@Param('id') id: string) {
    return this.progression.getProgression(id);
  }
}
