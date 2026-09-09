import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

export type FriendshipStatut = 'en_attente' | 'acceptee' | 'refusee';

@Entity()
export class Friendship {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  requesterId: string;

  @Column()
  receiverId: string;

  @Column({ default: 'en_attente' })
  statut: FriendshipStatut;

  @Column({ type: 'datetime', default: () => 'CURRENT_TIMESTAMP' })
  createdAt: Date;

  @Column({ type: 'datetime', nullable: true })
  resolvedAt: Date | null;
}
