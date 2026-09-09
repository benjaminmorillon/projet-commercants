import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

export type ValidatorType = 'commercant' | 'joueur';
export type ValidationStatut = 'en_attente' | 'validee' | 'refusee';

// Une mission n'est créditée qu'une fois validée par un tiers : le
// commerçant du lieu si la mission y est rattachée, sinon un autre joueur
// désigné par le joueur qui l'a accomplie (section demandée par l'utilisateur :
// "les missions doivent pouvoir être validées par un tiers").
@Entity()
export class MissionValidation {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  missionId: string;

  @Column()
  playerId: string;

  @Column()
  choix: 'depense' | 'don' | 'accumulation';

  @Column()
  validatorType: ValidatorType;

  @Column({ type: 'varchar', nullable: true })
  validatorBusinessId: string | null;

  @Column({ type: 'varchar', nullable: true })
  validatorPlayerId: string | null;

  @Column({ default: 'en_attente' })
  statut: ValidationStatut;

  @Column({ type: 'datetime', default: () => 'CURRENT_TIMESTAMP' })
  createdAt: Date;

  @Column({ type: 'datetime', nullable: true })
  resolvedAt: Date | null;
}
