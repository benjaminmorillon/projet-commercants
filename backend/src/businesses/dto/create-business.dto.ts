import { IsEmail, IsInt, IsOptional, IsPositive, Length } from 'class-validator';

export class CreateBusinessDto {
  @IsEmail()
  email: string;

  @Length(2, 100)
  nom: string;

  @Length(5, 200)
  adresse: string;

  @Length(2, 40)
  typeEtablissement: string;

  @IsOptional()
  @IsInt()
  @IsPositive()
  capaciteEstimee?: number;
}
