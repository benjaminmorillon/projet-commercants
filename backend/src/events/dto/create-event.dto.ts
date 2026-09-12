import { IsDateString, IsOptional, Length, Matches, MaxLength } from 'class-validator';

export class CreateEventDto {
  @Length(2, 100)
  titre: string;

  @Length(5, 1000)
  description: string;

  @IsDateString()
  dateDebut: string;

  @IsOptional()
  @Matches(/^data:image\/(png|jpe?g|webp|gif);base64,/, {
    message: "L'image doit être une image encodée (png, jpeg, webp ou gif).",
  })
  @MaxLength(700000, { message: 'Image trop lourde (max ~500 Ko).' })
  imageDataUrl?: string;
}
