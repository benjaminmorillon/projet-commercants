import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity()
export class Wallet {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  playerId: string;

  // Somme de toutes les transactions du joueur — mis à jour à chaque
  // transaction plutôt que recalculé, pour des lectures simples et rapides.
  @Column({ type: 'float', default: 0 })
  solde: number;

  @Column({ type: 'datetime', default: () => 'CURRENT_TIMESTAMP' })
  updatedAt: Date;
}
