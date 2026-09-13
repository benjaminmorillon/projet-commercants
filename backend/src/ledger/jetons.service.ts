import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Business } from '../businesses/business.entity';
import { CheckIn } from '../checkins/checkin.entity';
import { LedgerService, MouvementLisible } from './ledger.service';
import { arrondir, verifierMontant } from './ledger-rules';
import {
  PRESTATAIRE_PAIEMENT,
  PrestatairePaiement,
} from './prestataire-paiement';
import { Rechargement } from './rechargement.entity';
import { ReglagesService } from '../admin/reglages.service';

export interface SoldeDetaille {
  solde: number;
  mouvements: MouvementLisible[];
}

@Injectable()
export class JetonsService {
  constructor(
    private readonly ledger: LedgerService,
    @InjectRepository(Rechargement)
    private readonly rechargements: Repository<Rechargement>,
    @InjectRepository(Business)
    private readonly businesses: Repository<Business>,
    @InjectRepository(CheckIn)
    private readonly checkIns: Repository<CheckIn>,
    @Inject(PRESTATAIRE_PAIEMENT)
    private readonly prestataire: PrestatairePaiement,
    private readonly reglages: ReglagesService,
  ) {}

  // --- Côté commerçant -----------------------------------------------------

  async soldeCommercant(userId: string): Promise<SoldeDetaille> {
    const compte = await this.ledger.compteCommercant(userId);
    return { solde: compte.solde, mouvements: await this.ledger.historique(compte) };
  }

  /**
   * Recharge le compte d'un commerçant. Le paiement passe par le prestataire ;
   * les jetons ne sont crédités que si celui-ci confirme.
   */
  async recharger(userId: string, montantBrut: number): Promise<Rechargement> {
    const montant = arrondir(montantBrut);
    const verification = verifierMontant(montant, this.reglages.nombre('jetons.montantMinimum'));
    if (!verification.valide) {
      throw new BadRequestException(verification.raison);
    }

    const rechargement = await this.rechargements.save(
      this.rechargements.create({
        userId,
        montant,
        statut: 'en_attente',
        prestataire: this.prestataire.nom,
      }),
    );

    const resultat = await this.prestataire.encaisser(montant, rechargement.id);

    rechargement.referencePrestataire = resultat.reference;
    rechargement.statut = resultat.statut;
    rechargement.regleLe = new Date();
    await this.rechargements.save(rechargement);

    if (resultat.statut === 'echoue') {
      throw new BadRequestException(resultat.message ?? 'Le paiement a été refusé.');
    }

    // Le paiement est encaissé : les jetons entrent dans le circuit.
    const compte = await this.ledger.compteCommercant(userId);
    await this.ledger.emettre(compte, montant, {
      motif: 'rechargement',
      reference: rechargement.id,
      detail: `Via ${this.prestataire.nom}`,
    });

    return rechargement;
  }

  listerRechargements(userId: string): Promise<Rechargement[]> {
    return this.rechargements.find({ where: { userId }, order: { createdAt: 'DESC' } });
  }

  infosPrestataire() {
    return { nom: this.prestataire.nom, simule: this.prestataire.simule };
  }

  // --- Côté joueur ---------------------------------------------------------

  async soldeJoueur(playerId: string): Promise<SoldeDetaille> {
    const compte = await this.ledger.compteJoueur(playerId);
    return { solde: compte.solde, mouvements: await this.ledger.historique(compte) };
  }

  /**
   * Le joueur règle une consommation chez un partenaire avec ses jetons.
   * Il doit y être physiquement passé (check-in) : c'est ce qui empêche de
   * transférer ses jetons à n'importe quel commerçant depuis son canapé.
   */
  async payerChezPartenaire(
    playerId: string,
    businessId: string,
    montant: number,
  ): Promise<{ solde: number; lieu: string }> {
    const business = await this.businesses.findOne({ where: { id: businessId } });
    if (!business) {
      throw new NotFoundException('Établissement introuvable.');
    }

    const dejaVenu = await this.checkIns.findOne({ where: { playerId, businessId } });
    if (!dejaVenu) {
      throw new BadRequestException(
        'Fais d’abord un check-in sur place pour pouvoir payer chez ce partenaire.',
      );
    }

    const [compteJoueur, compteCommercant] = await Promise.all([
      this.ledger.compteJoueur(playerId),
      this.ledger.compteCommercant(business.userId),
    ]);

    await this.ledger.deplacer(compteJoueur, compteCommercant, montant, {
      motif: 'depense_chez_partenaire',
      reference: businessId,
      detail: business.nom,
    });

    const apres = await this.ledger.compteJoueur(playerId);
    return { solde: apres.solde, lieu: business.nom };
  }

  /** Le joueur donne une partie de ses jetons à une cause. */
  async donner(playerId: string, montant: number): Promise<{ solde: number }> {
    const [compteJoueur, compteCause] = await Promise.all([
      this.ledger.compteJoueur(playerId),
      this.ledger.compteCause(),
    ]);

    await this.ledger.deplacer(compteJoueur, compteCause, montant, {
      motif: 'don_a_une_cause',
      detail: 'Don',
    });

    const apres = await this.ledger.compteJoueur(playerId);
    return { solde: apres.solde };
  }
}
