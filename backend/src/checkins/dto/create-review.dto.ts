import { IsInt, IsOptional, IsUUID, Length, Max, Min } from 'class-validator';

export class CreateReviewDto {
  @IsUUID()
  playerId: string;

  @IsInt()
  @Min(1)
  @Max(5)
  note: number;

  @IsOptional()
  @Length(0, 1000)
  commentaire?: string;
}
