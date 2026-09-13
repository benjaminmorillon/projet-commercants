import { Column, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';
import { TypeCompte } from './ledger-rules';

/**
 * Un compte de jetons. Chaque joueur et chaque commerçant en a un ; la
 * plateforme et les causes aussi, pour que tout mouvement ait bien deux
 * extrémités identifiables.
 */
@Entity()
@Index(['type', 'proprietaireId'], { unique: true })
export class Compte {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar' })
  type: TypeCompte;

  // Nul pour les comptes techniques (plateforme, cause) : il n'y en a qu'un
  // de chaque, ils n'appartiennent à personne.
  @Column({ type: 'varchar', nullable: true })
  proprietaireId: string | null;

  // Recopie de la somme des mouvements, pour lire un solde sans tout relire.
  // `verifierCoherence()` permet de contrôler que les deux concordent.
  @Column({ type: 'float', default: 0 })
  solde: number;

  @Column({ type: 'datetime', default: () => 'CURRENT_TIMESTAMP' })
  updatedAt: Date;
}
