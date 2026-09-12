import { IsOptional, Length } from 'class-validator';

export class RespondInvitationDto {
  // Réaction courte choisie par la cible (ex : "Ça m'intéresse", "Trop loin").
  @IsOptional()
  @Length(2, 60)
  reaction?: string;

  @IsOptional()
  @Length(1, 500)
  commentaire?: string;
}
