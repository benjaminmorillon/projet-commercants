import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

export type ResultatDuo = 'reussie' | 'abandonnee';

// Ce que le duo a donné, pour que le matching apprenne quelles combinaisons
// fonctionnent réellement (entité PairingOutcome du modèle de données).
@Entity()
export class PairingOutcome {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  groupMissionId: string;

  @Column()
  combinaisonArchetypes: string;

  @Column()
  typeMatching: string;

  @Column()
  resultat: ResultatDuo;

  @Column({ type: 'text', nullable: true })
  feedback: string | null;

  @Column({ type: 'datetime', default: () => 'CURRENT_TIMESTAMP' })
  createdAt: Date;
}
