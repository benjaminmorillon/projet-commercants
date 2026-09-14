import { Controller, Get, Param, Query } from '@nestjs/common';
import { Public } from '../auth/public.decorator';
import { MissionsService } from './missions.service';
import { VOCABULAIRE } from './vocabulaire';

@Controller('missions')
export class MissionsController {
  constructor(private readonly missions: MissionsService) {}

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

  @Public()
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.missions.findOne(id);
  }
}
