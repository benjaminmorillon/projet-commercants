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

  @OneToOne(() => PlayerProfile, (profile) => profile.user)
  profile: PlayerProfile;

  @Column({ type: 'datetime', default: () => 'CURRENT_TIMESTAMP' })
  createdAt: Date;
}
