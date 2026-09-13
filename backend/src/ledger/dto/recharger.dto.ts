import { IsNumber, Max, Min } from 'class-validator';

export class RechargerDto {
  // Un plafond volontairement bas tant que le paiement est simulé : on ne
  // veut pas qu'un clic de démonstration crée des milliers de jetons.
  @IsNumber()
  @Min(1)
  @Max(1000)
  montant: number;
}
