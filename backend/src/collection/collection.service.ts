import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { Business } from '../businesses/business.entity';
import { CheckIn } from '../checkins/checkin.entity';
import { Mission } from '../missions/mission.entity';
import { PlayerEvent } from '../player-events/player-event.entity';
import { PlayerProgression } from '../progression/player-progression.entity';
import { ZoneDecouverte } from '../unlocking/zone-decouverte.entity';
import { MissionValidation } from '../validations/mission-validation.entity';
import {
  libelleTitre,
  SerieCollection,
  seriesCollection,
  StatsCollection,
  statsVides,
  titreEstObtenu,
  TITRES,
} from './collection-rules';

export interface CollectionSummary {
  titreEquipe: { id: string; libelle: string } | null;
  titres: { id: string; libelle: string; condition: string; obtenu: boolean }[];
  series: SerieCollection[];
}

@Injectable()
export class CollectionService {
  constructor(
    @InjectRepository(PlayerProgression)
    private readonly progressions: Repository<PlayerProgression>,
    @InjectRepository(ZoneDecouverte)
    private readonly zones: Repository<ZoneDecouverte>,
    @InjectRepository(PlayerEvent)
    private readonly events: Repository<PlayerEvent>,
    @InjectRepository(CheckIn)
    private readonly checkIns: Repository<CheckIn>,
    @InjectRepository(Business)
    private readonly businesses: Repository<Business>,
    @InjectRepository(MissionValidation)
    private readonly validations: Repository<MissionValidation>,
    @InjectRepository(Mission)
    private readonly missions: Repository<Mission>,
  ) {}

  // Comme pour les badges, tout se reconstitue depuis ce que le joueur a
  // réellement fait : pas de compteur parallèle à tenir à jour.
  async getStats(playerId: string): Promise<StatsCollection> {
    const [progression, quartiersLeves, evenements, checkins, validees] = await Promise.all([
      this.progressions.findOne({ where: { playerId } }),
      this.zones.count({ where: { playerId } }),
      this.events.find({ where: { playerId } }),
      this.checkIns.find({ where: { playerId } }),
      this.validations.find({ where: { playerId, statut: 'validee' } }),
    ]);

    const compte = (types: string[]) => evenements.filter((e) => types.includes(e.type)).length;

    const visitesParLieu = new Map<string, number>();
    checkins.forEach((c) => {
      visitesParLieu.set(c.businessId, (visitesParLieu.get(c.businessId) ?? 0) + 1);
    });

    const typesEtablissementVisites = new Set<string>();
    if (visitesParLieu.size > 0) {
      const lieux = await this.businesses.find({ where: { id: In([...visitesParLieu.keys()]) } });
      lieux.forEach((lieu) => typesEtablissementVisites.add(lieu.typeEtablissement));
    }

    const themesAccomplis = new Set<string>();
    if (validees.length > 0) {
      const missions = await this.missions.find({
        where: { id: In([...new Set(validees.map((v) => v.missionId))]) },
      });
      missions.forEach((mission) => themesAccomplis.add(mission.theme));
    }

    return {
      ...statsVides(),
      niveau: progression?.niveauActuel ?? 1,
      quartiersLeves,
      avisPublies: compte(['avis_publie']),
      duosAccomplis: compte(['mission_groupe_terminee']),
      dons: compte(['don_effectue']),
      lieuxDifferentsVisites: visitesParLieu.size,
      visitesParLieu,
      typesEtablissementVisites,
      themesAccomplis,
    };
  }

  async getCollection(playerId: string): Promise<CollectionSummary> {
    const [stats, progression] = await Promise.all([
      this.getStats(playerId),
      this.progressions.findOne({ where: { playerId } }),
    ]);

    const equipe = progression?.titreEquipe ?? null;

    return {
      titreEquipe: equipe ? { id: equipe, libelle: libelleTitre(equipe) ?? equipe } : null,
      titres: TITRES.map((titre) => ({
        id: titre.id,
        libelle: titre.libelle,
        condition: titre.condition,
        obtenu: titre.estObtenu(stats),
      })),
      series: seriesCollection(stats),
    };
  }

  /** Le joueur choisit le titre affiché sur son profil, parmi ceux qu'il a. */
  async equiperTitre(playerId: string, titreId: string | null): Promise<CollectionSummary> {
    const progression = await this.progressions.findOne({ where: { playerId } });
    if (!progression) {
      throw new NotFoundException('Joueur introuvable.');
    }

    if (titreId) {
      const stats = await this.getStats(playerId);
      if (!titreEstObtenu(titreId, stats)) {
        throw new BadRequestException("Tu n'as pas encore ce titre.");
      }
    }

    progression.titreEquipe = titreId;
    progression.updatedAt = new Date();
    await this.progressions.save(progression);

    return this.getCollection(playerId);
  }

  /** Titres affichés à côté du pseudo (profil d'un ami, par exemple). */
  async getTitresEquipes(playerIds: string[]): Promise<Map<string, string>> {
    if (playerIds.length === 0) {
      return new Map();
    }
    const rows = await this.progressions.find({ where: { playerId: In(playerIds) } });
    const titres = new Map<string, string>();
    rows.forEach((row) => {
      const libelle = libelleTitre(row.titreEquipe);
      if (libelle) {
        titres.set(row.playerId, libelle);
      }
    });
    return titres;
  }
}
