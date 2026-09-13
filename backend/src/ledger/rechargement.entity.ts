import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

export type StatutRechargement = 'en_attente' | 'reussi' | 'echoue';

/**
 * Un commerçant qui convertit un paiement en jetons. Le prestataire de
 * paiement est simulé pour l'instant : aucune somme ne circule réellement.
 */
@Entity()
export class Rechargement {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  userId: string;

  @Column({ type: 'float' })
  montant: number;

  @Column({ type: 'varchar', default: 'en_attente' })
  statut: StatutRechargement;

  // Le nom du prestataire ayant traité le paiement, et sa référence à lui.
  @Column({ type: 'varchar' })
  prestataire: string;

  @Column({ type: 'varchar', nullable: true })
  referencePrestataire: string | null;

  @Column({ type: 'datetime', nullable: true })
  regleLe: Date | null;

  @Column({ type: 'datetime', default: () => 'CURRENT_TIMESTAMP' })
  createdAt: Date;
}
