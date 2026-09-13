import { Column, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';
import { DonneesNotification, TypeNotification } from './notification-rules';

@Entity()
@Index(['destinataireId', 'lueLe'])
export class Notification {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  destinataireId: string;

  @Column({ type: 'varchar' })
  type: TypeNotification;

  // Le texte est rendu à l'écriture : une notification dit ce qu'elle disait
  // au moment où elle est née, même si la mission est renommée depuis.
  @Column()
  titre: string;

  @Column()
  corps: string;

  @Column()
  lien: string;

  @Column({ type: 'simple-json', nullable: true })
  donnees: DonneesNotification | null;

  @Column({ type: 'datetime', nullable: true })
  lueLe: Date | null;

  @Column({ type: 'datetime', default: () => 'CURRENT_TIMESTAMP' })
  createdAt: Date;
}
