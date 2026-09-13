import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { OwnershipModule } from '../auth/ownership.module';
import { Business } from '../businesses/business.entity';
import { CheckIn } from '../checkins/checkin.entity';
import { Compte } from './compte.entity';
import { JetonsService } from './jetons.service';
import { BusinessJetonsController, JetonsController } from './ledger.controller';
import { LedgerService } from './ledger.service';
import { MouvementJeton } from './mouvement.entity';
import { PRESTATAIRE_PAIEMENT } from './prestataire-paiement';
import { PrestataireSimule } from './prestataire-simule';
import { Rechargement } from './rechargement.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Compte, MouvementJeton, Rechargement, Business, CheckIn]),
    OwnershipModule,
  ],
  controllers: [JetonsController, BusinessJetonsController],
  providers: [
    LedgerService,
    JetonsService,
    // Le jour où un vrai prestataire arrive, c'est la seule ligne à changer.
    { provide: PRESTATAIRE_PAIEMENT, useClass: PrestataireSimule },
  ],
  exports: [LedgerService, JetonsService],
})
export class LedgerModule {}
