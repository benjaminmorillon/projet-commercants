import { Controller, Get, Query } from '@nestjs/common';
import { MapService } from './map.service';

@Controller('map')
export class MapController {
  constructor(private readonly map: MapService) {}

  // Tout ce dont la carte a besoin en un seul appel : les lieux partenaires,
  // leurs missions (propres + missions types du catalogue) et, si on passe un
  // playerId, l'avancement du joueur sur chacune d'elles.
  @Get()
  get(
    @Query('playerId') playerId?: string,
    @Query('latitude') latitude?: string,
    @Query('longitude') longitude?: string,
  ) {
    // La position est facultative : quand le joueur l'a partagée, elle sert à
    // lever le voile sur les zones qui l'entourent immédiatement.
    const lat = Number(latitude);
    const lng = Number(longitude);
    const position =
      Number.isFinite(lat) && Number.isFinite(lng) && latitude && longitude
        ? { latitude: lat, longitude: lng }
        : undefined;

    return this.map.getMap(playerId || undefined, position);
  }
}
