import { Column, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

/**
 * Un navigateur qui accepte de recevoir des notifications hors de l'appli.
 * Une même personne peut en avoir plusieurs (téléphone, ordinateur).
 */
@Entity()
export class PushSubscription {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  userId: string;

  // L'adresse que le service de push du navigateur nous a donnée.
  @Index({ unique: true })
  @Column({ type: 'text' })
  endpoint: string;

  // Les deux clés qui servent à chiffrer le message pour ce navigateur-là.
  @Column()
  p256dh: string;

  @Column()
  auth: string;

  @Column({ type: 'datetime', default: () => 'CURRENT_TIMESTAMP' })
  createdAt: Date;
}
