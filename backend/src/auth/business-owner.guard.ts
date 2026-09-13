import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Business } from '../businesses/business.entity';

/**
 * À poser sur les routes en `/businesses/:id/...` qui ne regardent que le
 * commerçant : l'établissement visé doit appartenir au compte connecté.
 */
@Injectable()
export class BusinessOwnerGuard implements CanActivate {
  constructor(
    @InjectRepository(Business)
    private readonly businesses: Repository<Business>,
  ) {}

  async canActivate(contexte: ExecutionContext): Promise<boolean> {
    const requete = contexte.switchToHttp().getRequest();
    const businessId: string | undefined =
      requete.params?.businessId ?? requete.params?.id;

    if (!businessId) {
      return true;
    }

    const business = await this.businesses.findOne({ where: { id: businessId } });
    if (!business) {
      throw new NotFoundException('Établissement introuvable.');
    }
    if (business.userId !== requete.utilisateur?.id) {
      throw new ForbiddenException("Cet établissement n'est pas le tien.");
    }

    return true;
  }
}
