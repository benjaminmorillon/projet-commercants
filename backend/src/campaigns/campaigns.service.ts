import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, MoreThanOrEqual, Repository } from 'typeorm';
import { BalancingService } from '../balancing/balancing.service';
import { Business } from '../businesses/business.entity';
import { Event } from '../events/event.entity';
import { PlayerProfile } from '../players/player-profile.entity';
import { User, UserType } from '../users/user.entity';
import { MissionValidation } from '../validations/mission-validation.entity';
import { WalletService } from '../wallet/wallet.service';
import { CampaignTarget, TargetStatut } from './campaign-target.entity';
import { Campaign, PART_JOUEUR } from './campaign.entity';
import { CreateCampaignDto } from './dto/create-campaign.dto';
import { RespondInvitationDto } from './dto/respond-invitation.dto';
import { TargetingCriteriaDto } from './dto/targeting-criteria.dto';

export interface TargetingPreview {
  nombreCibles: number;
  coutTotal: number;
  coutParCible: number;
  multiplicateur: number;
  creditParJoueur: number;
  apercu: { pseudo: string; scores: Record<string, number>; missionsReussies: number }[];
}

// Tarif réellement facturé au commerçant pour une cible : la somme qu'il
// alloue, divisée par le multiplicateur de son lieu. Un lieu qualitatif
// mais sous-fréquenté (multiplicateur > 1) paie donc moins cher que le
// montant alloué, un lieu déjà saturé paie plus (section 3.4 des specs).
function coutFacture(montantParCible: number, multiplicateur: number): number {
  return Math.round((montantParCible / multiplicateur) * 100) / 100;
}

@Injectable()
export class CampaignsService {
  constructor(
    @InjectRepository(Campaign)
    private readonly campaigns: Repository<Campaign>,
    @InjectRepository(CampaignTarget)
    private readonly targets: Repository<CampaignTarget>,
    @InjectRepository(Business)
    private readonly businesses: Repository<Business>,
    @InjectRepository(Event)
    private readonly events: Repository<Event>,
    @InjectRepository(PlayerProfile)
    private readonly profiles: Repository<PlayerProfile>,
    @InjectRepository(User)
    private readonly users: Repository<User>,
    @InjectRepository(MissionValidation)
    private readonly validations: Repository<MissionValidation>,
    private readonly wallet: WalletService,
    private readonly balancing: BalancingService,
  ) {}

  private async getBusinessOrThrow(businessId: string): Promise<Business> {
    const business = await this.businesses.findOne({ where: { id: businessId } });
    if (!business) {
      throw new NotFoundException('Commerçant introuvable.');
    }
    return business;
  }

  // Nombre de missions validées par joueur, pour le critère
  // "nombre de missions réussies".
  private async countMissionsReussies(playerIds: string[]): Promise<Map<string, number>> {
    if (playerIds.length === 0) {
      return new Map();
    }
    const rows = await this.validations
      .createQueryBuilder('v')
      .select('v.playerId', 'playerId')
      .addSelect('COUNT(v.id)', 'total')
      .where('v.statut = :statut', { statut: 'validee' })
      .andWhere('v.playerId IN (:...playerIds)', { playerIds })
      .groupBy('v.playerId')
      .getRawMany<{ playerId: string; total: string }>();

    return new Map(rows.map((row) => [row.playerId, Number(row.total)]));
  }

  private async findMatchingProfiles(criteria: TargetingCriteriaDto): Promise<{
    profiles: PlayerProfile[];
    missionsParJoueur: Map<string, number>;
  }> {
    const profiles = await this.profiles.find({
      where: {
        scoreExplorateur: MoreThanOrEqual(criteria.minExplorateur ?? 0),
        scoreAccomplisseur: MoreThanOrEqual(criteria.minAccomplisseur ?? 0),
        scoreCompetiteur: MoreThanOrEqual(criteria.minCompetiteur ?? 0),
        scoreSocialisateur: MoreThanOrEqual(criteria.minSocialisateur ?? 0),
      },
    });

    const missionsParJoueur = await this.countMissionsReussies(profiles.map((p) => p.userId));
    const minMissions = criteria.minMissionsReussies ?? 0;

    return {
      profiles: profiles.filter((p) => (missionsParJoueur.get(p.userId) ?? 0) >= minMissions),
      missionsParJoueur,
    };
  }

  async preview(
    businessId: string,
    criteria: TargetingCriteriaDto & { montantParCible?: number },
  ): Promise<TargetingPreview> {
    await this.getBusinessOrThrow(businessId);

    const { profiles, missionsParJoueur } = await this.findMatchingProfiles(criteria);
    const montant = criteria.montantParCible ?? 0;
    const multiplicateur = await this.balancing.getMultiplier(businessId);
    const coutParCible = coutFacture(montant, multiplicateur);

    const echantillon = profiles.slice(0, 5);
    const users = echantillon.length
      ? await this.users.find({ where: { id: In(echantillon.map((p) => p.userId)) } })
      : [];
    const pseudoById = new Map(users.map((u) => [u.id, u.pseudo]));

    return {
      nombreCibles: profiles.length,
      coutTotal: Math.round(profiles.length * coutParCible * 100) / 100,
      coutParCible,
      multiplicateur,
      creditParJoueur: Math.round(montant * PART_JOUEUR * 100) / 100,
      apercu: echantillon.map((p) => ({
        pseudo: pseudoById.get(p.userId) ?? 'Joueur',
        scores: {
          explorateur: p.scoreExplorateur,
          accomplisseur: p.scoreAccomplisseur,
          competiteur: p.scoreCompetiteur,
          socialisateur: p.scoreSocialisateur,
        },
        missionsReussies: missionsParJoueur.get(p.userId) ?? 0,
      })),
    };
  }

  async create(businessId: string, dto: CreateCampaignDto): Promise<Campaign> {
    await this.getBusinessOrThrow(businessId);

    if (dto.type === 'invitation') {
      if (!dto.eventId) {
        throw new BadRequestException('Choisis l’événement auquel tu invites.');
      }
      const event = await this.events.findOne({ where: { id: dto.eventId } });
      if (!event || event.businessId !== businessId) {
        throw new NotFoundException('Événement introuvable.');
      }
    }

    const { profiles } = await this.findMatchingProfiles(dto);
    if (profiles.length === 0) {
      throw new BadRequestException(
        'Aucun joueur ne correspond à ces critères — assouplis-les pour toucher du monde.',
      );
    }

    const multiplicateur = await this.balancing.getMultiplier(businessId);
    const coutParCible = coutFacture(dto.montantParCible, multiplicateur);

    const campaign = await this.campaigns.save(
      this.campaigns.create({
        businessId,
        type: dto.type,
        eventId: dto.type === 'invitation' ? (dto.eventId as string) : null,
        message: dto.message,
        imageDataUrl: dto.imageDataUrl ?? null,
        montantParCible: dto.montantParCible,
        minExplorateur: dto.minExplorateur ?? 0,
        minAccomplisseur: dto.minAccomplisseur ?? 0,
        minCompetiteur: dto.minCompetiteur ?? 0,
        minSocialisateur: dto.minSocialisateur ?? 0,
        minMissionsReussies: dto.minMissionsReussies ?? 0,
        nombreCibles: profiles.length,
        coutTotal: Math.round(profiles.length * coutParCible * 100) / 100,
      }),
    );

    // Le crédit part dès l'envoi : être ciblé suffit, la cible n'a pas
    // besoin d'accepter pour toucher sa part (section 3.4 des specs).
    const creditJoueur = Math.round(dto.montantParCible * PART_JOUEUR * 100) / 100;
    const business = await this.businesses.findOne({ where: { id: businessId } });

    await this.targets.save(
      profiles.map((profile) =>
        this.targets.create({
          campaignId: campaign.id,
          playerId: profile.userId,
          creditVerse: creditJoueur,
        }),
      ),
    );

    await Promise.all(
      profiles.map((profile) =>
        this.wallet.applyCredit(
          profile.userId,
          creditJoueur,
          campaign.id,
          `Ciblage : ${business?.nom ?? 'un établissement'}`,
        ),
      ),
    );

    return campaign;
  }

  // Résultats vus par le commerçant : combien ont accepté/refusé, et ce que
  // les cibles en pensent.
  async listForBusiness(businessId: string) {
    await this.getBusinessOrThrow(businessId);

    const campaigns = await this.campaigns.find({
      where: { businessId },
      order: { createdAt: 'DESC' },
    });
    if (campaigns.length === 0) {
      return [];
    }

    const [targets, events] = await Promise.all([
      this.targets.find({ where: { campaignId: In(campaigns.map((c) => c.id)) } }),
      this.events.find({ where: { businessId } }),
    ]);

    const playerIds = [...new Set(targets.map((t) => t.playerId))];
    const users = playerIds.length
      ? await this.users.find({ where: { id: In(playerIds) } })
      : [];
    const pseudoById = new Map(users.map((u) => [u.id, u.pseudo]));
    const eventById = new Map(events.map((e) => [e.id, e]));

    return campaigns.map((campaign) => {
      const mine = targets.filter((t) => t.campaignId === campaign.id);
      return {
        ...campaign,
        eventTitre: campaign.eventId ? (eventById.get(campaign.eventId)?.titre ?? null) : null,
        acceptees: mine.filter((t) => t.statut === 'acceptee').length,
        refusees: mine.filter((t) => t.statut === 'refusee').length,
        enAttente: mine.filter((t) => t.statut === 'envoyee').length,
        retours: mine
          .filter((t) => t.statut !== 'envoyee')
          .map((t) => ({
            pseudo: pseudoById.get(t.playerId) ?? 'Joueur',
            statut: t.statut,
            reaction: t.reaction,
            commentaire: t.commentaire,
          })),
      };
    });
  }

  // Boîte de réception d'un joueur : ses invitations et publicités reçues.
  async listForPlayer(playerId: string) {
    const player = await this.users.findOne({ where: { id: playerId } });
    if (!player || player.type !== UserType.PARTICULIER) {
      throw new NotFoundException('Joueur introuvable.');
    }

    const targets = await this.targets.find({
      where: { playerId },
      order: { createdAt: 'DESC' },
    });
    if (targets.length === 0) {
      return [];
    }

    const campaigns = await this.campaigns.find({
      where: { id: In([...new Set(targets.map((t) => t.campaignId))]) },
    });
    const campaignById = new Map(campaigns.map((c) => [c.id, c]));

    const businessIds = [...new Set(campaigns.map((c) => c.businessId))];
    const eventIds = campaigns.map((c) => c.eventId).filter((id): id is string => Boolean(id));

    const [businesses, events] = await Promise.all([
      businessIds.length ? this.businesses.find({ where: { id: In(businessIds) } }) : [],
      eventIds.length ? this.events.find({ where: { id: In(eventIds) } }) : [],
    ]);
    const businessById = new Map(businesses.map((b) => [b.id, b]));
    const eventById = new Map(events.map((e) => [e.id, e]));

    return targets
      .filter((target) => campaignById.has(target.campaignId))
      .map((target) => {
        const campaign = campaignById.get(target.campaignId) as Campaign;
        const business = businessById.get(campaign.businessId);
        const event = campaign.eventId ? eventById.get(campaign.eventId) : null;

        return {
          id: target.id,
          statut: target.statut,
          reaction: target.reaction,
          creditVerse: target.creditVerse,
          creditPropose: Math.round(campaign.montantParCible * PART_JOUEUR * 100) / 100,
          type: campaign.type,
          message: campaign.message,
          imageDataUrl: campaign.imageDataUrl,
          lieuNom: business?.nom ?? 'Un établissement',
          lieuAdresse: business?.adresse ?? '',
          evenement: event
            ? { titre: event.titre, description: event.description, dateDebut: event.dateDebut }
            : null,
          createdAt: target.createdAt,
        };
      });
  }

  async respond(
    targetId: string,
    statut: Exclude<TargetStatut, 'envoyee'>,
    dto: RespondInvitationDto,
  ): Promise<CampaignTarget> {
    const target = await this.targets.findOne({ where: { id: targetId } });
    if (!target) {
      throw new NotFoundException('Invitation introuvable.');
    }
    if (target.statut !== 'envoyee') {
      throw new BadRequestException('Tu as déjà répondu à cette invitation.');
    }

    // Le crédit a déjà été versé à l'envoi : répondre ne sert qu'à dire au
    // commerçant si ça intéresse, et pourquoi.
    target.statut = statut;
    target.reaction = dto.reaction ?? null;
    target.commentaire = dto.commentaire ?? null;
    target.respondedAt = new Date();

    return this.targets.save(target);
  }
}
