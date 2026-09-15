import { Column, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

/**
 * Une pièce jointe d'un commerce : sa carte, ses tarifs, une affiche.
 *
 * Dans une table à part, pour la même raison que les photos : le fichier pèse
 * jusqu'à cinq méga-octets, et la fiche du commerce est listée partout (la
 * carte, la recherche, le back-office). Si le fichier était une colonne de la
 * fiche, chacune de ces listes le traînerait sans jamais l'afficher.
 *
 * Ici, une liste ne sait que le NOM et le POIDS. Le contenu part au navigateur
 * par une adresse à lui, et seulement quand quelqu'un demande à l'ouvrir.
 */
@Entity()
@Index(['businessId'])
export class PieceJointe {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  businessId: string;

  /** Le nom tel qu'il s'affiche et tel qu'il se télécharge. Déjà nettoyé. */
  @Column()
  nom: string;

  @Column({ type: 'varchar' })
  format: string;

  /** Recopié pour pouvoir lister sans charger les octets. */
  @Column({ type: 'int' })
  taille: number;

  @Column({ type: 'blob' })
  donnees: Buffer;

  @Column({ type: 'datetime', default: () => 'CURRENT_TIMESTAMP' })
  ajouteeLe: Date;
}
