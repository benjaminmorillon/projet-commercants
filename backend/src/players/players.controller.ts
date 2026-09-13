import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { PlayersService } from './players.service';
import { SubmitQuestionnaireDto } from './dto/submit-questionnaire.dto';

@Controller('players')
export class PlayersController {
  constructor(private readonly players: PlayersService) {}

  // La création de compte passe désormais par POST /auth/inscription :
  // impossible de créer un compte sans mot de passe.

  @Get('search')
  search(@Query('pseudo') pseudo: string) {
    return this.players.searchByPseudo(pseudo);
  }

  @Post(':id/questionnaire')
  submitQuestionnaire(
    @Param('id') id: string,
    @Body() dto: SubmitQuestionnaireDto,
  ) {
    return this.players.submitQuestionnaire(id, dto);
  }

  @Get(':id/profile')
  getProfile(@Param('id') id: string) {
    return this.players.getProfile(id);
  }
}
