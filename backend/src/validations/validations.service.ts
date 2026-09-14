import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ILike, In, Repository } from 'typeorm';
import { BalancingService } from '../balancing/balancing.service';
import { Business } from '../businesses/business.entity';
import { CheckIn } from '../checkins/checkin.entity';
import { ArbreService } from '../missions/arbre.service';
import { Mission } from '../missions/mission.entity';
import { PlayerEventType } from '../player-events/event-weights';
import { NotificationsService } from '../notifications/notifications.service';
import { PlayerEventsService } from '../player-events/player-events.service';
import { UnlockingService } from '../unlocking/unlocking.service';
import { User, UserType } from '../users/user.entity';
import { WalletService } from '../wallet/wallet.service';
import { RequestValidationDto } from './dto/request-validation.dto';
import { MissionValidation, ValidationStatut } from './mission-validation.entity';

// Quelle facette du joueur une mission accomplie révèle-t-elle ?
function typeEvenementMission(mission: Mission): PlayerEventType {
  if (mission.modeInteraction !== 'solo') {
    return 'mission_groupe_terminee';
  }
  if (mission.archetypeDominant === 'competiteur') {
    return 'mission_competitive_terminee';
  }
  return 'mission_solo_terminee';
}

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
    @InjectRepository(Business)
    private readonly businesses: Repository<Business>,
    private readonly arbre: ArbreService,
    private readonly wallet: WalletService,
    private readonly balancing: BalancingService,
    private readonly playerEvents: PlayerEventsService,
    private readonly unlocking: UnlockingService,
    private readonly notifications: NotificationsService,
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

    // Déblocage progressif (section 2.9) : le nombre de missions par jour est
    // serré au début, et le don n'est ouvert qu'à partir du niveau 2.
    await this.unlocking.assertQuotaDisponible(playerId);
    if (dto.choix === 'don') {
      await this.unlocking.assertOuverte(playerId, 'don');
    }

    const mission = await this.missions.findOne({ where: { id: missionId } });
    if (!mission) {
      throw new NotFoundException('Mission introuvable.');
    }

    // L'arbre des missions : on ne peut lancer que ce qu'il a ouvert.
    await this.arbre.assertMissionOuverte(playerId, missionId);

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
        where: { pseudo: ILike(dto.validatorPseudo.trim()), type: UserType.PARTICULIER },
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

    const demande = await this.validations.save(
      this.validations.create({
        missionId,
        playerId,
        choix: dto.choix,
        validatorType,
        validatorBusinessId,
        validatorPlayerId,
      }),
    );

    // Prévenir celui qui doit trancher : sans ça, personne ne sait qu'on
    // l'attend tant qu'il n'ouvre pas l'onglet Validation.
    const demandeur = await this.users.findOne({ where: { id: playerId } });
    const aPrevenir =
      validatorType === 'joueur'
        ? validatorPlayerId
        : (await this.businesses.findOne({ where: { id: validatorBusinessId as string } }))
            ?.userId ?? null;

    if (aPrevenir) {
      await this.notifications.prevenir(aPrevenir, 'validation_demandee', {
        pseudo: demandeur?.pseudo,
        mission: mission.titre,
      });
    }

    return demande;
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

  /**
   * `parUtilisateurId` est le compte connecté : seule la personne (ou le
   * commerçant) désignée à la création de la demande peut la trancher.
   * Sans ce contrôle, n'importe qui pourrait valider ses propres missions en
   * appelant l'API directement.
   */
  async resolve(
    validationId: string,
    statut: ValidationStatut,
    parUtilisateurId: string,
  ): Promise<MissionValidation> {
    const record = await this.validations.findOne({ where: { id: validationId } });
    if (!record) {
      throw new NotFoundException('Demande de validation introuvable.');
    }
    if (record.statut !== 'en_attente') {
      throw new BadRequestException('Cette demande a déjà été traitée.');
    }

    const autorise =
      record.validatorType === 'joueur'
        ? record.validatorPlayerId === parUtilisateurId
        : await this.businesses.exist({
            where: { id: record.validatorBusinessId as string, userId: parUtilisateurId },
          });

    if (!autorise) {
      throw new ForbiddenException("Cette demande ne t'est pas adressée.");
    }

    record.statut = statut;
    record.resolvedAt = new Date();
    await this.validations.save(record);

    await this.previensLeDemandeur(record, statut, parUtilisateurId);

    if (statut === 'validee') {
      const mission = await this.missions.findOne({ where: { id: record.missionId } });
      if (mission) {
        const recompenseFinale = await this.recompenseFinale(mission);

        await this.wallet.applyMissionReward(
          record.playerId,
          record.missionId,
          recompenseFinale,
          record.choix,
          `Mission : ${mission.titre}`,
        );

        // Le type de mission accomplie déplace le profil du joueur
        // (section 2.1 : le profil évolue à chaque action).
        await this.playerEvents.record(record.playerId, typeEvenementMission(mission), {
          businessId: mission.businessId,
          missionId: mission.id,
        });

        if (record.choix === 'don') {
          await this.playerEvents.record(record.playerId, 'don_effectue', {
            missionId: mission.id,
          });
        }
      }
    }

    return record;
  }

  /**
   * Ce qu'une mission validée rapporte vraiment.
   *
   * Deux coups de pouce se multiplient à la récompense de base :
   *   - celui du LIEU (section 4) : un commerce de qualité mais peu fréquenté
   *     rapporte davantage, pour rééquilibrer les flux ;
   *   - celui du PALIER (l'arbre des missions) : plus la mission est haut
   *     dans sa voie, plus elle a demandé d'investissement, plus elle paie.
   *
   * Le calcul vit ici, en un seul endroit, parce qu'il sert à la fois à
   * créditer le portefeuille et à annoncer le montant au joueur. Deux copies
   * finiraient par annoncer un chiffre et en verser un autre.
   */
  private async recompenseFinale(mission: Mission): Promise<number> {
    const [lieu, palier] = await Promise.all([
      this.balancing.getMultiplier(mission.businessId),
      this.arbre.primeDePalier(mission.id),
    ]);
    return Math.round(mission.recompenseBase * lieu * palier * 100) / 100;
  }

  // Dire au joueur ce que le validateur a décidé, et ce que ça lui rapporte.
  private async previensLeDemandeur(
    record: MissionValidation,
    statut: ValidationStatut,
    parUtilisateurId: string,
  ): Promise<void> {
    const [mission, validateur] = await Promise.all([
      this.missions.findOne({ where: { id: record.missionId } }),
      this.users.findOne({ where: { id: parUtilisateurId } }),
    ]);

    await this.notifications.prevenir(
      record.playerId,
      statut === 'validee' ? 'mission_validee' : 'mission_refusee',
      {
        pseudo: validateur?.pseudo,
        mission: mission?.titre,
        credits: mission ? await this.recompenseFinale(mission) : undefined,
      },
    );
  }

  private async enrich(rows: MissionValidation[]): Promise<EnrichedValidation[]> {
    if (rows.length === 0) {
      return [];
    }

    const missionIds = [...new Set(rows.map((r) => r.missionId))];
    const playerIds = [...new Set(rows.map((r) => r.playerId))];

    const [missions, players, primes] = await Promise.all([
      this.missions.find({ where: { id: In(missionIds) } }),
      this.users.find({ where: { id: In(playerIds) } }),
      this.arbre.primesDePalier(missionIds),
    ]);

    const missionById = new Map(missions.map((m) => [m.id, m]));
    const playerById = new Map(players.map((p) => [p.id, p]));

    return rows.map((row) => {
      const mission = missionById.get(row.missionId);
      // La récompense annoncée au validateur inclut la prime de palier,
      // comme celle affichée au joueur dans son arbre. Le multiplicateur du
      // lieu, lui, dépend de la fréquentation au moment du crédit : il n'a
      // pas sa place dans une liste d'attente.
      const prime = primes.get(row.missionId) ?? 1;

      return {
        ...row,
        missionTitre: mission?.titre ?? 'Mission',
        missionRecompense: mission
          ? Math.round(mission.recompenseBase * prime * 100) / 100
          : 0,
        requesterPseudo: playerById.get(row.playerId)?.pseudo ?? 'Joueur',
      };
    });
  }
}
