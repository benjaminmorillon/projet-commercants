import { Column, Entity, PrimaryColumn } from 'typeorm';

// Les identifiants viennent directement de docs/missions-catalogue.json
// (ex: "EXP-001") plutôt que d'un uuid généré, pour rester lisibles et
// stables face au catalogue de référence.
@Entity()
export class Mission {
  @PrimaryColumn()
  id: string;

  @Column()
  titre: string;

  @Column({ type: 'text' })
  description: string;

  // explorateur / accomplisseur / competiteur / socialisateur / mixte
  @Column()
  archetypeDominant: string;

  // courte / moyenne / longue
  @Column()
  duree: string;

  @Column()
  theme: string;

  // solo / duo_affinite_naturelle / duo_defi_complementarite / groupe
  @Column()
  modeInteraction: string;

  // brise_glace / construction / partage — absent pour les missions solo simples
  @Column({ type: 'varchar', nullable: true })
  phaseRelationnelle: string | null;

  // ex: "reseaux_sociaux" — absent pour une mission standard classique
  @Column({ type: 'varchar', nullable: true })
  typeSpecial: string | null;

  @Column({ type: 'float' })
  recompenseBase: number;

  @Column({ type: 'varchar', nullable: true })
  parcoursId: string | null;

  @Column({ type: 'int', nullable: true })
  etape: number | null;

  @Column({ type: 'varchar', nullable: true })
  debloqueMissionId: string | null;

  // Lieu partenaire qui propose cette mission. Absent pour les missions du
  // catalogue de départ (pas encore rattachées à un commerçant réel).
  @Column({ type: 'varchar', nullable: true })
  businessId: string | null;

  @Column({ type: 'datetime', default: () => 'CURRENT_TIMESTAMP' })
  createdAt: Date;
}
