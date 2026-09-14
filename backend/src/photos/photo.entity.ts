import { Column, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

export type SujetPhoto = 'joueur' | 'commerce' | 'publicite';

/**
 * Une photo de profil.
 *
 * Dans une TABLE À PART, et pas comme une colonne sur le joueur ou sur le
 * commerce. La raison est concrète : une photo pèse quelques dizaines de
 * kilo-octets, et le site liste des joueurs et des commerces en permanence
 * (la carte, les amis, les duos, le back-office). Si la photo était une
 * colonne de la fiche, chacune de ces listes traînerait toutes les images
 * avec elle — sans jamais les afficher, puisqu'elle n'affiche que des noms.
 *
 * Ici, une liste ne charge jamais une seule image : elle ne sait que si la
 * photo existe. L'image elle-même part au navigateur par une adresse à elle,
 * et le navigateur la garde en cache.
 */
@Entity()
@Index(['sujet', 'proprietaireId'], { unique: true })
export class Photo {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar' })
  sujet: SujetPhoto;

  @Column()
  proprietaireId: string;

  @Column({ type: 'varchar' })
  format: string;

  // SQLite stocke les octets tels quels : pas de ré-encodage en base64, donc
  // un tiers de place en moins et rien à décoder à la lecture.
  @Column({ type: 'blob' })
  donnees: Buffer;

  // Sert à fabriquer une adresse qui change quand la photo change, pour que
  // le navigateur ne continue pas d'afficher l'ancienne depuis son cache.
  @Column({ type: 'datetime', default: () => 'CURRENT_TIMESTAMP' })
  updatedAt: Date;
}
