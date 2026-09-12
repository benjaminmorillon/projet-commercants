import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { CampaignsService } from './campaigns.service';
import { RespondInvitationDto } from './dto/respond-invitation.dto';

@Controller()
export class InvitationsController {
  constructor(private readonly campaigns: CampaignsService) {}

  @Get('players/:id/invitations')
  list(@Param('id') id: string) {
    return this.campaigns.listForPlayer(id);
  }

  @Post('invitations/:targetId/accepter')
  accepter(@Param('targetId') targetId: string, @Body() dto: RespondInvitationDto) {
    return this.campaigns.respond(targetId, 'acceptee', dto);
  }

  @Post('invitations/:targetId/refuser')
  refuser(@Param('targetId') targetId: string, @Body() dto: RespondInvitationDto) {
    return this.campaigns.respond(targetId, 'refusee', dto);
  }
}
