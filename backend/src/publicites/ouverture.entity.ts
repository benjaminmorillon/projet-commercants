import { Column, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

/**
 * Un joueur a ouvert une offre.
 *
 * Cette ligne porte deux choses à la fois, et c'est voulu :
 *
 *  1. la TRACE de l'ouverture — qui, quand, payé ou non, et pourquoi. C'est
 *     ce qui permet de ne payer qu'une fois, et de montrer à un commerçant ce
 *     pour quoi il a payé ;
 *  2. le BON DE RÉDUCTION lui-même. Ouvrir l'offre, c'est l'obtenir : il n'y
 *     a pas d'objet séparé à créer, ni d'étape « je récupère le bon » qui
 *     ferait perdre du monde en route.
 */
@Entity()
@Index(['publiciteId', 'playerId'], { unique: true })
@Index(['playerId'])
export class OuverturePublicite {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  publiciteId: string;

  @Column()
  playerId: string;

  @Column({ type: 'datetime', default: () => 'CURRENT_TIMESTAMP' })
  ouverteLe: Date;

  @Column({ type: 'float', default: 0 })
  montantVerse: number;

  @Column({ type: 'boolean', default: false })
  paye: boolean;

  /** Le code du refus (voir eligibilite.ts), pour pouvoir compter les cas. */
  @Column({ type: 'varchar', nullable: true })
  raisonNonPaye: string | null;

  /** Quand le bon a été utilisé chez le commerçant. Nul tant qu'il est valable. */
  @Column({ type: 'datetime', nullable: true })
  utiliseLe: Date | null;
}
