import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

export type CampaignType = 'invitation' | 'publicite';

// Part du montant payé par le commerçant qui repart vers le joueur ciblé
// sous forme de crédit (section 3.4 des specs : ~0,25 € reversés sur
// ~0,30 € payés). Le reste est la marge de la plateforme.
//
// Valeur de repli : modifiable depuis le back-office
// (réglage « campagnes.partJoueur »).
export const PART_JOUEUR = 0.8;

@Entity()
export class Campaign {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  businessId: string;

  // invitation = rattachée à un événement ; publicite = message seul.
  @Column()
  type: CampaignType;

  @Column({ type: 'varchar', nullable: true })
  eventId: string | null;

  @Column({ type: 'text' })
  message: string;

  @Column({ type: 'text', nullable: true })
  imageDataUrl: string | null;

  // Ce que le commerçant accepte de dépenser pour chaque personne ciblée.
  @Column({ type: 'float' })
  montantParCible: number;

  // Critères de ciblage : scores minimum sur les 4 archétypes (les "barres
  // de profil") et nombre minimum de missions réussies.
  @Column({ type: 'float', default: 0 })
  minExplorateur: number;

  @Column({ type: 'float', default: 0 })
  minAccomplisseur: number;

  @Column({ type: 'float', default: 0 })
  minCompetiteur: number;

  @Column({ type: 'float', default: 0 })
  minSocialisateur: number;

  @Column({ type: 'int', default: 0 })
  minMissionsReussies: number;

  @Column({ type: 'int' })
  nombreCibles: number;

  @Column({ type: 'float' })
  coutTotal: number;

  @Column({ type: 'datetime', default: () => 'CURRENT_TIMESTAMP' })
  createdAt: Date;
}
