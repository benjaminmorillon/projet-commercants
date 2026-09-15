import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { UtilisateurConnecte } from '../auth/auth.service';
import { BusinessOwnerGuard } from '../auth/business-owner.guard';
import { Utilisateur } from '../auth/utilisateur.decorator';
import { PresenceService } from './presence.service';

/** Ce que le joueur montre. */
@Controller('presence')
export class PresenceController {
  constructor(private readonly presence: PresenceService) {}

  @Get('mon-code')
  monCode(@Utilisateur() utilisateur: UtilisateurConnecte) {
    return this.presence.monCode(utilisateur.id);
  }

  @Post('mon-code/renouveler')
  renouveler(@Utilisateur() utilisateur: UtilisateurConnecte) {
    return this.presence.renouveler(utilisateur.id);
  }

  /** Les commerces qui me connaissent, et si je figure encore dans leur liste. */
  @Get('mes-commerces')
  mesCommerces(@Utilisateur() utilisateur: UtilisateurConnecte) {
    return this.presence.mesCommerces(utilisateur.id);
  }

  /** Sortir de la liste d'un commerce — ou y revenir. */
  @Post('mes-commerces/:businessId/retrait')
  changerRetrait(
    @Utilisateur() utilisateur: UtilisateurConnecte,
    @Param('businessId') businessId: string,
    @Body() corps: { retire?: unknown },
  ) {
    return this.presence.changerMonRetrait(utilisateur.id, businessId, Boolean(corps?.retire));
  }
}

/** Ce que le commerçant scanne, et les clients que ça lui constitue. */
@Controller('businesses')
@UseGuards(BusinessOwnerGuard)
export class BusinessPresenceController {
  constructor(private readonly presence: PresenceService) {}

  @Post(':id/presence')
  scanner(@Param('id') id: string, @Body() corps: { code?: unknown }) {
    return this.presence.scanner(id, corps?.code);
  }

  @Get(':id/clients')
  clients(@Param('id') id: string) {
    return this.presence.clients(id);
  }
}
