import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { PlayersService } from './players.service';
import { CreatePlayerDto } from './dto/create-player.dto';
import { SubmitQuestionnaireDto } from './dto/submit-questionnaire.dto';

@Controller('players')
export class PlayersController {
  constructor(private readonly players: PlayersService) {}

  @Post()
  async create(@Body() dto: CreatePlayerDto) {
    const user = await this.players.createPlayer(dto);
    return { id: user.id, pseudo: user.pseudo, email: user.email };
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
