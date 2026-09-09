import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity()
export class Review {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  playerId: string;

  @Column()
  businessId: string;

  @Column()
  checkInId: string;

  // Note sur 5 (entier).
  @Column({ type: 'int' })
  note: number;

  @Column({ type: 'text', nullable: true })
  commentaire: string | null;

  @Column({ type: 'datetime', default: () => 'CURRENT_TIMESTAMP' })
  createdAt: Date;
}
