import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Business } from '../businesses/business.entity';
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

    return this.checkIns.save(
      this.checkIns.create({
        playerId: dto.playerId,
        businessId,
        latitude: dto.latitude,
        longitude: dto.longitude,
        distanceMeters: distance,
      }),
    );
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

    return this.reviews.save(
      this.reviews.create({
        playerId: dto.playerId,
        businessId,
        checkInId: lastCheckIn.id,
        note: dto.note,
        commentaire: dto.commentaire ?? null,
      }),
    );
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
