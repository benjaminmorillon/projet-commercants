import { Controller, Get, Query } from '@nestjs/common';
import { UtilisateurConnecte } from '../auth/auth.service';
import { Utilisateur } from '../auth/utilisateur.decorator';
import { MapService } from './map.service';

@Controller('map')
export class MapController {
  constructor(private readonly map: MapService) {}

  /**
   * Tout ce dont la carte a besoin en un seul appel. Le joueur est celui de
   * la session : on ne peut pas demander la carte de quelqu'un d'autre en
   * changeant un paramètre dans l'URL.
   */
  @Get()
  get(
    @Utilisateur() utilisateur: UtilisateurConnecte,
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

    return this.map.getMap(utilisateur.id, position);
  }
}
