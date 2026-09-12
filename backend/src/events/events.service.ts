import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Business } from '../businesses/business.entity';
import { CreateEventDto } from './dto/create-event.dto';
import { Event } from './event.entity';

@Injectable()
export class EventsService {
  constructor(
    @InjectRepository(Event)
    private readonly events: Repository<Event>,
    @InjectRepository(Business)
    private readonly businesses: Repository<Business>,
  ) {}

  private async getBusinessOrThrow(businessId: string): Promise<Business> {
    const business = await this.businesses.findOne({ where: { id: businessId } });
    if (!business) {
      throw new NotFoundException('Commerçant introuvable.');
    }
    return business;
  }

  async create(businessId: string, dto: CreateEventDto): Promise<Event> {
    await this.getBusinessOrThrow(businessId);

    return this.events.save(
      this.events.create({
        businessId,
        titre: dto.titre,
        description: dto.description,
        dateDebut: new Date(dto.dateDebut),
        imageDataUrl: dto.imageDataUrl ?? null,
      }),
    );
  }

  async findByBusiness(businessId: string): Promise<Event[]> {
    await this.getBusinessOrThrow(businessId);
    return this.events.find({ where: { businessId }, order: { dateDebut: 'ASC' } });
  }
}
