import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CheckIn } from '../checkins/checkin.entity';
import { Mission } from '../missions/mission.entity';
import { User, UserType } from '../users/user.entity';
import { CompleteMissionDto } from './dto/complete-mission.dto';
import { Transaction } from './transaction.entity';
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
    @InjectRepository(Mission)
    private readonly missions: Repository<Mission>,
    @InjectRepository(CheckIn)
    private readonly checkIns: Repository<CheckIn>,
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

  async completeMission(
    playerId: string,
    missionId: string,
    dto: CompleteMissionDto,
  ): Promise<WalletSummary> {
    await this.getPlayerOrThrow(playerId);

    const mission = await this.missions.findOne({ where: { id: missionId } });
    if (!mission) {
      throw new NotFoundException('Mission introuvable.');
    }

    if (mission.businessId) {
      const checkin = await this.checkIns.findOne({
        where: { playerId, businessId: mission.businessId },
      });
      if (!checkin) {
        throw new BadRequestException(
          'Tu dois être check-iné sur ce lieu pour valider cette mission.',
        );
      }
    }

    const alreadyDone = await this.transactions.findOne({
      where: { playerId, reference: missionId, type: 'gagne' },
    });
    if (alreadyDone) {
      throw new BadRequestException('Tu as déjà accompli cette mission.');
    }

    const wallet = await this.getOrCreateWallet(playerId);
    const montant = mission.recompenseBase;
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

    const { choix } = dto;
    if (choix !== 'accumulation') {
      wallet.solde -= montant;
      created.push(
        await this.transactions.save(
          this.transactions.create({
            playerId,
            type: choix,
            montant: -montant,
            reference: missionId,
          }),
        ),
      );
    }

    wallet.updatedAt = new Date();
    await this.wallets.save(wallet);

    return { solde: wallet.solde, transactions: created };
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
