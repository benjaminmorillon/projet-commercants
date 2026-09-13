import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

/**
 * Une action d'administration, écrite noir sur blanc.
 *
 * Pourquoi c'est indispensable dès maintenant : un back-office permet de
 * changer des règles qui touchent à l'argent et aux comptes des gens. Le jour
 * où un chiffre paraît anormal, la seule question utile est « qui a changé
 * quoi, et quand ». Sans journal, la réponse est perdue.
 *
 * Les lignes ne sont jamais modifiées ni supprimées par l'application.
 */
@Entity()
export class JournalAdmin {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  auteurId: string;

  // Recopié au moment de l'action : si le compte change d'email plus tard,
  // le journal garde la trace de qui c'était à ce moment-là.
  @Column()
  auteurEmail: string;

  // Ex : « reglage.modifie », « reglage.reinitialise ».
  @Column()
  action: string;

  // Ce sur quoi l'action a porté : une clé de réglage, un identifiant de
  // commerce, de mission...
  @Column({ type: 'varchar', nullable: true })
  cible: string | null;

  // Phrase lisible telle qu'elle s'affiche dans le journal.
  @Column({ type: 'text' })
  resume: string;

  @Column({ type: 'text', nullable: true })
  avant: string | null;

  @Column({ type: 'text', nullable: true })
  apres: string | null;

  @Column({ type: 'datetime', default: () => 'CURRENT_TIMESTAMP' })
  faitLe: Date;
}
