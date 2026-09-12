import { IsInt, IsNumber, IsOptional, Max, Min } from 'class-validator';

// Les critères de ciblage, volontairement simples : quatre curseurs (les
// "barres de profil") et un nombre minimum de missions réussies.
export class TargetingCriteriaDto {
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  minExplorateur?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  minAccomplisseur?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  minCompetiteur?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  minSocialisateur?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  minMissionsReussies?: number;
}
