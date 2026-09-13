import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  Query,
  Req,
} from '@nestjs/common';
import { UtilisateurConnecte } from '../auth/auth.service';
import { CreateMissionDto } from '../missions/dto/create-mission.dto';
import { VOCABULAIRE } from '../missions/vocabulaire';
import { Admin } from './admin.guard';
import { ContenusService, Modification } from './contenus.service';
import { JournalService } from './journal.service';

interface RequeteAdmin {
  utilisateur: UtilisateurConnecte;
}

@Controller('admin')
@Admin()
export class ContenusController {
  constructor(
    private readonly contenus: ContenusService,
    private readonly journal: JournalService,
  ) {}

  /** Les listes déroulantes du formulaire de mission. */
  @Get('vocabulaire')
  vocabulaire() {
    return VOCABULAIRE;
  }

  // --- Commerces ---------------------------------------------------------

  @Get('commerces')
  listerCommerces() {
    return this.contenus.listerCommerces();
  }

  @Put('commerces/:id')
  async modifierCommerce(
    @Param('id') id: string,
    @Body() corps: Record<string, unknown>,
    @Req() requete: RequeteAdmin,
  ) {
    const modification = await this.contenus.modifierCommerce(id, corps);
    await this.tracer(requete, 'commerce.modifie', id, modification);
    return { modifie: modification.changements.length, resume: modification.resume };
  }

  // --- Missions ----------------------------------------------------------

  @Get('missions')
  listerMissions(@Query('recherche') recherche?: string) {
    return this.contenus.listerMissions(recherche);
  }

  @Post('missions')
  async creerMission(@Body() dto: CreateMissionDto, @Req() requete: RequeteAdmin) {
    const mission = await this.contenus.creerMission(dto as unknown as Record<string, unknown>);

    await this.journal.enregistrer(requete.utilisateur, {
      action: 'mission.creee',
      cible: mission.id,
      resume: `Mission ${mission.id} « ${mission.titre} » créée (${mission.recompenseBase} jetons)`,
      apres: mission.titre,
    });

    return mission;
  }

  @Put('missions/:id')
  async modifierMission(
    @Param('id') id: string,
    @Body() corps: Record<string, unknown>,
    @Req() requete: RequeteAdmin,
  ) {
    const modification = await this.contenus.modifierMission(id, corps);
    await this.tracer(requete, 'mission.modifiee', id, modification);
    return { modifie: modification.changements.length, resume: modification.resume };
  }

  @Delete('missions/:id')
  async supprimerMission(@Param('id') id: string, @Req() requete: RequeteAdmin) {
    const { titre } = await this.contenus.supprimerMission(id);

    await this.journal.enregistrer(requete.utilisateur, {
      action: 'mission.supprimee',
      cible: id,
      resume: `Mission ${id} « ${titre} » supprimée`,
      avant: titre,
    });

    return { supprime: true };
  }

  // --- Événements --------------------------------------------------------

  @Get('evenements')
  listerEvenements() {
    return this.contenus.listerEvenements();
  }

  @Put('evenements/:id')
  async modifierEvenement(
    @Param('id') id: string,
    @Body() corps: Record<string, unknown>,
    @Req() requete: RequeteAdmin,
  ) {
    const modification = await this.contenus.modifierEvenement(id, corps);
    await this.tracer(requete, 'evenement.modifie', id, modification);
    return { modifie: modification.changements.length, resume: modification.resume };
  }

  @Delete('evenements/:id')
  async supprimerEvenement(@Param('id') id: string, @Req() requete: RequeteAdmin) {
    const { titre } = await this.contenus.supprimerEvenement(id);

    await this.journal.enregistrer(requete.utilisateur, {
      action: 'evenement.supprime',
      cible: id,
      resume: `Événement « ${titre} » supprimé`,
      avant: titre,
    });

    return { supprime: true };
  }

  // --- Outils ------------------------------------------------------------

  /**
   * Écrit la modification au journal — sauf si rien n'a bougé. Enregistrer un
   * formulaire sans y toucher est le geste le plus courant du monde ; il ne
   * doit pas remplir le journal.
   */
  private async tracer(
    requete: RequeteAdmin,
    action: string,
    cible: string,
    modification: Modification,
  ): Promise<void> {
    if (modification.changements.length === 0) {
      return;
    }

    await this.journal.enregistrer(requete.utilisateur, {
      action,
      cible,
      resume: modification.resume,
      avant: modification.changements.map((c) => `${c.libelle}=${c.avant}`).join(' | '),
      apres: modification.changements.map((c) => `${c.libelle}=${c.apres}`).join(' | '),
    });
  }
}
