import { Column, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

/**
 * Une zone du quadrillage qu'un joueur a levée en allant sur place.
 * Tant qu'une zone n'est pas ici, elle reste voilée sur sa carte.
 */
@Entity()
@Index(['playerId', 'cleZone'], { unique: true })
export class ZoneDecouverte {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  playerId: string;

  @Column()
  cleZone: string;

  // Le lieu par lequel le joueur est entré dans la zone.
  @Column({ type: 'varchar', nullable: true })
  businessId: string | null;

  // XP de découverte réellement versée (renforcée si le lieu est sous-fréquenté).
  @Column({ type: 'int', default: 0 })
  xpGagnee: number;

  @Column({ type: 'datetime', default: () => 'CURRENT_TIMESTAMP' })
  decouverteLe: Date;
}
