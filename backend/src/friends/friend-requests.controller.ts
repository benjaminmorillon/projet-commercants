import { Controller, Param, Post } from '@nestjs/common';
import { UtilisateurConnecte } from '../auth/auth.service';
import { Utilisateur } from '../auth/utilisateur.decorator';
import { FriendsService } from './friends.service';

@Controller('friends')
export class FriendRequestsController {
  constructor(private readonly friends: FriendsService) {}

  @Post(':id/accept')
  accept(@Param('id') id: string, @Utilisateur() utilisateur: UtilisateurConnecte) {
    return this.friends.resolve(id, 'acceptee', utilisateur.id);
  }

  @Post(':id/refuse')
  refuse(@Param('id') id: string, @Utilisateur() utilisateur: UtilisateurConnecte) {
    return this.friends.resolve(id, 'refusee', utilisateur.id);
  }
}
