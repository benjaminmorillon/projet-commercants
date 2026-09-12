import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity()
export class PlayerProgression {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  playerId: string;

  @Column({ type: 'int', default: 0 })
  xpTotal: number;

  @Column({ type: 'int', default: 1 })
  niveauActuel: number;

  @Column({ type: 'datetime', default: () => 'CURRENT_TIMESTAMP' })
  updatedAt: Date;
}
