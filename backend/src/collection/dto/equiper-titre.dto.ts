import { IsOptional, Length } from 'class-validator';

export class EquiperTitreDto {
  // Absent ou vide : le joueur retire son titre.
  @IsOptional()
  @Length(1, 60)
  titreId?: string;
}
