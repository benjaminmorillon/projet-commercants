import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { Public } from '../auth/public.decorator';
import { CheckinsService } from './checkins.service';
import { CreateReviewDto } from './dto/create-review.dto';

@Controller('businesses')
export class CheckinsController {
  constructor(private readonly checkins: CheckinsService) {}

  @Post(':id/reviews')
  createReview(@Param('id') id: string, @Body() dto: CreateReviewDto) {
    return this.checkins.createReview(id, dto);
  }

  @Public()
  @Get(':id/reviews')
  listReviews(@Param('id') id: string) {
    return this.checkins.findReviewsForBusiness(id);
  }
}
