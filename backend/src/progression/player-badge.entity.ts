import { Column, Entity, PrimaryGeneratedColumn, Unique } from 'typeorm';

// Un badge obtenu par un joueur. Un même badge ne peut l'être qu'une fois.
@Entity()
@Unique(['playerId', 'badgeId'])
export class PlayerBadge {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  playerId: string;

  @Column()
  badgeId: string;

  @Column({ type: 'datetime', default: () => 'CURRENT_TIMESTAMP' })
  obtenuLe: Date;
}
