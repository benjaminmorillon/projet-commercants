import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { LedgerService, MouvementLisible } from '../ledger/ledger.service';
import { MotifMouvement } from '../ledger/ledger-rules';
import { User, UserType } from '../users/user.entity';

export interface WalletSummary {
  solde: number;
  mouvements: MouvementLisible[];
}

/**
 * Le portefeuille d'un joueur n'est plus une table à part : c'est la lecture
 * de son compte dans le registre de jetons. Un seul endroit fait foi, donc
 * plus de risque que deux totaux divergent.
 */
@Injectable()
export class WalletService {
  constructor(
    @InjectRepository(User)
    private readonly users: Repository<User>,
    private readonly ledger: LedgerService,
  ) {}

  private async getPlayerOrThrow(playerId: string): Promise<User> {
    const player = await this.users.findOne({ where: { id: playerId } });
    if (!player || player.type !== UserType.PARTICULIER) {
      throw new NotFoundException('Joueur introuvable.');
    }
    return player;
  }

  /**
   * Récompense d'une mission validée. Les jetons sont émis par la plateforme :
   * c'est elle qui finance le jeu (et qui ajuste le montant via le
   * multiplicateur de rééquilibrage, section 4 des specs).
   *
   * Le choix du joueur ne change plus le montant crédité : « dépenser » veut
   * dire qu'il gardera ses jetons pour un partenaire, « donner » les transfère
   * aussitôt à une cause, « accumuler » les laisse dormir.
   */
  async applyMissionReward(
    playerId: string,
    missionId: string,
    montant: number,
    choix: 'depense' | 'don' | 'accumulation',
    libelle: string,
  ): Promise<void> {
    const compte = await this.ledger.compteJoueur(playerId);
    await this.ledger.emettre(compte, montant, {
      motif: 'recompense_mission',
      reference: missionId,
      detail: libelle,
    });

    if (choix === 'don') {
      const cause = await this.ledger.compteCause();
      await this.ledger.deplacer(compte, cause, montant, {
        motif: 'don_a_une_cause',
        reference: missionId,
        detail: libelle,
      });
    }
  }

  /** Crédit émis par la plateforme (récompense de duo, par exemple). */
  async applyCredit(
    playerId: string,
    montant: number,
    reference: string,
    libelle: string,
    motif: MotifMouvement = 'recompense_duo',
  ): Promise<void> {
    const compte = await this.ledger.compteJoueur(playerId);
    await this.ledger.emettre(compte, montant, { motif, reference, detail: libelle });
  }

  async getWallet(playerId: string): Promise<WalletSummary> {
    await this.getPlayerOrThrow(playerId);
    const compte = await this.ledger.compteJoueur(playerId);
    return { solde: compte.solde, mouvements: await this.ledger.historique(compte) };
  }
}
