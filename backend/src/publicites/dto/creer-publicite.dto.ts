import {
  IsDateString,
  IsInt,
  IsNumber,
  IsOptional,
  IsPositive,
  Length,
  Max,
  Min,
} from 'class-validator';

export class CreerPubliciteDto {
  @Length(3, 100, { message: 'Le titre doit faire entre 3 et 100 caractères.' })
  titre: string;

  @Length(10, 1000, { message: 'La description doit faire entre 10 et 1000 caractères.' })
  description: string;

  /**
   * Ce que le commerçant vend, en mots. C'est par là que les joueurs le
   * trouveront : le champ mérite qu'on insiste dessus dans l'interface.
   */
  @Length(3, 300, {
    message: 'Écris au moins quelques mots-clés : c’est par eux qu’on te trouvera.',
  })
  motsCles: string;

  @Length(3, 200, { message: "L'offre doit faire entre 3 et 200 caractères." })
  offre: string;

  @IsOptional()
  @IsInt({ message: 'La réduction en pourcentage doit être un nombre entier.' })
  @Min(1, { message: 'Une réduction en pourcentage part de 1 %.' })
  @Max(100, { message: 'Une réduction ne peut pas dépasser 100 %.' })
  reductionPourcent?: number;

  @IsOptional()
  @IsNumber({}, { message: 'La réduction en jetons doit être un nombre.' })
  @IsPositive({ message: 'La réduction en jetons doit être supérieure à zéro.' })
  reductionJetons?: number;

  @IsDateString({}, { message: 'La date de début n’est pas valide.' })
  debutLe: string;

  @IsDateString({}, { message: 'La date de fin n’est pas valide.' })
  finLe: string;

  @IsNumber({}, { message: 'Le budget doit être un nombre.' })
  @IsPositive({ message: 'Le budget doit être supérieur à zéro.' })
  budgetJetons: number;

  @IsOptional()
  @IsNumber({}, { message: "Le coût d'une ouverture doit être un nombre." })
  @IsPositive({ message: "Le coût d'une ouverture doit être supérieur à zéro." })
  coutParOuverture?: number;
}
