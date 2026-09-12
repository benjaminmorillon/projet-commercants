import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { ProposerDuoDto, TerminerDuoDto } from './dto/proposer-duo.dto';
import { DuosService } from './duos.service';

@Controller()
export class DuosController {
  constructor(private readonly duos: DuosService) {}

  @Post('players/:id/duos')
  proposer(@Param('id') id: string, @Body() dto: ProposerDuoDto) {
    return this.duos.proposer(id, dto);
  }

  @Get('players/:id/duos')
  lister(@Param('id') id: string) {
    return this.duos.listerPourJoueur(id);
  }

  @Post('duos/:duoId/accepter/:playerId')
  accepter(@Param('duoId') duoId: string, @Param('playerId') playerId: string) {
    return this.duos.repondre(duoId, playerId, true);
  }

  @Post('duos/:duoId/refuser/:playerId')
  refuser(@Param('duoId') duoId: string, @Param('playerId') playerId: string) {
    return this.duos.repondre(duoId, playerId, false);
  }

  @Post('duos/:duoId/confirmer/:playerId')
  confirmer(
    @Param('duoId') duoId: string,
    @Param('playerId') playerId: string,
    @Body() dto: TerminerDuoDto,
  ) {
    return this.duos.confirmer(duoId, playerId, dto);
  }
}
