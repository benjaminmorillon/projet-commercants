import { Module } from '@nestjs/common';
import { OwnershipModule } from '../auth/ownership.module';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BalancingModule } from '../balancing/balancing.module';
import { Business } from '../businesses/business.entity';
import { Event } from '../events/event.entity';
import { PlayerEventsModule } from '../player-events/player-events.module';
import { PlayerProfile } from '../players/player-profile.entity';
import { User } from '../users/user.entity';
import { MissionValidation } from '../validations/mission-validation.entity';
import { WalletModule } from '../wallet/wallet.module';
import { BusinessCampaignsController } from './business-campaigns.controller';
import { CampaignTarget } from './campaign-target.entity';
import { Campaign } from './campaign.entity';
import { CampaignsService } from './campaigns.service';
import { InvitationsController } from './invitations.controller';

@Module({
  imports: [
    OwnershipModule,
    TypeOrmModule.forFeature([
      Campaign,
      CampaignTarget,
      Business,
      Event,
      PlayerProfile,
      User,
      MissionValidation,
    ]),
    WalletModule,
    BalancingModule,
    PlayerEventsModule,
  ],
  controllers: [BusinessCampaignsController, InvitationsController],
  providers: [CampaignsService],
})
export class CampaignsModule {}
