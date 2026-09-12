import { IsIn, IsOptional, Length } from 'class-validator';

export class ProposerDuoDto {
  @IsIn(['affinite_naturelle', 'defi_complementarite'])
  typeMatching: 'affinite_naturelle' | 'defi_complementarite';

  // Optionnel : quand le joueur lance le duo depuis une mission repérée sur la
  // carte, on garde CETTE mission et CE lieu comme rendez-vous.
  @IsOptional()
  @Length(1, 64)
  missionId?: string;

  @IsOptional()
  @Length(1, 64)
  businessId?: string;
}

export class TerminerDuoDto {
  @IsOptional()
  @Length(1, 500)
  feedback?: string;
}
