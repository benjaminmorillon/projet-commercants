import { Column, Entity, PrimaryColumn } from 'typeorm';

/**
 * Un réglage modifié depuis le back-office.
 *
 * Seuls les réglages qu'on a effectivement changés sont stockés. Tout ce qui
 * n'est pas dans cette table garde la valeur par défaut du catalogue — donc
 * une base vide se comporte exactement comme avant l'arrivée du back-office,
 * et « remettre par défaut » revient à supprimer la ligne.
 *
 * La valeur est toujours du texte : c'est `lireValeur` du catalogue qui sait
 * en refaire un nombre ou un booléen, avec les mêmes contrôles qu'à la saisie.
 */
@Entity()
export class Reglage {
  @PrimaryColumn()
  cle: string;

  @Column({ type: 'text' })
  valeur: string;

  @Column({ type: 'varchar', nullable: true })
  modifiePar: string | null;

  @Column({ type: 'datetime', default: () => 'CURRENT_TIMESTAMP' })
  modifieLe: Date;
}
