import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { ReglagesService } from '../admin/reglages.service';
import { Business } from '../businesses/business.entity';
import { CheckIn } from '../checkins/checkin.entity';
import { Review } from '../checkins/review.entity';
import { computePlaceBalancing, PlaceBalancing } from './place-multiplier';

@Injectable()
export class BalancingService {
  constructor(
    @InjectRepository(Business)
    private readonly businesses: Repository<Business>,
    @InjectRepository(CheckIn)
    private readonly checkIns: Repository<CheckIn>,
    @InjectRepository(Review)
    private readonly reviews: Repository<Review>,
    private readonly reglages: ReglagesService,
  ) {}

  async getForBusinesses(businessIds: string[]): Promise<Map<string, PlaceBalancing>> {
    const result = new Map<string, PlaceBalancing>();
    if (businessIds.length === 0) {
      return result;
    }

    const fenetreJours = this.reglages.entier('equilibrage.fenetreJours');
    const debutFenetre = new Date(Date.now() - fenetreJours * 24 * 60 * 60 * 1000);

    const [businesses, visites, notes] = await Promise.all([
      this.businesses.find({ where: { id: In(businessIds) } }),
      this.checkIns
        .createQueryBuilder('c')
        .select('c.businessId', 'businessId')
        .addSelect('COUNT(c.id)', 'total')
        .where('c.businessId IN (:...businessIds)', { businessIds })
        .andWhere('c.createdAt > :debutFenetre', { debutFenetre })
        .groupBy('c.businessId')
        .getRawMany<{ businessId: string; total: string }>(),
      this.reviews
        .createQueryBuilder('r')
        .select('r.businessId', 'businessId')
        .addSelect('AVG(r.note)', 'avg')
        .where('r.businessId IN (:...businessIds)', { businessIds })
        .groupBy('r.businessId')
        .getRawMany<{ businessId: string; avg: string }>(),
    ]);

    const visitesById = new Map(visites.map((v) => [v.businessId, Number(v.total)]));
    const noteById = new Map(notes.map((n) => [n.businessId, Number(n.avg)]));

    businesses.forEach((business) => {
      result.set(
        business.id,
        computePlaceBalancing({
          nombreVisites: visitesById.get(business.id) ?? 0,
          capaciteEstimee: business.capaciteEstimee,
          // Avis internes en priorité, note Google en attendant d'en avoir.
          note: noteById.get(business.id) ?? business.noteGoogle ?? null,
        }, {
          capaciteParDefaut: this.reglages.entier('equilibrage.capaciteParDefaut'),
          facteurEcart: this.reglages.nombre('equilibrage.facteurEcart'),
          multiplicateurMin: this.reglages.nombre('equilibrage.multiplicateurMin'),
          multiplicateurMax: this.reglages.nombre('equilibrage.multiplicateurMax'),
        }),
      );
    });

    return result;
  }

  async getForBusiness(businessId: string): Promise<PlaceBalancing | null> {
    const map = await this.getForBusinesses([businessId]);
    return map.get(businessId) ?? null;
  }

  // Multiplicateur appliqué aux récompenses ; 1 (neutre) si la mission
  // n'est rattachée à aucun lieu.
  async getMultiplier(businessId: string | null): Promise<number> {
    if (!businessId) {
      return 1;
    }
    const balancing = await this.getForBusiness(businessId);
    return balancing?.multiplicateur ?? 1;
  }
}
