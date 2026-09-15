import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity()
export class CheckIn {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  playerId: string;

  @Column()
  businessId: string;

  // La position du COMMERCE au moment de la venue, et non celle du
  // téléphone : depuis le passage au code de présence, on ne demande plus sa
  // position au joueur. C'est cette position qui lève le quartier sur la
  // carte.
  //
  // (L'ancienne colonne `distanceMeters` a disparu avec le pointage GPS :
  // elle mesurait l'écart entre le joueur et le lieu, qui n'existe plus.)
  @Column({ type: 'float' })
  latitude: number;

  @Column({ type: 'float' })
  longitude: number;

  @Column({ type: 'datetime', default: () => 'CURRENT_TIMESTAMP' })
  createdAt: Date;
}
