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

  // Droit d'administration du site. Volontairement séparé de `type` : un
  // administrateur reste un compte normal par ailleurs, et on ne veut pas
  // qu'une troisième valeur de `type` se glisse partout où le code
  // distingue « particulier » de « commerçant ».
  // Ne s'accorde jamais depuis une page web : uniquement en ligne de
  // commande (npm run admin) ou par un administrateur déjà en place.
  @Column({ type: 'boolean', default: false })
  administrateur: boolean;

  // Empreinte scrypt du mot de passe — jamais le mot de passe lui-même.
  // Nullable pour les comptes créés avant l'arrivée des mots de passe.
  @Column({ type: 'varchar', nullable: true, select: false })
  motDePasseHache: string | null;

  @OneToOne(() => PlayerProfile, (profile) => profile.user)
  profile: PlayerProfile;

  @Column({ type: 'datetime', default: () => 'CURRENT_TIMESTAMP' })
  createdAt: Date;
}
