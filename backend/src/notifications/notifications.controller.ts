import { Body, Controller, Delete, Get, Param, Post } from '@nestjs/common';
import { UtilisateurConnecte } from '../auth/auth.service';
import { Utilisateur } from '../auth/utilisateur.decorator';
import { AbonnementPushDto, DesabonnementPushDto } from './dto/abonnement-push.dto';
import { NotificationsService } from './notifications.service';
import { PushService } from './push.service';

// Toutes ces routes parlent de la personne connectée : aucun identifiant à
// passer, donc aucun moyen de lire les notifications de quelqu'un d'autre.
@Controller('notifications')
export class NotificationsController {
  constructor(
    private readonly notifications: NotificationsService,
    private readonly push: PushService,
  ) {}

  @Get()
  async lister(@Utilisateur() utilisateur: UtilisateurConnecte) {
    const [liste, nonLues] = await Promise.all([
      this.notifications.lister(utilisateur.id),
      this.notifications.compterNonLues(utilisateur.id),
    ]);
    return { nonLues, notifications: liste };
  }

  @Get('non-lues')
  async compter(@Utilisateur() utilisateur: UtilisateurConnecte) {
    return { nonLues: await this.notifications.compterNonLues(utilisateur.id) };
  }

  @Post(':id/lue')
  marquerLue(@Param('id') id: string, @Utilisateur() utilisateur: UtilisateurConnecte) {
    return this.notifications.marquerLue(id, utilisateur.id);
  }

  @Post('tout-lu')
  marquerToutesLues(@Utilisateur() utilisateur: UtilisateurConnecte) {
    return this.notifications.marquerToutesLues(utilisateur.id);
  }

  // --- Notifications hors de l'appli (push du navigateur) ---

  @Get('push/cle')
  async clePublique(@Utilisateur() utilisateur: UtilisateurConnecte) {
    return {
      clePublique: this.push.clePublique(),
      abonne: (await this.push.compterAbonnements(utilisateur.id)) > 0,
    };
  }

  @Post('push/abonnement')
  async abonner(
    @Utilisateur() utilisateur: UtilisateurConnecte,
    @Body() dto: AbonnementPushDto,
  ) {
    await this.push.abonner(utilisateur.id, dto);
    return { abonne: true };
  }

  @Delete('push/abonnement')
  async desabonner(@Body() dto: DesabonnementPushDto) {
    await this.push.desabonner(dto.endpoint);
    return { abonne: false };
  }
}
