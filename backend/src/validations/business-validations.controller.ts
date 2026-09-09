import { Controller, Get, Param } from '@nestjs/common';
import { ValidationsService } from './validations.service';

@Controller('businesses')
export class BusinessValidationsController {
  constructor(private readonly validations: ValidationsService) {}

  @Get(':id/validations')
  listToValidate(@Param('id') id: string) {
    return this.validations.listToValidateForBusiness(id);
  }
}
