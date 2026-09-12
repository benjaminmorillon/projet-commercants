import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';
import { PlayerEventType } from './event-weights';

// Trace de chaque action du joueur, avec l'effet qu'elle a eu sur son
// profil (section 2.1 et entité PlayerEvent du modèle de données).
@Entity()
export class PlayerEvent {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  playerId: string;

  @Column()
  type: PlayerEventType;

  // Variation réellement appliquée à chaque dimension, pour pouvoir
  // expliquer au joueur ce qui a fait bouger son profil.
  @Column({ type: 'float', default: 0 })
  deltaExplorateur: number;

  @Column({ type: 'float', default: 0 })
  deltaAccomplisseur: number;

  @Column({ type: 'float', default: 0 })
  deltaCompetiteur: number;

  @Column({ type: 'float', default: 0 })
  deltaSocialisateur: number;

  @Column({ type: 'varchar', nullable: true })
  businessId: string | null;

  @Column({ type: 'varchar', nullable: true })
  missionId: string | null;

  @Column({ type: 'datetime', default: () => 'CURRENT_TIMESTAMP' })
  createdAt: Date;
}
