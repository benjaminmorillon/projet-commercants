import {
  Column,
  Entity,
  JoinColumn,
  OneToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { User } from '../users/user.entity';

@Entity()
export class PlayerProfile {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @OneToOne(() => User, (user) => user.profile, { onDelete: 'CASCADE' })
  @JoinColumn()
  user: User;

  @Column()
  userId: string;

  // Scores 0-100 sur les 4 archétypes de Bartle adaptés (section 2.1 des specs).
  // Ne somment pas nécessairement à 100 : ce sont 4 dimensions indépendantes.
  @Column({ type: 'float', default: 0 })
  scoreExplorateur: number;

  @Column({ type: 'float', default: 0 })
  scoreAccomplisseur: number;

  @Column({ type: 'float', default: 0 })
  scoreCompetiteur: number;

  @Column({ type: 'float', default: 0 })
  scoreSocialisateur: number;

  // Réponses brutes au questionnaire à sliders, conservées pour permettre
  // de rejouer/ajuster la formule de calcul plus tard sans redemander au joueur.
  @Column({ type: 'text', nullable: true })
  sliderAnswersJson: string | null;

  @Column({ type: 'datetime', nullable: true })
  questionnaireCompletedAt: Date | null;

  @Column({ type: 'datetime', default: () => 'CURRENT_TIMESTAMP' })
  updatedAt: Date;
}
