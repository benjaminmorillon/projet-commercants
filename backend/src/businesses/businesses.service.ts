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

  /**
   * L'établissement est rattaché au compte connecté : c'est lui, et lui seul,
   * qui pourra ensuite poster des missions ou lancer une campagne.
   */
  async createBusiness(userId: string, dto: CreateBusinessDto): Promise<Business> {
    const user = await this.users.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('Compte introuvable.');
    }
    if (user.type !== UserType.COMMERCANT) {
      throw new ConflictException(
        "Ce compte est un compte joueur : crée un compte commerçant pour enregistrer un établissement.",
      );
    }

    const deja = await this.businesses.findOne({ where: { userId } });
    if (deja) {
      throw new ConflictException('Ce compte a déjà un établissement enregistré.');
    }

    return this.businesses.save(
      this.businesses.create({
        userId,
        nom: dto.nom,
        adresse: dto.adresse,
        latitude: dto.latitude,
        longitude: dto.longitude,
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

  findAll(): Promise<Business[]> {
    return this.businesses.find({ order: { createdAt: 'DESC' } });
  }
}
