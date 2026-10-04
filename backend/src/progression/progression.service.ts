import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { ReglagesService } from '../admin/reglages.service';
import { NotificationsService } from '../notifications/notifications.service';
import { PlayerEventType } from '../player-events/event-weights';
import { PlayerEvent } from '../player-events/player-event.entity';
import { PlayerProfile } from '../players/player-profile.entity';
import { PouvoirsService } from '../pouvoirs/pouvoirs.service';
import type { ProfilPouvoir } from '../pouvoirs/pouvoirs';
import { PlayerBadge } from './player-badge.entity';
import { PlayerProgression } from './player-progression.entity';
import {
  BADGES,
  CLE_REGLAGE_XP,
  niveauPourXp,
  PlayerStats,
  ProgressionSummary,
  resumeProgression,
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
    private readonly notifications: NotificationsService,
    private readonly reglages: ReglagesService,
    @InjectRepository(PlayerProfile)
    private readonly profils: Repository<PlayerProfile>,
    private readonly pouvoirs: PouvoirsService,
  ) {}

  /**
   * L'archétype le plus haut du joueur, pour choisir le pouvoir qu'on lui
   * donne en montant de niveau.
   *
   * Deux personnes qui passent niveau 4 le même soir ne reçoivent donc pas la
   * même chose — c'est exactement ce que le mot d'accueil de l'arbre annonce :
   * selon tes choix, tu ne débloques pas la même chose que ton voisin.
   */
  private async profilDominant(playerId: string): Promise<ProfilPouvoir> {
    const profil = await this.profils.findOne({ where: { userId: playerId } });
    if (!profil) {
      return 'explorateur';
    }

    const scores: [ProfilPouvoir, number][] = [
      ['explorateur', profil.scoreExplorateur],
      ['accomplisseur', profil.scoreAccomplisseur],
      ['competiteur', profil.scoreCompetiteur],
      ['socialisateur', profil.scoreSocialisateur],
    ];

    return scores.reduce((meilleur, candidat) =>
      candidat[1] > meilleur[1] ? candidat : meilleur,
    )[0];
  }

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
    const niveauAvant = progression.niveauActuel;

    // La clé peut manquer si un type d'événement a été ajouté sans réglage
    // correspondant : on n'accorde alors rien plutôt que de planter.
    const cle = CLE_REGLAGE_XP[type];
    progression.xpTotal += cle ? this.reglages.entier(cle) : 0;
    progression.niveauActuel = niveauPourXp(progression.xpTotal);
    progression.updatedAt = new Date();
    await this.progressions.save(progression);

    if (progression.niveauActuel > niveauAvant) {
      await this.notifications.prevenir(playerId, 'niveau_atteint', {
        niveau: progression.niveauActuel,
      });

      // Un niveau donne un pouvoir, et le pouvoir dépend de qui on est.
      // On passe par chaque niveau franchi : gagner deux niveaux d'un coup
      // ne doit pas en faire perdre un.
      for (let niveau = niveauAvant + 1; niveau <= progression.niveauActuel; niveau += 1) {
        await this.pouvoirs.attribuerPourNiveau(
          playerId,
          await this.profilDominant(playerId),
          niveau,
        );
      }
    }

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

    // Un badge décroché sans qu'on le dise ne fait plaisir à personne.
    await Promise.all(
      nouveaux.map((badge) =>
        this.notifications.prevenir(playerId, 'badge_obtenu', { badge: badge.nom }),
      ),
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
