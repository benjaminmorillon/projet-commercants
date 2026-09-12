import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { PlayerEventType } from '../player-events/event-weights';
import { PlayerEvent } from '../player-events/player-event.entity';
import { PlayerBadge } from './player-badge.entity';
import { PlayerProgression } from './player-progression.entity';
import {
  BADGES,
  niveauPourXp,
  PlayerStats,
  ProgressionSummary,
  resumeProgression,
  XP_PAR_EVENEMENT,
} from './xp-rules';

export interface ProgressionDetails extends ProgressionSummary {
  badgesObtenus: { id: string; nom: string; description: string; icone: string; obtenuLe: Date }[];
  badgesADebloquer: { id: string; nom: string; description: string; icone: string }[];
}

@Injectable()
export class ProgressionService {
  constructor(
    @InjectRepository(PlayerProgression)
    private readonly progressions: Repository<PlayerProgression>,
    @InjectRepository(PlayerBadge)
    private readonly badges: Repository<PlayerBadge>,
    @InjectRepository(PlayerEvent)
    private readonly events: Repository<PlayerEvent>,
  ) {}

  private async getOrCreate(playerId: string): Promise<PlayerProgression> {
    const existing = await this.progressions.findOne({ where: { playerId } });
    if (existing) {
      return existing;
    }
    return this.progressions.save(this.progressions.create({ playerId }));
  }

  // Le journal d'événements suffit à reconstituer toutes les statistiques
  // dont dépendent les badges : c'est la source unique de vérité.
  private async getStats(playerId: string): Promise<PlayerStats> {
    const events = await this.events.find({ where: { playerId } });
    const compte = (types: PlayerEventType[]) =>
      events.filter((e) => types.includes(e.type)).length;

    const lieuxInedits = new Set(
      events
        .filter((e) => e.type === 'lieu_inedit_visite' && e.businessId)
        .map((e) => e.businessId as string),
    );

    return {
      lieuxDifferentsVisites: lieuxInedits.size,
      missionsAccomplies: compte([
        'mission_solo_terminee',
        'mission_groupe_terminee',
        'mission_competitive_terminee',
      ]),
      missionsGroupeAccomplies: compte(['mission_groupe_terminee']),
      avisPublies: compte(['avis_publie']),
      amis: compte(['ami_ajoute']),
      dons: compte(['don_effectue']),
    };
  }

  /**
   * Appelé après chaque action enregistrée : crédite l'XP, met à jour le
   * niveau, et attribue les badges nouvellement mérités.
   */
  async awardForEvent(playerId: string, type: PlayerEventType): Promise<void> {
    const progression = await this.getOrCreate(playerId);
    progression.xpTotal += XP_PAR_EVENEMENT[type] ?? 0;
    progression.niveauActuel = niveauPourXp(progression.xpTotal);
    progression.updatedAt = new Date();
    await this.progressions.save(progression);

    await this.syncBadges(playerId);
  }

  /**
   * XP hors barème d'événement (découverte d'une zone de la carte, par
   * exemple) : le montant est calculé par l'appelant.
   */
  async awardBonusXp(playerId: string, xp: number): Promise<void> {
    if (xp <= 0) {
      return;
    }
    const progression = await this.getOrCreate(playerId);
    progression.xpTotal += xp;
    progression.niveauActuel = niveauPourXp(progression.xpTotal);
    progression.updatedAt = new Date();
    await this.progressions.save(progression);
  }

  private async syncBadges(playerId: string): Promise<void> {
    const [stats, dejaObtenus] = await Promise.all([
      this.getStats(playerId),
      this.badges.find({ where: { playerId } }),
    ]);
    const dejaIds = new Set(dejaObtenus.map((b) => b.badgeId));

    const nouveaux = BADGES.filter((badge) => !dejaIds.has(badge.id) && badge.estObtenu(stats));
    if (nouveaux.length === 0) {
      return;
    }

    await this.badges.save(
      nouveaux.map((badge) => this.badges.create({ playerId, badgeId: badge.id })),
    );
  }

  async getProgression(playerId: string): Promise<ProgressionDetails> {
    const progression = await this.getOrCreate(playerId);
    const obtenus = await this.badges.find({ where: { playerId } });
    const obtenusById = new Map(obtenus.map((b) => [b.badgeId, b]));

    return {
      ...resumeProgression(progression.xpTotal),
      badgesObtenus: BADGES.filter((b) => obtenusById.has(b.id)).map((b) => ({
        id: b.id,
        nom: b.nom,
        description: b.description,
        icone: b.icone,
        obtenuLe: (obtenusById.get(b.id) as PlayerBadge).obtenuLe,
      })),
      badgesADebloquer: BADGES.filter((b) => !obtenusById.has(b.id)).map((b) => ({
        id: b.id,
        nom: b.nom,
        description: b.description,
        icone: b.icone,
      })),
    };
  }

  // Utilisé pour classer plusieurs joueurs d'un coup (profil d'un ami, etc.).
  async getNiveaux(playerIds: string[]): Promise<Map<string, number>> {
    if (playerIds.length === 0) {
      return new Map();
    }
    const rows = await this.progressions.find({ where: { playerId: In(playerIds) } });
    return new Map(rows.map((r) => [r.playerId, r.niveauActuel]));
  }
}
