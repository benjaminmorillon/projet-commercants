import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

// Événement organisé par un commerçant dans son établissement
// (section 3.1 des specs : "suggestions d'événements à organiser").
@Entity()
export class Event {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  businessId: string;

  @Column()
  titre: string;

  @Column({ type: 'text' })
  description: string;

  @Column({ type: 'datetime' })
  dateDebut: Date;

  // Image d'illustration, stockée en data URL (pas de serveur de fichiers
  // à ce stade du prototype).
  @Column({ type: 'text', nullable: true })
  imageDataUrl: string | null;

  @Column({ type: 'datetime', default: () => 'CURRENT_TIMESTAMP' })
  createdAt: Date;
}
