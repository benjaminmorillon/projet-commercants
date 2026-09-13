import { Column, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';
import { MotifMouvement } from './ledger-rules';

/**
 * Un déplacement de jetons, écrit une fois pour toutes et jamais modifié :
 * c'est le journal qui fait foi. Les soldes n'en sont qu'un résumé.
 */
@Entity()
@Index(['compteSourceId'])
@Index(['compteDestinationId'])
export class MouvementJeton {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  // Nul = émission : la plateforme crée des jetons (récompense de mission).
  @Column({ type: 'varchar', nullable: true })
  compteSourceId: string | null;

  // Nul = destruction. Aujourd'hui inutilisé : rien ne sort du circuit.
  @Column({ type: 'varchar', nullable: true })
  compteDestinationId: string | null;

  // Toujours positif : c'est le sens source → destination qui porte le signe.
  @Column({ type: 'float' })
  montant: number;

  @Column({ type: 'varchar' })
  motif: MotifMouvement;

  // Ce qui a provoqué le mouvement : une mission, une campagne, un duo...
  @Column({ type: 'varchar', nullable: true })
  reference: string | null;

  // Précision lisible ajoutée au libellé standard du motif.
  @Column({ type: 'varchar', nullable: true })
  detail: string | null;

  @Column({ type: 'datetime', default: () => 'CURRENT_TIMESTAMP' })
  createdAt: Date;
}
