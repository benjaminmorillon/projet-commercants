import { Column, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

/**
 * Un joueur ne veut plus figurer dans la liste des clients d'un commerce.
 *
 * On enregistre le RETRAIT plutôt que d'effacer ses venues : ses venues
 * appartiennent à son jeu à lui (l'XP gagnée, les quartiers levés, les avis
 * qu'elles autorisent). Les effacer pour sortir d'une liste de diffusion
 * reviendrait à lui faire payer sa demande avec sa propre progression.
 *
 * Le commerce, lui, ne le voit plus et ne peut plus lui écrire.
 */
@Entity()
@Index(['playerId', 'businessId'], { unique: true })
export class RetraitClient {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  playerId: string;

  @Column()
  businessId: string;

  @Column({ type: 'datetime', default: () => 'CURRENT_TIMESTAMP' })
  retireLe: Date;
}
