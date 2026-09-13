import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Repository } from 'typeorm';
import { Notification } from './notification.entity';
import { PushService } from './push.service';
import {
  DonneesNotification,
  rendreNotification,
  TypeNotification,
} from './notification-rules';

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(
    @InjectRepository(Notification)
    private readonly notifications: Repository<Notification>,
    private readonly push: PushService,
  ) {}

  /**
   * Prévenir quelqu'un. Volontairement tolérant : si l'envoi échoue, l'action
   * métier qui l'a déclenché (valider une mission, accepter un duo) ne doit
   * pas échouer pour autant.
   */
  async prevenir(
    destinataireId: string,
    type: TypeNotification,
    donnees: DonneesNotification = {},
  ): Promise<Notification | null> {
    try {
      const { titre, corps, lien } = rendreNotification(type, donnees);
      const notification = await this.notifications.save(
        this.notifications.create({ destinataireId, type, titre, corps, lien, donnees }),
      );

      // La notification existe désormais dans l'appli ; on tente en plus de
      // la pousser vers les navigateurs abonnés. Un échec d'envoi ne doit
      // pas la faire disparaître.
      await this.push.envoyer(notification).catch(() => null);

      return notification;
    } catch (erreur) {
      this.logger.warn(`Notification ${type} non envoyée : ${(erreur as Error).message}`);
      return null;
    }
  }

  lister(destinataireId: string, limite = 40): Promise<Notification[]> {
    return this.notifications.find({
      where: { destinataireId },
      order: { createdAt: 'DESC' },
      take: limite,
    });
  }

  compterNonLues(destinataireId: string): Promise<number> {
    return this.notifications.count({ where: { destinataireId, lueLe: IsNull() } });
  }

  async marquerLue(id: string, destinataireId: string): Promise<Notification> {
    const notification = await this.notifications.findOne({ where: { id, destinataireId } });
    if (!notification) {
      throw new NotFoundException('Notification introuvable.');
    }
    if (!notification.lueLe) {
      notification.lueLe = new Date();
      await this.notifications.save(notification);
    }
    return notification;
  }

  async marquerToutesLues(destinataireId: string): Promise<{ marquees: number }> {
    const resultat = await this.notifications.update(
      { destinataireId, lueLe: IsNull() },
      { lueLe: new Date() },
    );
    return { marquees: resultat.affected ?? 0 };
  }
}
