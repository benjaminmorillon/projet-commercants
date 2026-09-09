import { IsEmail, Length } from 'class-validator';

export class CreatePlayerDto {
  @IsEmail()
  email: string;

  @Length(2, 40)
  pseudo: string;
}
