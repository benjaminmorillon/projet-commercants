import { Controller, Param, Post } from '@nestjs/common';
import { FriendsService } from './friends.service';

@Controller('friends')
export class FriendRequestsController {
  constructor(private readonly friends: FriendsService) {}

  @Post(':id/accept')
  accept(@Param('id') id: string) {
    return this.friends.resolve(id, 'acceptee');
  }

  @Post(':id/refuse')
  refuse(@Param('id') id: string) {
    return this.friends.resolve(id, 'refusee');
  }
}
