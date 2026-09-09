import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User, UserType } from '../users/user.entity';
import { Transaction, TransactionType } from './transaction.entity';
import { Wallet } from './wallet.entity';

export interface WalletSummary {
  solde: number;
  transactions: Transaction[];
}

@Injectable()
export class WalletService {
  constructor(
    @InjectRepository(User)
    private readonly users: Repository<User>,
    @InjectRepository(Wallet)
    private readonly wallets: Repository<Wallet>,
    @InjectRepository(Transaction)
    private readonly transactions: Repository<Transaction>,
  ) {}

  private async getPlayerOrThrow(playerId: string): Promise<User> {
    const player = await this.users.findOne({ where: { id: playerId } });
    if (!player || player.type !== UserType.PARTICULIER) {
      throw new NotFoundException('Joueur introuvable.');
    }
    return player;
  }

  private async getOrCreateWallet(playerId: string): Promise<Wallet> {
    const existing = await this.wallets.findOne({ where: { playerId } });
    if (existing) {
      return existing;
    }
    return this.wallets.save(this.wallets.create({ playerId, solde: 0 }));
  }

  // Appelé par le module "validations" une fois qu'un tiers a validé la
  // mission — jamais directement par le joueur qui l'a accomplie.
  async applyMissionReward(
    playerId: string,
    missionId: string,
    montant: number,
    choix: 'depense' | 'don' | 'accumulation',
  ): Promise<Transaction[]> {
    const wallet = await this.getOrCreateWallet(playerId);
    const created: Transaction[] = [];

    wallet.solde += montant;
    created.push(
      await this.transactions.save(
        this.transactions.create({
          playerId,
          type: 'gagne',
          montant,
          reference: missionId,
        }),
      ),
    );

    if (choix !== 'accumulation') {
      const type: TransactionType = choix;
      wallet.solde -= montant;
      created.push(
        await this.transactions.save(
          this.transactions.create({
            playerId,
            type,
            montant: -montant,
            reference: missionId,
          }),
        ),
      );
    }

    wallet.updatedAt = new Date();
    await this.wallets.save(wallet);

    return created;
  }

  async getWallet(playerId: string): Promise<WalletSummary> {
    await this.getPlayerOrThrow(playerId);
    const wallet = await this.getOrCreateWallet(playerId);
    const transactions = await this.transactions.find({
      where: { playerId },
      order: { createdAt: 'DESC' },
    });
    return { solde: wallet.solde, transactions };
  }
}
