import { IsLatitude, IsLongitude, IsUUID } from 'class-validator';

export class CreateCheckinDto {
  @IsUUID()
  playerId: string;

  @IsLatitude()
  latitude: number;

  @IsLongitude()
  longitude: number;
}
