import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { SendFriendRequestDto } from './dto/send-friend-request.dto';
import { FriendsService } from './friends.service';

@Controller('players')
export class PlayerFriendsController {
  constructor(private readonly friends: FriendsService) {}

  @Post(':id/friends/request')
  sendRequest(@Param('id') id: string, @Body() dto: SendFriendRequestDto) {
    return this.friends.sendRequest(id, dto);
  }

  @Get(':id/friends/requests')
  listReceived(@Param('id') id: string) {
    return this.friends.listReceived(id);
  }

  @Get(':id/friends/sent')
  listSent(@Param('id') id: string) {
    return this.friends.listSent(id);
  }

  @Get(':id/friends')
  listFriends(@Param('id') id: string) {
    return this.friends.listFriends(id);
  }

  @Get(':id/friends/:friendId')
  getFriendProfile(@Param('id') id: string, @Param('friendId') friendId: string) {
    return this.friends.getFriendProfile(id, friendId);
  }
}
