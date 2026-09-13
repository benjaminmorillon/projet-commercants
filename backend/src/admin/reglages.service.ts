import { BadRequestException, Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  CATALOGUE,
  CATALOGUE_PAR_CLE,
  DefinitionReglage,
  enTexte,
  lireValeur,
} from './catalogue-reglages';
import { Reglage } from './reglage.entity';

export interface ReglageAffiche extends DefinitionReglage {
  valeur: number | boolean | string;
  /** Vrai si la valeur a été modifiée depuis le back-office. */
  personnalise: boolean;
}

/**
 * Le magasin de réglages.
 *
 * Les valeurs sont chargées en mémoire une fois au démarrage, et remises à
 * jour à chaque écriture. Les lectures sont donc SYNCHRONES et gratuites :
 * on peut appeler `reglages.entier(...)` au milieu d'un calcul sans
 * transformer toute la chaîne d'appels en asynchrone, et sans taper la base
 * à chaque requête.
 */
@Injectable()
export class ReglagesService implements OnModuleInit {
  private readonly logger = new Logger(ReglagesService.name);
  private readonly valeurs = new Map<string, number | boolean | string>();

  constructor(
    @InjectRepository(Reglage)
    private readonly reglages: Repository<Reglage>,
  ) {}

  async onModuleInit(): Promise<void> {
    await this.recharger();
  }

  async recharger(): Promise<void> {
    this.valeurs.clear();

    const lignes = await this.reglages.find();
    let ignorees = 0;

    for (const ligne of lignes) {
      const definition = CATALOGUE_PAR_CLE.get(ligne.cle);
      if (!definition) {
        // Un réglage retiré du catalogue depuis. On garde la ligne en base
        // (au cas où le réglage revienne) mais on ne s'en sert pas.
        ignorees += 1;
        continue;
      }

      const lecture = lireValeur(definition, ligne.valeur);
      if (!lecture.ok) {
        // Une valeur devenue invalide (bornes resserrées depuis) ne doit pas
        // empêcher le site de démarrer : on repart sur la valeur par défaut.
        this.logger.warn(
          `Réglage « ${ligne.cle} » ignoré (${lecture.erreur}) — valeur par défaut utilisée.`,
        );
        ignorees += 1;
        continue;
      }

      this.valeurs.set(ligne.cle, lecture.valeur);
    }

    this.logger.log(
      `${this.valeurs.size} réglage(s) personnalisé(s) chargé(s)` +
        (ignorees > 0 ? `, ${ignorees} ignoré(s).` : '.'),
    );
  }

  // --- Lectures ----------------------------------------------------------

  private brut(cle: string): number | boolean | string {
    if (this.valeurs.has(cle)) {
      return this.valeurs.get(cle) as number | boolean | string;
    }

    const definition = CATALOGUE_PAR_CLE.get(cle);
    if (!definition) {
      // Faute de frappe dans le code appelant : mieux vaut le voir tout de
      // suite qu'à travers un comportement bizarre.
      throw new Error(`Réglage inconnu : ${cle}`);
    }
    return definition.defaut;
  }

  nombre(cle: string): number {
    const valeur = this.brut(cle);
    return typeof valeur === 'number' ? valeur : Number(valeur);
  }

  entier(cle: string): number {
    return Math.round(this.nombre(cle));
  }

  booleen(cle: string): boolean {
    return Boolean(this.brut(cle));
  }

  texte(cle: string): string {
    return String(this.brut(cle));
  }

  /** Le catalogue complet, valeurs actuelles incluses : de quoi bâtir la page. */
  tout(): ReglageAffiche[] {
    return CATALOGUE.map((definition) => ({
      ...definition,
      valeur: this.valeurs.has(definition.cle)
        ? (this.valeurs.get(definition.cle) as number | boolean | string)
        : definition.defaut,
      personnalise: this.valeurs.has(definition.cle),
    }));
  }

  // --- Écritures ---------------------------------------------------------

  /**
   * Change un réglage. Rend l'ancienne et la nouvelle valeur, pour que
   * l'appelant puisse les écrire au journal.
   */
  async definir(
    cle: string,
    brut: unknown,
    parUtilisateur: string | null,
  ): Promise<{ avant: number | boolean | string; apres: number | boolean | string }> {
    const definition = CATALOGUE_PAR_CLE.get(cle);
    if (!definition) {
      throw new BadRequestException(`Réglage inconnu : ${cle}`);
    }

    const lecture = lireValeur(definition, brut);
    if (!lecture.ok) {
      throw new BadRequestException(`${definition.libelle} : ${lecture.erreur}`);
    }

    const avant = this.brut(cle);

    await this.reglages.save({
      cle,
      valeur: enTexte(lecture.valeur),
      modifiePar: parUtilisateur,
      modifieLe: new Date(),
    });
    this.valeurs.set(cle, lecture.valeur);

    return { avant, apres: lecture.valeur };
  }

  /** Remet un réglage à sa valeur par défaut en supprimant la ligne. */
  async remettreParDefaut(
    cle: string,
  ): Promise<{ avant: number | boolean | string; apres: number | boolean | string }> {
    const definition = CATALOGUE_PAR_CLE.get(cle);
    if (!definition) {
      throw new BadRequestException(`Réglage inconnu : ${cle}`);
    }

    const avant = this.brut(cle);
    await this.reglages.delete({ cle });
    this.valeurs.delete(cle);

    return { avant, apres: definition.defaut };
  }
}
