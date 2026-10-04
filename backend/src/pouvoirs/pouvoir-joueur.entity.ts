import { Column, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

/**
 * Un pouvoir dans l'inventaire d'un joueur.
 *
 * Une LIGNE par exemplaire : deux « Double mise » obtenus la même semaine
 * sont deux lignes, qui périment à deux dates différentes et se consomment
 * l'une après l'autre. Compter des exemplaires dans une seule ligne aurait
 * obligé à choisir une seule date de péremption pour tous — donc à mentir
 * sur l'un des deux.
 *
 * Rien n'est jamais supprimé, pas même un pouvoir périmé : l'inventaire doit
 * pouvoir montrer « tu avais ça, tu ne t'en es pas servi ». C'est ce qui
 * apprend qu'un pouvoir se dépense.
 */
@Entity()
@Index(['playerId'])
export class PouvoirJoueur {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  playerId: string;

  /** L'identifiant du catalogue — voir `pouvoirs.ts`. */
  @Column()
  pouvoirId: string;

  /** D'où il vient, pour le dire au joueur : « niveau 4 », « palier 2 ». */
  @Column()
  origine: string;

  @Column({ type: 'datetime' })
  obtenuLe: Date;

  @Column({ type: 'datetime' })
  perimeLe: Date;

  @Column({ type: 'datetime', nullable: true })
  utiliseLe: Date | null;

  /** Jusqu'à quand l'effet court, une fois déclenché. */
  @Column({ type: 'datetime', nullable: true })
  effetJusquA: Date | null;

  /** Ce qui a été désigné : une clé de quartier, un identifiant de joueur. */
  @Column({ type: 'varchar', nullable: true })
  cible: string | null;
}
