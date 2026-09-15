import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Res,
  UseGuards,
} from '@nestjs/common';
import type { Response } from 'express';
import { BusinessOwnerGuard } from '../auth/business-owner.guard';
import { Public } from '../auth/public.decorator';
import { typeDe } from './fichier-rules';
import { FichiersService } from './fichiers.service';

/** Ce que le commerçant dépose. */
@Controller('businesses')
@UseGuards(BusinessOwnerGuard)
export class BusinessFichiersController {
  constructor(private readonly fichiers: FichiersService) {}

  @Post(':id/pieces-jointes')
  ajouter(@Param('id') id: string, @Body() corps: { fichier?: unknown; nom?: unknown }) {
    return this.fichiers.ajouter(id, corps?.fichier, corps?.nom);
  }

  @Delete(':id/pieces-jointes/:pieceId')
  supprimer(@Param('id') id: string, @Param('pieceId') pieceId: string) {
    return this.fichiers.supprimer(pieceId, id);
  }
}

/** Ce que tout le monde peut consulter. */
@Controller()
export class FichiersController {
  constructor(private readonly fichiers: FichiersService) {}

  /**
   * La liste des pièces jointes d'un commerce.
   *
   * Publique, comme la fiche du commerce : une carte de restaurant est faite
   * pour être lue. Elle ne contient que des noms et des poids — jamais les
   * octets.
   */
  @Public()
  @Get('businesses/:id/pieces-jointes')
  lister(@Param('id') id: string) {
    return this.fichiers.lister(id);
  }

  /**
   * Le fichier lui-même.
   *
   * Deux précautions valent la peine d'être expliquées :
   *
   *  - `nosniff` empêche le navigateur de deviner un type différent de celui
   *    qu'on annonce. Sans lui, un fichier au contenu ambigu pourrait être
   *    interprété comme du HTML, et donc exécuté depuis notre domaine ;
   *  - un PDF part en TÉLÉCHARGEMENT (`attachment`) et jamais affiché dans la
   *    page. Un PDF peut embarquer du script, et le lecteur intégré du
   *    navigateur l'exécute ; en téléchargement, il s'ouvre dans le lecteur
   *    du système, hors de notre domaine. Les images, elles, s'affichent.
   */
  @Public()
  @Get('pieces-jointes/:id')
  async servir(@Param('id') id: string, @Res() reponse: Response): Promise<void> {
    const piece = await this.fichiers.lire(id);
    const type = typeDe(piece.format);

    reponse.setHeader('Content-Type', piece.format);
    reponse.setHeader('X-Content-Type-Options', 'nosniff');
    reponse.setHeader(
      'Content-Disposition',
      `${type?.affichable ? 'inline' : 'attachment'}; filename="${piece.nom}"`,
    );
    // Une pièce jointe ne change jamais : elle est remplacée, avec un nouvel
    // identifiant. On peut donc la mettre en cache sans risque de servir une
    // version périmée.
    reponse.setHeader('Cache-Control', 'public, max-age=604800');
    reponse.end(piece.donnees);
  }
}
