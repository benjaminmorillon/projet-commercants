import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Put,
  Res,
  UseGuards,
} from '@nestjs/common';
import type { Response } from 'express';
import { AutreJoueurAutorise, Public } from '../auth/public.decorator';
import { BusinessOwnerGuard } from '../auth/business-owner.guard';
import { PhotosService } from './photos.service';

// Combien de temps le navigateur garde une photo sans la redemander. On peut
// se permettre d'être généreux : l'adresse porte un numéro de version qui
// change dès que la photo change, donc une photo remplacée s'affiche tout de
// suite malgré le cache.
const CACHE_SECONDES = 7 * 24 * 60 * 60;

@Controller('photos')
export class PhotosController {
  constructor(private readonly photos: PhotosService) {}

  // --- Voir une photo ----------------------------------------------------
  //
  // Une photo se sert comme une image, à son adresse à elle — pas encastrée
  // dans du JSON. Le navigateur la met alors en cache comme n'importe quelle
  // image, et les listes du site restent légères.
  //
  // Les deux ne se traitent pas pareil, et c'est voulu :
  //
  //  - la photo d'un commerce est une devanture, faite pour être vue. La
  //    liste des lieux est déjà publique (c'est la vitrine du service), sa
  //    photo l'est aussi ;
  //  - le visage d'un joueur, non. Il faut être connecté pour le voir, sinon
  //    n'importe qui pourrait moissonner les portraits en devinant des
  //    adresses.

  @Get('joueur/:playerId')
  @AutreJoueurAutorise()
  async photoJoueur(@Param('playerId') playerId: string, @Res() reponse: Response) {
    return this.servir('joueur', playerId, reponse);
  }

  @Public()
  @Get('commerce/:businessId')
  async photoCommerce(@Param('businessId') businessId: string, @Res() reponse: Response) {
    return this.servir('commerce', businessId, reponse);
  }

  private async servir(
    sujet: 'joueur' | 'commerce',
    id: string,
    reponse: Response,
  ): Promise<void> {
    const photo = await this.photos.lire(sujet, id);

    reponse.setHeader('Content-Type', photo.format);
    // « private » pour un joueur : un cache partagé (le proxy d'une
    // entreprise, par exemple) ne doit pas servir le portrait de quelqu'un à
    // quelqu'un d'autre. Une devanture de commerce, elle, peut être mise en
    // cache par tout le monde.
    const partage = sujet === 'commerce' ? 'public' : 'private';
    reponse.setHeader('Cache-Control', `${partage}, max-age=${CACHE_SECONDES}`);
    reponse.end(photo.donnees);
  }

  // --- Changer sa photo --------------------------------------------------

  /**
   * Le garde global vérifie déjà que `:playerId` est bien celui de la
   * personne connectée : on ne peut pas changer la photo de quelqu'un
   * d'autre en modifiant l'adresse.
   */
  @Put('joueur/:playerId')
  async changerPhotoJoueur(
    @Param('playerId') playerId: string,
    @Body() corps: { image?: unknown },
  ) {
    const version = await this.photos.enregistrer('joueur', playerId, corps?.image);
    return { version: version.getTime() };
  }

  @Delete('joueur/:playerId')
  async retirerPhotoJoueur(@Param('playerId') playerId: string) {
    await this.photos.supprimer('joueur', playerId);
    return { version: null };
  }

  /** Ici c'est le garde de propriété qui vérifie que le lieu est bien le sien. */
  @Put('commerce/:businessId')
  @UseGuards(BusinessOwnerGuard)
  async changerPhotoCommerce(
    @Param('businessId') businessId: string,
    @Body() corps: { image?: unknown },
  ) {
    const version = await this.photos.enregistrer('commerce', businessId, corps?.image);
    return { version: version.getTime() };
  }

  @Delete('commerce/:businessId')
  @UseGuards(BusinessOwnerGuard)
  async retirerPhotoCommerce(@Param('businessId') businessId: string) {
    await this.photos.supprimer('commerce', businessId);
    return { version: null };
  }
}
