import {
  Column,
  Entity,
  JoinColumn,
  OneToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { User } from '../users/user.entity';

@Entity()
export class Business {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @OneToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn()
  user: User;

  @Column()
  userId: string;

  @Column()
  nom: string;

  @Column()
  adresse: string;

  // Coordonnées réelles du lieu, utilisées pour vérifier qu'un joueur qui
  // check-in est physiquement sur place (section 2.4 des specs).
  @Column({ type: 'float' })
  latitude: number;

  @Column({ type: 'float' })
  longitude: number;

  // bar / hôtel / restaurant, etc. (section 1 des specs) — texte libre pour l'instant.
  @Column()
  typeEtablissement: string;

  @Column({ type: 'int', nullable: true })
  capaciteEstimee: number | null;

  @Column({ type: 'float', nullable: true })
  noteGoogle: number | null;

  @Column({ type: 'datetime', default: () => 'CURRENT_TIMESTAMP' })
  createdAt: Date;
}
