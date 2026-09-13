import { Column, Entity, OneToOne, PrimaryGeneratedColumn } from 'typeorm';
import { PlayerProfile } from '../players/player-profile.entity';

export enum UserType {
  PARTICULIER = 'particulier',
  COMMERCANT = 'commercant',
}

@Entity()
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  email: string;

  @Column({ length: 40 })
  pseudo: string;

  @Column({ type: 'varchar', default: UserType.PARTICULIER })
  type: UserType;

  // Empreinte scrypt du mot de passe — jamais le mot de passe lui-même.
  // Nullable pour les comptes créés avant l'arrivée des mots de passe.
  @Column({ type: 'varchar', nullable: true, select: false })
  motDePasseHache: string | null;

  @OneToOne(() => PlayerProfile, (profile) => profile.user)
  profile: PlayerProfile;

  @Column({ type: 'datetime', default: () => 'CURRENT_TIMESTAMP' })
  createdAt: Date;
}
