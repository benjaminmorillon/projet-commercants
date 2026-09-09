import { Controller, Param, Post } from '@nestjs/common';
import { ValidationsService } from './validations.service';

@Controller('validations')
export class ValidationsController {
  constructor(private readonly validations: ValidationsService) {}

  @Post(':id/valider')
  valider(@Param('id') id: string) {
    return this.validations.resolve(id, 'validee');
  }

  @Post(':id/refuser')
  refuser(@Param('id') id: string) {
    return this.validations.resolve(id, 'refusee');
  }
}
