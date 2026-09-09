import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { RequestValidationDto } from './dto/request-validation.dto';
import { ValidationsService } from './validations.service';

@Controller('players')
export class PlayerValidationsController {
  constructor(private readonly validations: ValidationsService) {}

  @Post(':id/missions/:missionId/request-validation')
  requestValidation(
    @Param('id') id: string,
    @Param('missionId') missionId: string,
    @Body() dto: RequestValidationDto,
  ) {
    return this.validations.requestValidation(id, missionId, dto);
  }

  // Demandes que CE joueur a lui-même envoyées (pour afficher l'état sur ses missions).
  @Get(':id/validations/requested')
  listRequested(@Param('id') id: string) {
    return this.validations.listRequestedByPlayer(id);
  }

  // Demandes qu'un AUTRE joueur attend que CE joueur valide.
  @Get(':id/validations/to-validate')
  listToValidate(@Param('id') id: string) {
    return this.validations.listToValidateForPlayer(id);
  }
}
