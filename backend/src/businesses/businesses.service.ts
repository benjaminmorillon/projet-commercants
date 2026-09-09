import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User, UserType } from '../users/user.entity';
import { Business } from './business.entity';
import { CreateBusinessDto } from './dto/create-business.dto';

@Injectable()
export class BusinessesService {
  constructor(
    @InjectRepository(User)
    private readonly users: Repository<User>,
    @InjectRepository(Business)
    private readonly businesses: Repository<Business>,
  ) {}

  async createBusiness(dto: CreateBusinessDto): Promise<Business> {
    const existing = await this.users.findOne({ where: { email: dto.email } });
    if (existing) {
      throw new ConflictException('Un compte existe déjà avec cet email.');
    }

    const user = await this.users.save(
      this.users.create({
        email: dto.email,
        pseudo: dto.nom,
        type: UserType.COMMERCANT,
      }),
    );

    return this.businesses.save(
      this.businesses.create({
        userId: user.id,
        nom: dto.nom,
        adresse: dto.adresse,
        typeEtablissement: dto.typeEtablissement,
        capaciteEstimee: dto.capaciteEstimee ?? null,
      }),
    );
  }

  async getBusiness(id: string): Promise<Business> {
    const business = await this.businesses.findOne({ where: { id } });
    if (!business) {
      throw new NotFoundException('Commerçant introuvable.');
    }
    return business;
  }
}
