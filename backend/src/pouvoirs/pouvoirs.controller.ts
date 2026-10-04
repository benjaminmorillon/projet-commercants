import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { PouvoirsService } from './pouvoirs.service';

@Controller('players')
export class PouvoirsController {
  constructor(private readonly pouvoirs: PouvoirsService) {}

  /** L'inventaire : ce qui est disponible, ce qui court, ce qui est passé. */
  @Get(':id/pouvoirs')
  inventaire(@Param('id') id: string) {
    return this.pouvoirs.inventaire(id);
  }

  /**
   * Déclencher un pouvoir.
   *
   * La cible est facultative ici, et exigée plus bas selon le pouvoir : c'est
   * la règle pure qui tranche, pas la validation de la requête, pour que le
   * message d'erreur parle du pouvoir et pas du champ.
   */
  @Post(':id/pouvoirs/:ligneId/utiliser')
  utiliser(
    @Param('id') id: string,
    @Param('ligneId') ligneId: string,
    @Body() corps: { cible?: string },
  ) {
    return this.pouvoirs.utiliser(id, ligneId, corps?.cible ?? null);
  }
}
