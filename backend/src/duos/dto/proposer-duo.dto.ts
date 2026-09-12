import { IsIn, IsOptional, Length } from 'class-validator';

export class ProposerDuoDto {
  @IsIn(['affinite_naturelle', 'defi_complementarite'])
  typeMatching: 'affinite_naturelle' | 'defi_complementarite';
}

export class TerminerDuoDto {
  @IsOptional()
  @Length(1, 500)
  feedback?: string;
}
