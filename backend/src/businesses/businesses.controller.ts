import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { UtilisateurConnecte } from '../auth/auth.service';
import { BusinessOwnerGuard } from '../auth/business-owner.guard';
import { Public } from '../auth/public.decorator';
import { Utilisateur } from '../auth/utilisateur.decorator';
import { BalancingService } from '../balancing/balancing.service';
import { CheckinsService } from '../checkins/checkins.service';
import { CreateMissionDto } from '../missions/dto/create-mission.dto';
import { MissionsService } from '../missions/missions.service';
import { BusinessesService } from './businesses.service';
import { CreateBusinessDto } from './dto/create-business.dto';

@Controller('businesses')
export class BusinessesController {
  constructor(
    private readonly businesses: BusinessesService,
    private readonly missions: MissionsService,
    private readonly checkins: CheckinsService,
    private readonly balancing: BalancingService,
  ) {}

  @Post()
  create(@Utilisateur() utilisateur: UtilisateurConnecte, @Body() dto: CreateBusinessDto) {
    return this.businesses.createBusiness(utilisateur.id, dto);
  }

  // La liste des lieux partenaires et leurs missions sont publiques : c'est
  // la vitrine du service, on peut la regarder sans compte.
  @Public()
  @Get()
  async findAll() {
    const businesses = await this.businesses.findAll();
    const ids = businesses.map((b) => b.id);

    const [ratings, missionCounts, visitCounts, balancing] = await Promise.all([
      this.checkins.getRatingsSummary(ids),
      this.missions.countByBusiness(ids),
      this.checkins.getVisitsSummary(ids),
      this.balancing.getForBusinesses(ids),
    ]);

    return businesses.map((business) => ({
      ...business,
      noteMoyenne: ratings.get(business.id)?.noteMoyenne ?? null,
      nombreAvis: ratings.get(business.id)?.nombreAvis ?? 0,
      nombreMissions: missionCounts.get(business.id) ?? 0,
      nombreCheckins: visitCounts.get(business.id) ?? 0,
      multiplicateur: balancing.get(business.id)?.multiplicateur ?? 1,
      tauxOccupation: balancing.get(business.id)?.tauxOccupation ?? 0,
    }));
  }

  @Public()
  @Get(':id')
  getOne(@Param('id') id: string) {
    return this.businesses.getBusiness(id);
  }

  @UseGuards(BusinessOwnerGuard)
  @Post(':id/missions')
  async postMission(@Param('id') id: string, @Body() dto: CreateMissionDto) {
    await this.businesses.getBusiness(id);
    return this.missions.createForBusiness(id, dto);
  }

  @Public()
  @Get(':id/missions')
  async listMissions(@Param('id') id: string) {
    await this.businesses.getBusiness(id);
    return this.missions.findByBusiness(id);
  }
}
