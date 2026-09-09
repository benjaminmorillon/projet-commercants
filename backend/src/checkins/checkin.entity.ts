import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity()
export class CheckIn {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  playerId: string;

  @Column()
  businessId: string;

  @Column({ type: 'float' })
  latitude: number;

  @Column({ type: 'float' })
  longitude: number;

  // Distance mesurée entre le joueur et le lieu au moment du check-in,
  // conservée pour audit/debug même si elle était sous le seuil autorisé.
  @Column({ type: 'float' })
  distanceMeters: number;

  @Column({ type: 'datetime', default: () => 'CURRENT_TIMESTAMP' })
  createdAt: Date;
}
