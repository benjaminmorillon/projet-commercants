import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Put,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { UtilisateurConnecte } from '../auth/auth.service';
import { BusinessOwnerGuard } from '../auth/business-owner.guard';
import { Utilisateur } from '../auth/utilisateur.decorator';
import { CreerPubliciteDto } from './dto/creer-publicite.dto';
import { PublicitesService } from './publicites.service';

/** Ce qu'un commerçant fait de ses offres. */
@Controller('businesses')
@UseGuards(BusinessOwnerGuard)
export class BusinessPublicitesController {
  constructor(private readonly publicites: PublicitesService) {}

  @Get(':id/offres')
  lister(@Param('id') id: string) {
    return this.publicites.listerDuCommerce(id);
  }

  @Post(':id/offres')
  creer(@Param('id') id: string, @Body() dto: CreerPubliciteDto) {
    return this.publicites.creer(id, dto);
  }

  @Put(':id/offres/:offreId')
  async basculer(
    @Param('id') id: string,
    @Param('offreId') offreId: string,
    @Body() corps: { active?: boolean },
  ) {
    // Le garde vérifie que l'établissement est bien celui du compte connecté ;
    // il reste à vérifier que l'offre appartient à cet établissement, sinon on
    // pourrait suspendre celle d'un concurrent en changeant un identifiant.
    await this.publicites.verifierAppartenance(offreId, id);
    return this.publicites.basculerActive(offreId, Boolean(corps?.active));
  }
}

/** Ce qu'un joueur fait des offres. */
@Controller('offres')
export class PublicitesController {
  constructor(private readonly publicites: PublicitesService) {}

  /**
   * La recherche.
   *
   * Sans terme, rend toutes les offres en cours : c'est ce qu'on veut voir en
   * arrivant sur l'espace, avant d'avoir cherché quoi que ce soit.
   */
  @Get()
  rechercher(@Utilisateur() utilisateur: UtilisateurConnecte, @Query('q') q?: string) {
    return this.publicites.rechercher(q ?? '', utilisateur.id);
  }

  @Get('mes-bons')
  mesBons(@Utilisateur() utilisateur: UtilisateurConnecte) {
    return this.publicites.mesBons(utilisateur.id);
  }

  /** Ouvrir une offre : la lire, et être payé si l'ouverture est crédible. */
  @Post(':id/ouvrir')
  ouvrir(@Param('id') id: string, @Utilisateur() utilisateur: UtilisateurConnecte) {
    return this.publicites.ouvrir(id, utilisateur.id);
  }
}
