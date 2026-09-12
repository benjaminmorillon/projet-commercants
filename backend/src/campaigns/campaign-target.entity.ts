import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

export type TargetStatut = 'envoyee' | 'acceptee' | 'refusee';

@Entity()
export class CampaignTarget {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  campaignId: string;

  @Column()
  playerId: string;

  @Column({ default: 'envoyee' })
  statut: TargetStatut;

  // Ce que la cible pense de l'invitation : réaction courte choisie dans
  // une liste, plus un commentaire libre optionnel. C'est ce retour que le
  // commerçant voit dans ses résultats de campagne.
  @Column({ type: 'varchar', nullable: true })
  reaction: string | null;

  @Column({ type: 'text', nullable: true })
  commentaire: string | null;

  // Crédit effectivement versé au joueur (seulement s'il accepte).
  @Column({ type: 'float', default: 0 })
  creditVerse: number;

  @Column({ type: 'datetime', default: () => 'CURRENT_TIMESTAMP' })
  createdAt: Date;

  @Column({ type: 'datetime', nullable: true })
  respondedAt: Date | null;
}
