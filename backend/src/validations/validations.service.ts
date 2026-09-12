import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { CheckIn } from '../checkins/checkin.entity';
import { Mission } from '../missions/mission.entity';
import { User, UserType } from '../users/user.entity';
import { WalletService } from '../wallet/wallet.service';
import { RequestValidationDto } from './dto/request-validation.dto';
import { MissionValidation, ValidationStatut } from './mission-validation.entity';

export interface EnrichedValidation extends MissionValidation {
  missionTitre: string;
  missionRecompense: number;
  requesterPseudo: string;
}

@Injectable()
export class ValidationsService {
  constructor(
    @InjectRepository(MissionValidation)
    private readonly validations: Repository<MissionValidation>,
    @InjectRepository(Mission)
    private readonly missions: Repository<Mission>,
    @InjectRepository(User)
    private readonly users: Repository<User>,
    @InjectRepository(CheckIn)
    private readonly checkIns: Repository<CheckIn>,
    private readonly wallet: WalletService,
  ) {}

  private async getPlayerOrThrow(playerId: string): Promise<User> {
    const player = await this.users.findOne({ where: { id: playerId } });
    if (!player || player.type !== UserType.PARTICULIER) {
      throw new NotFoundException('Joueur introuvable.');
    }
    return player;
  }

  async requestValidation(
    playerId: string,
    missionId: string,
    dto: RequestValidationDto,
  ): Promise<MissionValidation> {
    await this.getPlayerOrThrow(playerId);

    const mission = await this.missions.findOne({ where: { id: missionId } });
    if (!mission) {
      throw new NotFoundException('Mission introuvable.');
    }

    const existing = await this.validations.findOne({
      where: { playerId, missionId, statut: In(['en_attente', 'validee']) },
    });
    if (existing) {
      throw new BadRequestException(
        existing.statut === 'validee'
          ? 'Tu as déjà accompli cette mission.'
          : 'Une demande de validation est déjà en attente pour cette mission.',
      );
    }

    let validatorType: 'commercant' | 'joueur';
    let validatorBusinessId: string | null = null;
    let validatorPlayerId: string | null = null;

    if (mission.businessId) {
      const checkin = await this.checkIns.findOne({
        where: { playerId, businessId: mission.businessId },
      });
      if (!checkin) {
        throw new BadRequestException(
          'Tu dois être check-iné sur ce lieu avant de demander la validation de cette mission.',
        );
      }
      validatorType = 'commercant';
      validatorBusinessId = mission.businessId;
    } else {
      if (!dto.validatorPseudo) {
        throw new BadRequestException(
          'Indique le pseudo du joueur qui doit valider cette mission.',
        );
      }
      const validator = await this.users.findOne({
        where: { pseudo: dto.validatorPseudo, type: UserType.PARTICULIER },
      });
      if (!validator) {
        throw new NotFoundException('Aucun joueur ne correspond à ce pseudo.');
      }
      if (validator.id === playerId) {
        throw new BadRequestException('Tu ne peux pas valider ta propre mission.');
      }
      validatorType = 'joueur';
      validatorPlayerId = validator.id;
    }

    return this.validations.save(
      this.validations.create({
        missionId,
        playerId,
        choix: dto.choix,
        validatorType,
        validatorBusinessId,
        validatorPlayerId,
      }),
    );
  }

  async listRequestedByPlayer(playerId: string): Promise<MissionValidation[]> {
    await this.getPlayerOrThrow(playerId);
    return this.validations.find({ where: { playerId }, order: { createdAt: 'DESC' } });
  }

  async listToValidateForBusiness(businessId: string): Promise<EnrichedValidation[]> {
    const rows = await this.validations.find({
      where: { validatorBusinessId: businessId, statut: 'en_attente' },
      order: { createdAt: 'ASC' },
    });
    return this.enrich(rows);
  }

  async listToValidateForPlayer(playerId: string): Promise<EnrichedValidation[]> {
    const rows = await this.validations.find({
      where: { validatorPlayerId: playerId, statut: 'en_attente' },
      order: { createdAt: 'ASC' },
    });
    return this.enrich(rows);
  }

  async resolve(validationId: string, statut: ValidationStatut): Promise<MissionValidation> {
    const record = await this.validations.findOne({ where: { id: validationId } });
    if (!record) {
      throw new NotFoundException('Demande de validation introuvable.');
    }
    if (record.statut !== 'en_attente') {
      throw new BadRequestException('Cette demande a déjà été traitée.');
    }

    record.statut = statut;
    record.resolvedAt = new Date();
    await this.validations.save(record);

    if (statut === 'validee') {
      const mission = await this.missions.findOne({ where: { id: record.missionId } });
      if (mission) {
        await this.wallet.applyMissionReward(
          record.playerId,
          record.missionId,
          mission.recompenseBase,
          record.choix,
          `Mission : ${mission.titre}`,
        );
      }
    }

    return record;
  }

  private async enrich(rows: MissionValidation[]): Promise<EnrichedValidation[]> {
    if (rows.length === 0) {
      return [];
    }

    const missionIds = [...new Set(rows.map((r) => r.missionId))];
    const playerIds = [...new Set(rows.map((r) => r.playerId))];

    const [missions, players] = await Promise.all([
      this.missions.find({ where: { id: In(missionIds) } }),
      this.users.find({ where: { id: In(playerIds) } }),
    ]);

    const missionById = new Map(missions.map((m) => [m.id, m]));
    const playerById = new Map(players.map((p) => [p.id, p]));

    return rows.map((row) => ({
      ...row,
      missionTitre: missionById.get(row.missionId)?.titre ?? 'Mission',
      missionRecompense: missionById.get(row.missionId)?.recompenseBase ?? 0,
      requesterPseudo: playerById.get(row.playerId)?.pseudo ?? 'Joueur',
    }));
  }
}
