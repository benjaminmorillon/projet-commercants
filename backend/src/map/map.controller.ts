import { Controller, Get, Query } from '@nestjs/common';
import { MapService } from './map.service';

@Controller('map')
export class MapController {
  constructor(private readonly map: MapService) {}

  // Tout ce dont la carte a besoin en un seul appel : les lieux partenaires,
  // leurs missions (propres + missions types du catalogue) et, si on passe un
  // playerId, l'avancement du joueur sur chacune d'elles.
  @Get()
  get(@Query('playerId') playerId?: string) {
    return this.map.getMap(playerId || undefined);
  }
}
