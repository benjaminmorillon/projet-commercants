import { Column, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

/**
 * Une connexion ouverte. Le navigateur ne garde qu'un jeton tiré au hasard ;
 * c'est le serveur qui sait à qui il correspond. Supprimer la ligne suffit à
 * déconnecter immédiatement, ce qu'un jeton auto-porté ne permet pas.
 */
@Entity()
export class Session {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index({ unique: true })
  @Column()
  jeton: string;

  @Column()
  userId: string;

  @Column({ type: 'datetime' })
  expireLe: Date;

  @Column({ type: 'datetime', default: () => 'CURRENT_TIMESTAMP' })
  createdAt: Date;
}
