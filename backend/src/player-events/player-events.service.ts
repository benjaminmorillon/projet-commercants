import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PlayerProfile } from '../players/player-profile.entity';
import { ProgressionService } from '../progression/progression.service';
import {
  applyEventToScores,
  ArchetypeScores,
  EVENT_LABELS,
  EVENT_WEIGHTS,
  PlayerEventType,
} from './event-weights';
import { PlayerEvent } from './player-event.entity';

export interface EventContext {
  businessId?: string | null;
  missionId?: string | null;
}

@Injectable()
export class PlayerEventsService {
  private readonly logger = new Logger(PlayerEventsService.name);

  constructor(
    @InjectRepository(PlayerEvent)
    private readonly events: Repository<PlayerEvent>,
    @InjectRepository(PlayerProfile)
    private readonly profiles: Repository<PlayerProfile>,
    private readonly progression: ProgressionService,
  ) {}

  /**
   * Enregistre une action et met immédiatement le profil à jour.
   * Volontairement tolérant : si le joueur n'a pas encore de profil, on ne
   * fait pas échouer l'action métier qui a déclenché l'événement.
   */
  async record(
    playerId: string,
    type: PlayerEventType,
    context: EventContext = {},
  ): Promise<PlayerEvent | null> {
    const profile = await this.profiles.findOne({ where: { userId: playerId } });
    if (!profile) {
      this.logger.warn(`Événement ${type} ignoré : pas de profil pour ${playerId}.`);
      return null;
    }

    const avant: ArchetypeScores = {
      scoreExplorateur: profile.scoreExplorateur,
      scoreAccomplisseur: profile.scoreAccomplisseur,
      scoreCompetiteur: profile.scoreCompetiteur,
      scoreSocialisateur: profile.scoreSocialisateur,
    };
    const apres = applyEventToScores(avant, EVENT_WEIGHTS[type]);

    Object.assign(profile, apres, { updatedAt: new Date() });
    await this.profiles.save(profile);

    const evenement = await this.events.save(
      this.events.create({
        playerId,
        type,
        deltaExplorateur: arrondi(apres.scoreExplorateur - avant.scoreExplorateur),
        deltaAccomplisseur: arrondi(apres.scoreAccomplisseur - avant.scoreAccomplisseur),
        deltaCompetiteur: arrondi(apres.scoreCompetiteur - avant.scoreCompetiteur),
        deltaSocialisateur: arrondi(apres.scoreSocialisateur - avant.scoreSocialisateur),
        businessId: context.businessId ?? null,
        missionId: context.missionId ?? null,
      }),
    );

    // La même action nourrit la progression : XP, niveau et badges.
    await this.progression.awardForEvent(playerId, type);

    return evenement;
  }

  async listForPlayer(playerId: string) {
    const events = await this.events.find({
      where: { playerId },
      order: { createdAt: 'DESC' },
      take: 20,
    });

    return events.map((event) => ({
      ...event,
      libelle: EVENT_LABELS[event.type] ?? event.type,
    }));
  }
}

function arrondi(valeur: number): number {
  return Math.round(valeur * 10) / 10;
}
