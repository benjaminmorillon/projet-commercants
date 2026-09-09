import { Controller, Get, Param, Query } from '@nestjs/common';
import { MissionsService } from './missions.service';

@Controller('missions')
export class MissionsController {
  constructor(private readonly missions: MissionsService) {}

  @Get()
  findAll(
    @Query('archetype') archetype?: string,
    @Query('duree') duree?: string,
    @Query('theme') theme?: string,
    @Query('modeInteraction') modeInteraction?: string,
  ) {
    return this.missions.findAll({ archetype, duree, theme, modeInteraction });
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.missions.findOne(id);
  }
}
