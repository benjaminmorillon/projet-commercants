import { IsNumber, IsUUID, Min } from 'class-validator';

export class PayerPartenaireDto {
  @IsUUID()
  businessId: string;

  @IsNumber()
  @Min(0.01)
  montant: number;
}
