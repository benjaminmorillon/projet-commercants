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
