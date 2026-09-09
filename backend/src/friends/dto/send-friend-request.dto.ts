import { Length } from 'class-validator';

export class SendFriendRequestDto {
  @Length(2, 40)
  pseudo: string;
}
