import {
  IsIn,
  IsNumber,
  IsOptional,
  IsPositive,
  IsUUID,
  Length,
  Matches,
  MaxLength,
} from 'class-validator';
import { TargetingCriteriaDto } from './targeting-criteria.dto';

export class CreateCampaignDto extends TargetingCriteriaDto {
  @IsIn(['invitation', 'publicite'])
  type: 'invitation' | 'publicite';

  // Obligatoire pour une invitation : l'événement auquel on invite.
  @IsOptional()
  @IsUUID()
  eventId?: string;

  @Length(5, 1000)
  message: string;

  @IsOptional()
  @Matches(/^data:image\/(png|jpe?g|webp|gif);base64,/, {
    message: "L'image doit être une image encodée (png, jpeg, webp ou gif).",
  })
  @MaxLength(700000, { message: 'Image trop lourde (max ~500 Ko).' })
  imageDataUrl?: string;

  @IsNumber()
  @IsPositive()
  montantParCible: number;
}
