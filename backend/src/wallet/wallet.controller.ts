import { Controller, Get, Param } from '@nestjs/common';
import { WalletService } from './wallet.service';

@Controller('players')
export class WalletController {
  constructor(private readonly wallet: WalletService) {}

  @Get(':id/wallet')
  getWallet(@Param('id') id: string) {
    return this.wallet.getWallet(id);
  }
}
