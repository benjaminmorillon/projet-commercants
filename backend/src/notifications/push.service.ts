import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs';
import { join } from 'path';
import { Repository } from 'typeorm';
import * as webpush from 'web-push';
import { Notification } from './notification.entity';
import { PushSubscription } from './push-subscription.entity';

// Où l'on garde la paire de clés VAPID entre deux démarrages. Si elle
// changeait, tous les navigateurs déjà abonnés seraient perdus.
const FICHIER_CLES = join(__dirname, '..', '..', 'data', 'vapid.json');

interface ClesVapid {
  publicKey: string;
  privateKey: string;
}

@Injectable()
export class PushService implements OnModuleInit {
  private readonly logger = new Logger(PushService.name);
  private cles: ClesVapid | null = null;

  constructor(
    @InjectRepository(PushSubscription)
    private readonly abonnements: Repository<PushSubscription>,
  ) {}

  onModuleInit(): void {
    this.cles = this.chargerOuCreerCles();
    webpush.setVapidDetails(
      // Une adresse de contact, exigée par les services de push pour pouvoir
      // nous prévenir en cas de problème.
      process.env.PUSH_CONTACT ?? 'mailto:contact@projet-commercants.local',
      this.cles.publicKey,
      this.cles.privateKey,
    );
  }

  private chargerOuCreerCles(): ClesVapid {
    // En production, les clés viennent de l'environnement : le fichier local
    // est une commodité de développement, pas un endroit pour un secret.
    if (process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY) {
      return {
        publicKey: process.env.VAPID_PUBLIC_KEY,
        privateKey: process.env.VAPID_PRIVATE_KEY,
      };
    }

    if (existsSync(FICHIER_CLES)) {
      return JSON.parse(readFileSync(FICHIER_CLES, 'utf8')) as ClesVapid;
    }

    const cles = webpush.generateVAPIDKeys();
    mkdirSync(join(__dirname, '..', '..', 'data'), { recursive: true });
    writeFileSync(FICHIER_CLES, JSON.stringify(cles, null, 2));
    this.logger.log('Paire de clés VAPID créée dans data/vapid.json.');
    return cles;
  }

  /** La clé que le navigateur doit connaître pour s'abonner. */
  clePublique(): string {
    return this.cles?.publicKey ?? '';
  }

  async abonner(
    userId: string,
    abonnement: { endpoint: string; keys: { p256dh: string; auth: string } },
  ): Promise<PushSubscription> {
    const existant = await this.abonnements.findOne({
      where: { endpoint: abonnement.endpoint },
    });

    if (existant) {
      // Le même navigateur, éventuellement pour quelqu'un d'autre : on
      // réattribue plutôt que de créer un doublon.
      existant.userId = userId;
      existant.p256dh = abonnement.keys.p256dh;
      existant.auth = abonnement.keys.auth;
      return this.abonnements.save(existant);
    }

    return this.abonnements.save(
      this.abonnements.create({
        userId,
        endpoint: abonnement.endpoint,
        p256dh: abonnement.keys.p256dh,
        auth: abonnement.keys.auth,
      }),
    );
  }

  async desabonner(endpoint: string): Promise<void> {
    await this.abonnements.delete({ endpoint });
  }

  async compterAbonnements(userId: string): Promise<number> {
    return this.abonnements.count({ where: { userId } });
  }

  /**
   * Envoie la notification à tous les navigateurs de la personne. Chaque
   * échec est isolé : un téléphone qui ne répond plus n'empêche pas
   * l'ordinateur de recevoir le message.
   */
  async envoyer(notification: Notification): Promise<void> {
    const abonnements = await this.abonnements.find({
      where: { userId: notification.destinataireId },
    });
    if (abonnements.length === 0) {
      return;
    }

    const charge = JSON.stringify({
      titre: notification.titre,
      corps: notification.corps,
      lien: notification.lien,
      id: notification.id,
    });

    await Promise.all(
      abonnements.map(async (abonnement) => {
        try {
          await webpush.sendNotification(
            {
              endpoint: abonnement.endpoint,
              keys: { p256dh: abonnement.p256dh, auth: abonnement.auth },
            },
            charge,
          );
        } catch (erreur) {
          const statut = (erreur as { statusCode?: number }).statusCode;
          // 404 / 410 : le navigateur ne veut plus rien recevoir, on oublie
          // cet abonnement plutôt que de réessayer indéfiniment.
          if (statut === 404 || statut === 410) {
            await this.abonnements.delete({ id: abonnement.id });
          } else {
            this.logger.warn(`Push non délivré (${statut ?? 'erreur réseau'}).`);
          }
        }
      }),
    );
  }
}
