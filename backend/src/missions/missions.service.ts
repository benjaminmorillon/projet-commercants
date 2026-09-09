import { Injectable, Logger, NotFoundException, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { readFileSync } from 'fs';
import { join } from 'path';
import { FindOptionsWhere, Repository } from 'typeorm';
import { Mission } from './mission.entity';
import { MissionsCatalogue } from './missions-catalogue.types';

export interface MissionFilters {
  archetype?: string;
  duree?: string;
  theme?: string;
  modeInteraction?: string;
}

@Injectable()
export class MissionsService implements OnModuleInit {
  private readonly logger = new Logger(MissionsService.name);

  constructor(
    @InjectRepository(Mission)
    private readonly missions: Repository<Mission>,
  ) {}

  // Au premier démarrage, la table est vide : on l'initialise avec le
  // catalogue de départ fourni dans les specs (docs/missions-catalogue.json),
  // comme prévu section 2.10. Les démarrages suivants ne font rien.
  async onModuleInit() {
    const count = await this.missions.count();
    if (count > 0) {
      return;
    }

    const catalogue = this.loadCatalogue();
    const entities = catalogue.missions.map((m) =>
      this.missions.create({
        id: m.id,
        titre: m.titre,
        description: m.description,
        archetypeDominant: m.archetype_dominant,
        duree: m.duree,
        theme: m.theme,
        modeInteraction: m.mode_interaction,
        phaseRelationnelle: m.phase_relationnelle ?? null,
        typeSpecial: m.type_special ?? null,
        recompenseBase: m.recompense_base,
        parcoursId: m.parcours_id ?? null,
        etape: m.etape ?? null,
        debloqueMissionId: m.debloque_mission_id ?? null,
      }),
    );

    await this.missions.save(entities);
    this.logger.log(`${entities.length} missions importées depuis le catalogue de départ.`);
  }

  private loadCatalogue(): MissionsCatalogue {
    const path = join(__dirname, '..', '..', '..', 'docs', 'missions-catalogue.json');
    const raw = readFileSync(path, 'utf-8');
    return JSON.parse(raw) as MissionsCatalogue;
  }

  findAll(filters: MissionFilters): Promise<Mission[]> {
    const where: FindOptionsWhere<Mission> = {};
    if (filters.archetype) where.archetypeDominant = filters.archetype;
    if (filters.duree) where.duree = filters.duree;
    if (filters.theme) where.theme = filters.theme;
    if (filters.modeInteraction) where.modeInteraction = filters.modeInteraction;

    return this.missions.find({ where, order: { id: 'ASC' } });
  }

  async findOne(id: string): Promise<Mission> {
    const mission = await this.missions.findOne({ where: { id } });
    if (!mission) {
      throw new NotFoundException('Mission introuvable.');
    }
    return mission;
  }
}
