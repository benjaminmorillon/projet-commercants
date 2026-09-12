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

  // Titre que le joueur a choisi d'afficher sur son profil (section 2.9).
  @Column({ type: 'varchar', nullable: true })
  titreEquipe: string | null;

  @Column({ type: 'datetime', default: () => 'CURRENT_TIMESTAMP' })
  updatedAt: Date;
}
