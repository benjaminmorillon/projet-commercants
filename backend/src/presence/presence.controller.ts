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
