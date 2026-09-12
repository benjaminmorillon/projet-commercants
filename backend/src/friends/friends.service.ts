import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { Mission } from '../missions/mission.entity';
import { PlayerEventsService } from '../player-events/player-events.service';
import { PlayerProfile } from '../players/player-profile.entity';
import { User, UserType } from '../users/user.entity';
import { MissionValidation } from '../validations/mission-validation.entity';
import { SendFriendRequestDto } from './dto/send-friend-request.dto';
import { Friendship, FriendshipStatut } from './friendship.entity';

export interface FriendSummary {
  id: string;
  pseudo: string;
}

export interface EnrichedFriendRequest extends Friendship {
  otherPseudo: string;
}

export interface FriendProfile {
  friend: FriendSummary;
  profile: PlayerProfile | null;
  missionsAccomplies: { titre: string; recompenseBase: number; date: Date }[];
}

@Injectable()
export class FriendsService {
  constructor(
    @InjectRepository(Friendship)
    private readonly friendships: Repository<Friendship>,
    @InjectRepository(User)
    private readonly users: Repository<User>,
    @InjectRepository(PlayerProfile)
    private readonly profiles: Repository<PlayerProfile>,
    @InjectRepository(MissionValidation)
    private readonly validations: Repository<MissionValidation>,
    @InjectRepository(Mission)
    private readonly missions: Repository<Mission>,
    private readonly playerEvents: PlayerEventsService,
  ) {}

  private async getPlayerOrThrow(playerId: string): Promise<User> {
    const player = await this.users.findOne({ where: { id: playerId } });
    if (!player || player.type !== UserType.PARTICULIER) {
      throw new NotFoundException('Joueur introuvable.');
    }
    return player;
  }

  private async findBetween(playerId: string, otherId: string): Promise<Friendship | null> {
    return this.friendships
      .createQueryBuilder('f')
      .where(
        '((f.requesterId = :playerId AND f.receiverId = :otherId) OR (f.requesterId = :otherId AND f.receiverId = :playerId))',
        { playerId, otherId },
      )
      .andWhere('f.statut IN (:...statuts)', { statuts: ['en_attente', 'acceptee'] })
      .getOne();
  }

  async sendRequest(playerId: string, dto: SendFriendRequestDto): Promise<Friendship> {
    await this.getPlayerOrThrow(playerId);

    const target = await this.users.findOne({
      where: { pseudo: dto.pseudo, type: UserType.PARTICULIER },
    });
    if (!target) {
      throw new NotFoundException('Aucun joueur ne correspond à ce pseudo.');
    }
    if (target.id === playerId) {
      throw new BadRequestException('Tu ne peux pas t’ajouter toi-même.');
    }

    const existing = await this.findBetween(playerId, target.id);
    if (existing) {
      throw new BadRequestException(
        existing.statut === 'acceptee'
          ? 'Vous êtes déjà amis.'
          : 'Une demande est déjà en attente entre vous.',
      );
    }

    return this.friendships.save(
      this.friendships.create({
        requesterId: playerId,
        receiverId: target.id,
        statut: 'en_attente',
      }),
    );
  }

  async listReceived(playerId: string): Promise<EnrichedFriendRequest[]> {
    const rows = await this.friendships.find({
      where: { receiverId: playerId, statut: 'en_attente' },
      order: { createdAt: 'DESC' },
    });
    return this.enrichWithOtherPseudo(rows, (r) => r.requesterId);
  }

  async listSent(playerId: string): Promise<EnrichedFriendRequest[]> {
    const rows = await this.friendships.find({
      where: { requesterId: playerId, statut: 'en_attente' },
      order: { createdAt: 'DESC' },
    });
    return this.enrichWithOtherPseudo(rows, (r) => r.receiverId);
  }

  async resolve(requestId: string, statut: FriendshipStatut): Promise<Friendship> {
    const record = await this.friendships.findOne({ where: { id: requestId } });
    if (!record) {
      throw new NotFoundException('Demande introuvable.');
    }
    if (record.statut !== 'en_attente') {
      throw new BadRequestException('Cette demande a déjà été traitée.');
    }
    record.statut = statut;
    record.resolvedAt = new Date();
    const saved = await this.friendships.save(record);

    // Se lier à quelqu'un compte pour les deux côtés de l'amitié.
    if (statut === 'acceptee') {
      await this.playerEvents.record(record.requesterId, 'ami_ajoute');
      await this.playerEvents.record(record.receiverId, 'ami_ajoute');
    }

    return saved;
  }

  async listFriends(playerId: string): Promise<FriendSummary[]> {
    await this.getPlayerOrThrow(playerId);

    const rows = await this.friendships
      .createQueryBuilder('f')
      .where('(f.requesterId = :playerId OR f.receiverId = :playerId)', { playerId })
      .andWhere('f.statut = :statut', { statut: 'acceptee' })
      .getMany();

    const otherIds = rows.map((r) => (r.requesterId === playerId ? r.receiverId : r.requesterId));
    if (otherIds.length === 0) {
      return [];
    }
    const others = await this.users.find({ where: { id: In(otherIds) } });
    return others.map((u) => ({ id: u.id, pseudo: u.pseudo }));
  }

  async getFriendProfile(playerId: string, friendId: string): Promise<FriendProfile> {
    const friendship = await this.findBetween(playerId, friendId);
    if (!friendship || friendship.statut !== 'acceptee') {
      throw new NotFoundException('Vous devez être amis pour voir ce profil.');
    }

    const friend = await this.getPlayerOrThrow(friendId);
    const profile = await this.profiles.findOne({ where: { userId: friendId } });

    const validated = await this.validations.find({
      where: { playerId: friendId, statut: 'validee' },
      order: { resolvedAt: 'DESC' },
      take: 10,
    });
    const missionIds = [...new Set(validated.map((v) => v.missionId))];
    const missions = missionIds.length
      ? await this.missions.find({ where: { id: In(missionIds) } })
      : [];
    const missionById = new Map(missions.map((m) => [m.id, m]));

    return {
      friend: { id: friend.id, pseudo: friend.pseudo },
      profile: profile ?? null,
      missionsAccomplies: validated.map((v) => ({
        titre: missionById.get(v.missionId)?.titre ?? 'Mission',
        recompenseBase: missionById.get(v.missionId)?.recompenseBase ?? 0,
        date: v.resolvedAt as Date,
      })),
    };
  }

  private async enrichWithOtherPseudo(
    rows: Friendship[],
    otherIdOf: (r: Friendship) => string,
  ): Promise<EnrichedFriendRequest[]> {
    if (rows.length === 0) {
      return [];
    }
    const otherIds = [...new Set(rows.map(otherIdOf))];
    const others = await this.users.find({ where: { id: In(otherIds) } });
    const byId = new Map(others.map((u) => [u.id, u.pseudo]));
    return rows.map((row) => ({
      ...row,
      otherPseudo: byId.get(otherIdOf(row)) ?? 'Joueur',
    }));
  }
}
