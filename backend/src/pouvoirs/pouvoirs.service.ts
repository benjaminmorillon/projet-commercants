import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, LessThan, MoreThan, Repository } from 'typeorm';
import { NotificationsService } from '../notifications/notifications.service';
import { PouvoirJoueur } from './pouvoir-joueur.entity';
import {
  DefinitionPouvoir,
  EtatPouvoir,
  PouvoirActif,
  POUVOIRS,
  bonusMissionsDuJour,
  effetSurLaRecompense,
  etatDuPouvoir,
  finDEffetDepuis,
  peremptionDepuis,
  pouvoirDeNiveau,
  pouvoirDePalier,
  pouvoirParId,
  profilsOuvertsParPouvoir,
  tempsRestant,
  verdictUtilisation,
  zonesLeveesParPouvoir,
  type ProfilPouvoir,
} from './pouvoirs';

/** Une ligne d'inventaire, telle qu'elle s'affiche. */
export interface PouvoirAffiche {
  id: string;
  pouvoirId: string;
  nom: string;
  profil: string;
  effet: string;
  conseil: string;
  cible: string;
  origine: string;
  etat: EtatPouvoir;
  /** « 3 jours » avant péremption, ou « 2 h 15 » d'effet restant. */
  restant: string;
}

export interface Inventaire {
  disponibles: PouvoirAffiche[];
  actifs: PouvoirAffiche[];
  passes: PouvoirAffiche[];
}

@Injectable()
export class PouvoirsService {
  constructor(
    @InjectRepository(PouvoirJoueur)
    private readonly pouvoirs: Repository<PouvoirJoueur>,
    private readonly notifications: NotificationsService,
  ) {}

  // -------------------------------------------------------------------------
  // Attribuer
  // -------------------------------------------------------------------------

  private async attribuer(
    playerId: string,
    definition: DefinitionPouvoir,
    origine: string,
  ): Promise<PouvoirJoueur> {
    const obtenuLe = new Date();
    const ligne = await this.pouvoirs.save(
      this.pouvoirs.create({
        playerId,
        pouvoirId: definition.id,
        origine,
        obtenuLe,
        perimeLe: peremptionDepuis(definition, obtenuLe),
        utiliseLe: null,
        effetJusquA: null,
        cible: null,
      }),
    );

    // Un pouvoir qu'on ne sait pas avoir reçu ne sert à rien : il périmera
    // dans l'inventaire sans que personne l'ouvre.
    await this.notifications
      .prevenir(playerId, 'pouvoir_obtenu', {
        pouvoir: definition.nom,
        effet: definition.effet,
      })
      .catch(() => null);

    return ligne;
  }

  /** Une montée de niveau : un pouvoir du profil dominant du joueur. */
  async attribuerPourNiveau(
    playerId: string,
    profilDominant: ProfilPouvoir,
    niveau: number,
  ): Promise<void> {
    await this.attribuer(playerId, pouvoirDeNiveau(profilDominant, niveau), `niveau ${niveau}`);
  }

  /** Un palier franchi dans l'arbre : un pouvoir de la VOIE, pas du joueur. */
  async attribuerPourPalier(
    playerId: string,
    archetypeDeLaVoie: string,
    numeroDuPalier: number,
    nomDeLaVoie: string,
  ): Promise<void> {
    const definition = pouvoirDePalier(archetypeDeLaVoie, numeroDuPalier);
    if (!definition) {
      return;
    }
    await this.attribuer(playerId, definition, `${nomDeLaVoie}, palier ${numeroDuPalier}`);
  }

  // -------------------------------------------------------------------------
  // Consulter
  // -------------------------------------------------------------------------

  async inventaire(playerId: string): Promise<Inventaire> {
    const maintenant = new Date();
    const lignes = await this.pouvoirs.find({
      where: { playerId },
      order: { obtenuLe: 'DESC' },
    });

    const vide: Inventaire = { disponibles: [], actifs: [], passes: [] };

    return lignes.reduce((inventaire, ligne) => {
      const definition = pouvoirParId(ligne.pouvoirId);
      if (!definition) {
        // Un pouvoir retiré du catalogue : on ne le montre plus, mais on ne
        // supprime pas sa ligne — l'historique du joueur lui appartient.
        return inventaire;
      }

      const etat = etatDuPouvoir(ligne, maintenant);
      const affiche: PouvoirAffiche = {
        id: ligne.id,
        pouvoirId: ligne.pouvoirId,
        nom: definition.nom,
        profil: definition.profil,
        effet: definition.effet,
        conseil: definition.conseil,
        cible: definition.cible,
        origine: ligne.origine,
        etat,
        restant:
          etat === 'disponible'
            ? tempsRestant(ligne.perimeLe, maintenant)
            : etat === 'actif' && ligne.effetJusquA
              ? tempsRestant(ligne.effetJusquA, maintenant)
              : '',
      };

      if (etat === 'disponible') inventaire.disponibles.push(affiche);
      else if (etat === 'actif') inventaire.actifs.push(affiche);
      else inventaire.passes.push(affiche);

      return inventaire;
    }, vide);
  }

  /**
   * Les pouvoirs dont l'effet court en ce moment.
   *
   * C'est par là que passent tous les autres services : la récompense d'une
   * mission, la limite du jour, les quartiers levés, l'accès à un profil.
   */
  async actifs(playerId: string): Promise<PouvoirActif[]> {
    const maintenant = new Date();
    const lignes = await this.pouvoirs.find({
      where: { playerId, effetJusquA: MoreThan(maintenant) },
    });
    return lignes.map((l) => ({ pouvoirId: l.pouvoirId, cible: l.cible }));
  }

  // -------------------------------------------------------------------------
  // Utiliser
  // -------------------------------------------------------------------------

  async utiliser(playerId: string, ligneId: string, cible: string | null): Promise<PouvoirAffiche> {
    const ligne = await this.pouvoirs.findOne({ where: { id: ligneId, playerId } });
    if (!ligne) {
      throw new NotFoundException("Ce pouvoir n'est pas dans ton inventaire.");
    }

    const definition = pouvoirParId(ligne.pouvoirId);
    if (!definition) {
      throw new BadRequestException("Ce pouvoir n'existe plus.");
    }

    const maintenant = new Date();
    const verdict = verdictUtilisation({
      ligne,
      definition,
      cibleFournie: cible,
      maintenant,
    });

    if (!verdict.ok) {
      throw new BadRequestException(verdict.raison);
    }

    ligne.utiliseLe = maintenant;
    ligne.effetJusquA = finDEffetDepuis(definition, maintenant);
    ligne.cible = definition.cible === 'aucune' ? null : cible;
    await this.pouvoirs.save(ligne);

    return {
      id: ligne.id,
      pouvoirId: ligne.pouvoirId,
      nom: definition.nom,
      profil: definition.profil,
      effet: definition.effet,
      conseil: definition.conseil,
      cible: definition.cible,
      origine: ligne.origine,
      etat: 'actif',
      restant: tempsRestant(ligne.effetJusquA, maintenant),
    };
  }

  // -------------------------------------------------------------------------
  // Ce que les autres services viennent chercher
  // -------------------------------------------------------------------------

  /**
   * Le multiplicateur à appliquer à une récompense, et la consommation qui va
   * avec.
   *
   * Appelé DEUX fois pour une même mission : une fois pour annoncer le montant
   * au joueur (`consommer: false`), une fois pour le créditer
   * (`consommer: true`). Sans ce garde-fou, afficher le montant brûlerait la
   * Double mise sans rien créditer.
   */
  async multiplicateur(
    playerId: string,
    lieuEnBonus: boolean,
    consommer: boolean,
  ): Promise<number> {
    const actifs = await this.actifs(playerId);
    const effet = effetSurLaRecompense(actifs, { lieuEnBonus });

    if (consommer && effet.consommes.length > 0) {
      const maintenant = new Date();
      for (const pouvoirId of effet.consommes) {
        const ligne = await this.pouvoirs.findOne({
          where: { playerId, pouvoirId, effetJusquA: MoreThan(maintenant) },
          order: { effetJusquA: 'ASC' },
        });
        if (ligne) {
          // On coupe l'effet net : la cartouche est tirée.
          ligne.effetJusquA = maintenant;
          await this.pouvoirs.save(ligne);
        }
      }
    }

    return effet.multiplicateur;
  }

  /** Combien de missions supplémentaires aujourd'hui. */
  async bonusMissions(playerId: string): Promise<number> {
    return bonusMissionsDuJour(await this.actifs(playerId));
  }

  /** Les quartiers que « Vision lointaine » tient levés. */
  async zonesLevees(playerId: string): Promise<string[]> {
    return zonesLeveesParPouvoir(await this.actifs(playerId));
  }

  /** « Lever le voile » ouvre-t-il le profil de ce joueur-là ? */
  async voitLeProfil(playerId: string, cibleId: string): Promise<boolean> {
    return profilsOuvertsParPouvoir(await this.actifs(playerId)).includes(cibleId);
  }

  /** Le catalogue, pour l'expliquer dans l'interface. */
  catalogue(): DefinitionPouvoir[] {
    return POUVOIRS;
  }

  /** Combien de pouvoirs ont péri sans servir. Pour le profil. */
  async perimesSansServir(playerId: string): Promise<number> {
    return this.pouvoirs.count({
      where: { playerId, utiliseLe: IsNull(), perimeLe: LessThan(new Date()) },
    });
  }
}
