import { Controller, Get, Param, Query } from '@nestjs/common';
import { Public } from '../auth/public.decorator';
import { UtilisateurConnecte } from '../auth/auth.service';
import { Utilisateur } from '../auth/utilisateur.decorator';
import { ArbreService } from './arbre.service';
import { MissionsService } from './missions.service';
import { VOCABULAIRE } from './vocabulaire';

@Controller('missions')
export class MissionsController {
  constructor(
    private readonly missions: MissionsService,
    private readonly arbre: ArbreService,
  ) {}

  @Public()
  @Get()
  findAll(
    @Query('archetype') archetype?: string,
    @Query('duree') duree?: string,
    @Query('theme') theme?: string,
    @Query('modeInteraction') modeInteraction?: string,
  ) {
    return this.missions.findAll({ archetype, duree, theme, modeInteraction });
  }

  /**
   * Les valeurs possibles d'un archétype, d'une durée, d'un thème et d'un
   * mode, avec leur libellé lisible.
   *
   * Déclarée AVANT `:id`, sinon Nest lirait « vocabulaire » comme un
   * identifiant de mission et répondrait « Mission introuvable ».
   *
   * Sert au back-office et à l'application mobile pour construire leurs
   * filtres : sans elle, chacun recopierait la liste dans son coin, et les
   * trois finiraient par diverger.
   */
  @Public()
  @Get('vocabulaire')
  vocabulaire() {
    return VOCABULAIRE;
  }

  /**
   * L'arbre des missions du joueur connecté : ses voies, ses paliers, ce
   * qui est ouvert et ce qui ne l'est pas encore.
   *
   * Déclarée AVANT `:id` pour la même raison que « vocabulaire ».
   *
   * Pas de `@Public()` ici : un arbre n'a de sens que pour quelqu'un. Sans
   * profil ni niveau, il n'y a rien à dessiner.
   */
  @Get('arbre')
  arbreDuJoueur(@Utilisateur() utilisateur: UtilisateurConnecte) {
    return this.arbre.pourLeJoueur(utilisateur.id);
  }

  @Public()
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.missions.findOne(id);
  }
}
