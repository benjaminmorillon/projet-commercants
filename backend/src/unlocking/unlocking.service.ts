import { ForbiddenException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, MoreThanOrEqual, Repository } from 'typeorm';
import { Business } from '../businesses/business.entity';
import { CheckIn } from '../checkins/checkin.entity';
import { PlayerEvent } from '../player-events/player-event.entity';
import { PlayerProfile } from '../players/player-profile.entity';
import { PlayerProgression } from '../progression/player-progression.entity';
import { ProgressionService } from '../progression/progression.service';
import { MissionValidation } from '../validations/mission-validation.entity';
import {
  cleZone,
  conditionDe,
  EtatJoueur,
  ETAPES_TUTORIEL,
  FonctionnaliteId,
  FONCTIONNALITES,
  limiteMissionsParJour,
  tutorielTermine,
  xpDecouverteZone,
  zonesVoisines,
} from './unlock-rules';
import { ZoneDecouverte } from './zone-decouverte.entity';
import { ReglagesService } from '../admin/reglages.service';

export interface MissionsDuJour {
  limite: number;
  utilisees: number;
  restantes: number;
}

export interface DeblocageSummary {
  tutoriel: {
    termine: boolean;
    etapes: { id: string; titre: string; consigne: string; lien: string; faite: boolean }[];
  };
  fonctionnalites: { id: string; nom: string; condition: string; ouverte: boolean }[];
  missionsDuJour: MissionsDuJour;
  zonesDecouvertes: number;
}

@Injectable()
export class UnlockingService {
  constructor(
    @InjectRepository(PlayerProfile)
    private readonly profiles: Repository<PlayerProfile>,
    @InjectRepository(PlayerEvent)
    private readonly events: Repository<PlayerEvent>,
    @InjectRepository(CheckIn)
    private readonly checkIns: Repository<CheckIn>,
    @InjectRepository(PlayerProgression)
    private readonly progressions: Repository<PlayerProgression>,
    @InjectRepository(MissionValidation)
    private readonly validations: Repository<MissionValidation>,
    @InjectRepository(ZoneDecouverte)
    private readonly zones: Repository<ZoneDecouverte>,
    private readonly progression: ProgressionService,
    private readonly reglages: ReglagesService,
  ) {}

  // L'état du joueur se reconstitue entièrement depuis ce qu'il a fait :
  // aucun compteur parallèle à maintenir.
  async getEtat(playerId: string): Promise<EtatJoueur> {
    const [profil, evenements, checkins, progression] = await Promise.all([
      this.profiles.findOne({ where: { userId: playerId } }),
      this.events.find({ where: { playerId } }),
      this.checkIns.count({ where: { playerId } }),
      this.progressions.findOne({ where: { playerId } }),
    ]);

    const compte = (types: string[]) => evenements.filter((e) => types.includes(e.type)).length;

    return {
      questionnaireComplete: Boolean(profil?.questionnaireCompletedAt),
      missionsAccomplies: compte([
        'mission_solo_terminee',
        'mission_groupe_terminee',
        'mission_competitive_terminee',
      ]),
      missionsSoloAccomplies: compte(['mission_solo_terminee', 'mission_competitive_terminee']),
      checkinsEffectues: checkins,
      niveau: progression?.niveauActuel ?? 1,
    };
  }

  private debutDeJournee(): Date {
    const minuit = new Date();
    minuit.setHours(0, 0, 0, 0);
    return minuit;
  }

  async getMissionsDuJour(playerId: string, etat?: EtatJoueur): Promise<MissionsDuJour> {
    const niveau = (etat ?? (await this.getEtat(playerId))).niveau;
    const limite = limiteMissionsParJour(
      niveau,
      this.reglages.entier('missions.parJourDepart'),
      this.reglages.entier('missions.parJourMax'),
    );

    // Une demande refusée ne doit pas consommer le quota du joueur.
    const utilisees = await this.validations.count({
      where: {
        playerId,
        statut: In(['en_attente', 'validee']),
        createdAt: MoreThanOrEqual(this.debutDeJournee()),
      },
    });

    return { limite, utilisees, restantes: Math.max(limite - utilisees, 0) };
  }

  async getDeblocage(playerId: string): Promise<DeblocageSummary> {
    const etat = await this.getEtat(playerId);
    const [missionsDuJour, zones] = await Promise.all([
      this.getMissionsDuJour(playerId, etat),
      this.zones.count({ where: { playerId } }),
    ]);

    return {
      tutoriel: {
        termine: tutorielTermine(etat),
        etapes: ETAPES_TUTORIEL.map((etape) => ({
          id: etape.id,
          titre: etape.titre,
          consigne: etape.consigne,
          lien: etape.lien,
          faite: etape.estFaite(etat),
        })),
      },
      fonctionnalites: FONCTIONNALITES.map((f) => ({
        id: f.id,
        nom: f.nom,
        condition: f.condition,
        ouverte: f.estOuverte(etat),
      })),
      missionsDuJour,
      zonesDecouvertes: zones,
    };
  }

  /** Bloque une action tant que la fonctionnalité n'est pas ouverte. */
  async assertOuverte(playerId: string, id: FonctionnaliteId): Promise<void> {
    const etat = await this.getEtat(playerId);
    const fonctionnalite = FONCTIONNALITES.find((f) => f.id === id);
    if (fonctionnalite && !fonctionnalite.estOuverte(etat)) {
      throw new ForbiddenException(
        `${fonctionnalite.nom} : pas encore débloqué. ${conditionDe(id)}`,
      );
    }
  }

  async assertQuotaDisponible(playerId: string): Promise<void> {
    const { limite, restantes } = await this.getMissionsDuJour(playerId);
    if (restantes <= 0) {
      throw new ForbiddenException(
        `Tu as atteint ta limite de ${limite} missions pour aujourd'hui. Reviens demain — la limite augmente à chaque niveau.`,
      );
    }
  }

  // ---------------------------------------------------------------------
  // La carte voilée
  // ---------------------------------------------------------------------

  async zonesDecouvertes(playerId: string): Promise<Set<string>> {
    const rows = await this.zones.find({ where: { playerId } });
    return new Set(rows.map((r) => r.cleZone));
  }

  /**
   * Zones visibles maintenant : celles déjà découvertes, plus celles qui
   * entourent la position actuelle du joueur (on voit autour de soi).
   */
  async zonesVisibles(
    playerId: string,
    position?: { latitude: number; longitude: number },
  ): Promise<Set<string>> {
    const visibles = await this.zonesDecouvertes(playerId);
    if (position) {
      zonesVoisines(
        position.latitude,
        position.longitude,
        this.reglages.nombre('carte.tailleZoneDegres'),
      ).forEach((cle) => visibles.add(cle));
    }
    return visibles;
  }

  /**
   * Appelé à chaque check-in : si le joueur entre dans une zone encore
   * voilée, elle est levée définitivement et rapporte de l'XP — davantage
   * si le lieu est sous-fréquenté (section 4).
   */
  async enregistrerDecouverte(
    playerId: string,
    business: Business,
    multiplicateurLieu: number,
  ): Promise<ZoneDecouverte | null> {
    const cle = cleZone(
      business.latitude,
      business.longitude,
      this.reglages.nombre('carte.tailleZoneDegres'),
    );

    const deja = await this.zones.findOne({ where: { playerId, cleZone: cle } });
    if (deja) {
      return null;
    }

    const xp = xpDecouverteZone(multiplicateurLieu, this.reglages.entier('xp.decouverteZone'));
    const zone = await this.zones.save(
      this.zones.create({ playerId, cleZone: cle, businessId: business.id, xpGagnee: xp }),
    );
    await this.progression.awardBonusXp(playerId, xp);
    return zone;
  }
}
