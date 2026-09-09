import { IsIn } from 'class-validator';

// Ce que le joueur choisit de faire du crédit gagné (section 2.5 des specs).
const CHOIX = ['depense', 'don', 'accumulation'] as const;
export type ChoixCredit = (typeof CHOIX)[number];

export class CompleteMissionDto {
  @IsIn(CHOIX)
  choix: ChoixCredit;
}
