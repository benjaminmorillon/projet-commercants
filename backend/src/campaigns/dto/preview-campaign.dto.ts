import { IsNumber, IsOptional, Min } from 'class-validator';
import { TargetingCriteriaDto } from './targeting-criteria.dto';

export class PreviewCampaignDto extends TargetingCriteriaDto {
  @IsOptional()
  @IsNumber()
  @Min(0)
  montantParCible?: number;
}
