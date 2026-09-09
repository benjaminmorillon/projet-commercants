import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { CompleteMissionDto } from './dto/complete-mission.dto';
import { WalletService } from './wallet.service';

@Controller('players')
export class WalletController {
  constructor(private readonly wallet: WalletService) {}

  @Post(':id/missions/:missionId/complete')
  completeMission(
    @Param('id') id: string,
    @Param('missionId') missionId: string,
    @Body() dto: CompleteMissionDto,
  ) {
    return this.wallet.completeMission(id, missionId, dto);
  }

  @Get(':id/wallet')
  getWallet(@Param('id') id: string) {
    return this.wallet.getWallet(id);
  }
}
