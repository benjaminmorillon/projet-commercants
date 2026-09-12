import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Business } from '../businesses/business.entity';
import { BalancingService } from '../balancing/balancing.service';
import { PlayerEventsService } from '../player-events/player-events.service';
import { UnlockingService } from '../unlocking/unlocking.service';
import { User, UserType } from '../users/user.entity';
import { CreateCheckinDto } from './dto/create-checkin.dto';
import { CreateReviewDto } from './dto/create-review.dto';
import { CHECKIN_RADIUS_METERS, distanceInMeters } from './geo';
import { CheckIn } from './checkin.entity';
import { Review } from './review.entity';

export interface RatingSummary {
  noteMoyenne: number;
  nombreAvis: number;
}

@Injectable()
export class CheckinsService {
  constructor(
    @InjectRepository(Business)
    private readonly businesses: Repository<Business>,
    @InjectRepository(User)
    private readonly users: Repository<User>,
    @InjectRepository(CheckIn)
    private readonly checkIns: Repository<CheckIn>,
    @InjectRepository(Review)
    private readonly reviews: Repository<Review>,
    private readonly playerEvents: PlayerEventsService,
    private readonly balancing: BalancingService,
    private readonly unlocking: UnlockingService,
  ) {}

  private async getBusinessOrThrow(businessId: string): Promise<Business> {
    const business = await this.businesses.findOne({ where: { id: businessId } });
    if (!business) {
      throw new NotFoundException('Lieu introuvable.');
    }
    return business;
  }

  private async getPlayerOrThrow(playerId: string): Promise<User> {
    const player = await this.users.findOne({ where: { id: playerId } });
    if (!player || player.type !== UserType.PARTICULIER) {
      throw new NotFoundException('Joueur introuvable.');
    }
    return player;
  }

  async checkIn(businessId: string, dto: CreateCheckinDto): Promise<CheckIn> {
    const business = await this.getBusinessOrThrow(businessId);
    await this.getPlayerOrThrow(dto.playerId);

    const distance = distanceInMeters(
      business.latitude,
      business.longitude,
      dto.latitude,
      dto.longitude,
    );

    if (distance > CHECKIN_RADIUS_METERS) {
      throw new BadRequestException(
        `Tu es à ${Math.round(distance)}m du lieu (max ${CHECKIN_RADIUS_METERS}m) : trop loin pour valider le check-in.`,
      );
    }

    // Découvrir un lieu ou revenir dans un lieu connu ne dit pas la même
    // chose du joueur : le moteur d'événements fait la différence.
    const dejaVenu = await this.checkIns.findOne({
      where: { playerId: dto.playerId, businessId },
    });

    const checkin = await this.checkIns.save(
      this.checkIns.create({
        playerId: dto.playerId,
        businessId,
        latitude: dto.latitude,
        longitude: dto.longitude,
        distanceMeters: distance,
      }),
    );

    await this.playerEvents.record(
      dto.playerId,
      dejaVenu ? 'lieu_habituel_visite' : 'lieu_inedit_visite',
      { businessId },
    );

    // Se déplacer lève le voile sur le quartier (section 2.9). La découverte
    // rapporte plus si le lieu est encore peu fréquenté.
    const multiplicateur = await this.balancing.getMultiplier(businessId);
    const zone = await this.unlocking.enregistrerDecouverte(
      dto.playerId,
      business,
      multiplicateur,
    );

    return Object.assign(checkin, {
      zoneDecouverte: zone ? { cleZone: zone.cleZone, xpGagnee: zone.xpGagnee } : null,
    });
  }

  async createReview(businessId: string, dto: CreateReviewDto): Promise<Review> {
    await this.getBusinessOrThrow(businessId);
    await this.getPlayerOrThrow(dto.playerId);

    const lastCheckIn = await this.checkIns.findOne({
      where: { businessId, playerId: dto.playerId },
      order: { createdAt: 'DESC' },
    });

    if (!lastCheckIn) {
      throw new BadRequestException(
        'Tu dois être check-iné sur ce lieu pour pouvoir laisser un avis.',
      );
    }

    const review = await this.reviews.save(
      this.reviews.create({
        playerId: dto.playerId,
        businessId,
        checkInId: lastCheckIn.id,
        note: dto.note,
        commentaire: dto.commentaire ?? null,
      }),
    );

    await this.playerEvents.record(dto.playerId, 'avis_publie', { businessId });

    return review;
  }

  findReviewsForBusiness(businessId: string): Promise<Review[]> {
    return this.reviews.find({ where: { businessId }, order: { createdAt: 'DESC' } });
  }

  async getRatingsSummary(businessIds: string[]): Promise<Map<string, RatingSummary>> {
    if (businessIds.length === 0) {
      return new Map();
    }

    const rows = await this.reviews
      .createQueryBuilder('review')
      .select('review.businessId', 'businessId')
      .addSelect('AVG(review.note)', 'avg')
      .addSelect('COUNT(review.id)', 'count')
      .where('review.businessId IN (:...businessIds)', { businessIds })
      .groupBy('review.businessId')
      .getRawMany<{ businessId: string; avg: string; count: string }>();

    const summary = new Map<string, RatingSummary>();
    rows.forEach((row) => {
      summary.set(row.businessId, {
        noteMoyenne: Math.round(Number(row.avg) * 10) / 10,
        nombreAvis: Number(row.count),
      });
    });
    return summary;
  }

  // Fréquentation : nombre de check-ins par lieu, utilisé pour comparer les
  // établissements sur la carte concurrence.
  async getVisitsSummary(businessIds: string[]): Promise<Map<string, number>> {
    if (businessIds.length === 0) {
      return new Map();
    }

    const rows = await this.checkIns
      .createQueryBuilder('c')
      .select('c.businessId', 'businessId')
      .addSelect('COUNT(c.id)', 'total')
      .where('c.businessId IN (:...businessIds)', { businessIds })
      .groupBy('c.businessId')
      .getRawMany<{ businessId: string; total: string }>();

    return new Map(rows.map((row) => [row.businessId, Number(row.total)]));
  }
}
