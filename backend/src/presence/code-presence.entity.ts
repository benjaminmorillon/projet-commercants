import { Column, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

/**
 * Un code de présence, à montrer une fois puis à jeter.
 *
 * Une ligne par code affiché, et non une colonne sur le joueur : on veut
 * pouvoir dire QUAND un code a été créé, QUAND il a été consommé et PAR QUI.
 * Sans cette trace, un litige (« j'étais chez vous hier ») n'aurait aucune
 * réponse.
 */
@Entity()
@Index(['playerId'])
export class CodePresence {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  /** Les 8 caractères montrés au commerçant. Unique : c'est la clé du scan. */
  @Column({ unique: true })
  code: string;

  @Column()
  playerId: string;

  @Column({ type: 'datetime', default: () => 'CURRENT_TIMESTAMP' })
  creeLe: Date;

  @Column({ type: 'datetime' })
  expireLe: Date;

  /** Quand le code a été scanné. Nul tant qu'il n'a pas servi. */
  @Column({ type: 'datetime', nullable: true })
  utiliseLe: Date | null;

  /** Le commerce qui l'a scanné. */
  @Column({ type: 'varchar', nullable: true })
  businessId: string | null;
}
