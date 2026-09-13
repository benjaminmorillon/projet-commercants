import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { BusinessOwnerGuard } from '../auth/business-owner.guard';
import { CampaignsService } from './campaigns.service';
import { CreateCampaignDto } from './dto/create-campaign.dto';
import { PreviewCampaignDto } from './dto/preview-campaign.dto';

@UseGuards(BusinessOwnerGuard)
@Controller('businesses')
export class BusinessCampaignsController {
  constructor(private readonly campaigns: CampaignsService) {}

  // Combien de joueurs je touche et combien ça me coûte, avant d'envoyer.
  @Post(':id/campaigns/preview')
  preview(@Param('id') id: string, @Body() dto: PreviewCampaignDto) {
    return this.campaigns.preview(id, dto);
  }

  @Post(':id/campaigns')
  create(@Param('id') id: string, @Body() dto: CreateCampaignDto) {
    return this.campaigns.create(id, dto);
  }

  @Get(':id/campaigns')
  list(@Param('id') id: string) {
    return this.campaigns.listForBusiness(id);
  }
}
