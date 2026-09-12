import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

// gagne : crédit obtenu en accomplissant une mission (montant positif)
// depense / don : le joueur choisit de dépenser/donner le crédit gagné (montant négatif)
// L'accumulation n'a pas de type dédié : c'est simplement l'absence de transaction
// "depense"/"don" qui suit un gain — le crédit reste dans le solde.
export type TransactionType = 'gagne' | 'depense' | 'don';

@Entity()
export class Transaction {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  playerId: string;

  @Column()
  type: TransactionType;

  // Signé : positif pour un gain, négatif pour une dépense/un don.
  @Column({ type: 'float' })
  montant: number;

  // Identifiant de ce qui est à l'origine du mouvement (mission, campagne...).
  @Column()
  reference: string;

  // Libellé lisible affiché dans l'historique du joueur.
  @Column({ type: 'varchar', nullable: true })
  libelle: string | null;

  @Column({ type: 'datetime', default: () => 'CURRENT_TIMESTAMP' })
  createdAt: Date;
}
