import { Column, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

/**
 * Une offre publiée par un commerçant.
 *
 * Ce n'est pas une campagne de ciblage (qui pousse un message vers des
 * joueurs choisis, une fois). C'est un objet qui VIT : il reste consultable
 * pendant la période que le commerçant a fixée, se retrouve par une
 * recherche, et sert de bon de réduction chez lui.
 *
 * D'où une entité à part plutôt qu'un type de campagne de plus : les deux ne
 * se ressemblent que superficiellement.
 */
@Entity()
@Index(['businessId'])
export class Publicite {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  businessId: string;

  @Column()
  titre: string;

  @Column({ type: 'text' })
  description: string;

  /**
   * Ce que le commerçant vend, en mots.
   *
   * C'est LE champ de la recherche : c'est lui qui pèse le plus lourd quand
   * un joueur cherche « pizza » ou « coupe de cheveux ». Stocké en texte
   * libre séparé par des virgules — un joueur ne verra jamais ce champ, il ne
   * sert qu'à être trouvé.
   */
  @Column({ type: 'text', default: '' })
  motsCles: string;

  /** L'offre telle qu'elle s'affiche : « Le menu du midi à 9 € ». */
  @Column({ type: 'text' })
  offre: string;

  // --- La réduction, en chiffres ------------------------------------------
  // Les deux peuvent coexister, et les deux peuvent être absents : une offre
  // peut n'être qu'une annonce.

  @Column({ type: 'int', nullable: true })
  reductionPourcent: number | null;

  @Column({ type: 'float', nullable: true })
  reductionJetons: number | null;

  // --- La période ----------------------------------------------------------

  @Column({ type: 'datetime' })
  debutLe: Date;

  @Column({ type: 'datetime' })
  finLe: Date;

  /** Le commerçant peut suspendre son offre sans la supprimer. */
  @Column({ type: 'boolean', default: true })
  active: boolean;

  // --- Le budget -----------------------------------------------------------

  /** Ce que le commerçant accepte de dépenser en tout pour cette offre. */
  @Column({ type: 'float' })
  budgetJetons: number;

  /** Ce qui a déjà été versé aux joueurs. Recopie, le registre fait foi. */
  @Column({ type: 'float', default: 0 })
  depenseJetons: number;

  /** Ce qu'une ouverture payée coûte au commerçant. */
  @Column({ type: 'float' })
  coutParOuverture: number;

  /**
   * Quand cette offre a été annoncée aux clients du commerce. Nulle tant
   * qu'elle ne l'a pas été — et une offre ne s'annonce qu'une fois.
   */
  @Column({ type: 'datetime', nullable: true })
  annonceeLe: Date | null;

  @Column({ type: 'datetime', default: () => 'CURRENT_TIMESTAMP' })
  createdAt: Date;
}
