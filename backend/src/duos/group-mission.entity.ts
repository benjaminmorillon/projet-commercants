import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';
import { TypeMatching } from './matching';

export type GroupMissionStatut = 'proposee' | 'acceptee' | 'accomplie' | 'annulee';
// L'identité du partenaire peut rester cachée jusqu'à l'arrivée, pour créer
// le suspense (section 2.2 des specs : "à tester").
export type StatutRevelation = 'cachee' | 'annoncee';

@Entity()
export class GroupMission {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  missionId: string;

  @Column({ type: 'varchar', nullable: true })
  businessId: string | null;

  @Column()
  typeMatching: TypeMatching;

  @Column({ default: 'proposee' })
  statut: GroupMissionStatut;

  @Column({ default: 'cachee' })
  statutRevelation: StatutRevelation;

  @Column({ type: 'datetime' })
  creneauDebut: Date;

  // Score d'affinité calculé au moment de l'appariement, conservé pour
  // pouvoir comparer ensuite avec le résultat réel du duo.
  @Column({ type: 'float', default: 0 })
  scoreAffinite: number;

  @Column()
  combinaisonArchetypes: string;

  @Column({ type: 'datetime', default: () => 'CURRENT_TIMESTAMP' })
  createdAt: Date;
}
