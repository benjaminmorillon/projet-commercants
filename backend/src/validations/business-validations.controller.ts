import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { BusinessOwnerGuard } from '../auth/business-owner.guard';
import { ValidationsService } from './validations.service';

@UseGuards(BusinessOwnerGuard)
@Controller('businesses')
export class BusinessValidationsController {
  constructor(private readonly validations: ValidationsService) {}

  @Get(':id/validations')
  listToValidate(@Param('id') id: string) {
    return this.validations.listToValidateForBusiness(id);
  }
}
