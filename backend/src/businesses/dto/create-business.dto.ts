import {
  IsInt,
  IsLatitude,
  IsLongitude,
  IsOptional,
  IsPositive,
  Length,
} from 'class-validator';

export class CreateBusinessDto {
  @Length(2, 100)
  nom: string;

  @Length(5, 200)
  adresse: string;

  @IsLatitude()
  latitude: number;

  @IsLongitude()
  longitude: number;

  @Length(2, 40)
  typeEtablissement: string;

  @IsOptional()
  @IsInt()
  @IsPositive()
  capaciteEstimee?: number;
}
