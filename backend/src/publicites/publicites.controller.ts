import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  Query,
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

  /**
   * L'image de l'offre.
   *
   * Elle vit ici plutôt que dans le contrôleur des photos parce que c'est ici
   * qu'on sait vérifier les deux choses nécessaires : que l'établissement est
   * bien celui du compte connecté (le garde), et que l'offre appartient bien
   * à cet établissement.
   */
  @Put(':id/offres/:offreId/image')
  async changerImage(
    @Param('id') id: string,
    @Param('offreId') offreId: string,
    @Body() corps: { image?: unknown },
  ) {
    await this.publicites.verifierAppartenance(offreId, id);
    return this.publicites.changerImage(offreId, corps?.image);
  }

  @Delete(':id/offres/:offreId/image')
  async retirerImage(@Param('id') id: string, @Param('offreId') offreId: string) {
    await this.publicites.verifierAppartenance(offreId, id);
    return this.publicites.retirerImage(offreId);
  }

  // --- Les bons à encaisser ------------------------------------------------

  @Get(':id/bons')
  bons(@Param('id') id: string) {
    return this.publicites.bonsDuCommerce(id);
  }

  @Post(':id/bons/:bonId/utiliser')
  utiliserBon(@Param('id') id: string, @Param('bonId') bonId: string) {
    return this.publicites.utiliserBon(bonId, id);
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
