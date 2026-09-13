import { Column, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

/**
 * Une demande de réinitialisation de mot de passe.
 *
 * On ne stocke pas le jeton envoyé par email mais son empreinte : quelqu'un
 * qui lirait la base ne pourrait pas s'en servir pour prendre un compte.
 */
@Entity()
export class DemandeReinitialisation {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  userId: string;

  @Index({ unique: true })
  @Column()
  jetonHache: string;

  @Column({ type: 'datetime' })
  expireLe: Date;

  @Column({ type: 'datetime', nullable: true })
  utiliseLe: Date | null;

  @Column({ type: 'datetime', default: () => 'CURRENT_TIMESTAMP' })
  createdAt: Date;
}
