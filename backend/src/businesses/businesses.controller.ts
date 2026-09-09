import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { CreateMissionDto } from '../missions/dto/create-mission.dto';
import { MissionsService } from '../missions/missions.service';
import { BusinessesService } from './businesses.service';
import { CreateBusinessDto } from './dto/create-business.dto';

@Controller('businesses')
export class BusinessesController {
  constructor(
    private readonly businesses: BusinessesService,
    private readonly missions: MissionsService,
  ) {}

  @Post()
  create(@Body() dto: CreateBusinessDto) {
    return this.businesses.createBusiness(dto);
  }

  @Get(':id')
  getOne(@Param('id') id: string) {
    return this.businesses.getBusiness(id);
  }

  @Post(':id/missions')
  async postMission(@Param('id') id: string, @Body() dto: CreateMissionDto) {
    await this.businesses.getBusiness(id);
    return this.missions.createForBusiness(id, dto);
  }

  @Get(':id/missions')
  async listMissions(@Param('id') id: string) {
    await this.businesses.getBusiness(id);
    return this.missions.findByBusiness(id);
  }
}
