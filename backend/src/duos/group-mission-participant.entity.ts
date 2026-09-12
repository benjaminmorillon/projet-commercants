import { Column, Entity, PrimaryGeneratedColumn, Unique } from 'typeorm';

export type ParticipantStatut = 'invite' | 'accepte' | 'refuse';

@Entity()
@Unique(['groupMissionId', 'playerId'])
export class GroupMissionParticipant {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  groupMissionId: string;

  @Column()
  playerId: string;

  @Column({ default: 'invite' })
  statut: ParticipantStatut;

  // Chacun confirme de son côté que la mission a bien été faite : c'est la
  // validation par le partenaire, pour les missions à plusieurs.
  @Column({ default: false })
  aConfirme: boolean;

  @Column({ type: 'datetime', nullable: true })
  reponduLe: Date | null;
}
