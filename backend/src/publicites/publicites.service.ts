import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, LessThanOrEqual, MoreThanOrEqual, Repository } from 'typeorm';
import { ReglagesService } from '../admin/reglages.service';
import { Business } from '../businesses/business.entity';
import { CheckIn } from '../checkins/checkin.entity';
import { arrondir } from '../ledger/ledger-rules';
import { LedgerService } from '../ledger/ledger.service';
import { PhotosService } from '../photos/photos.service';
import { libelleReduction, verdictDePaiement } from './eligibilite';
import { OuverturePublicite } from './ouverture.entity';
import { Publicite } from './publicite.entity';
import { pertinence } from './recherche';

const JOUR_MS = 24 * 60 * 60 * 1000;

export interface CreerPubliciteDto {
  titre: string;
  description: string;
  motsCles: string;
  offre: string;
  reductionPourcent?: number | null;
  reductionJetons?: number | null;
  debutLe: string;
  finLe: string;
  budgetJetons: number;
  coutParOuverture?: number;
}

@Injectable()
export class PublicitesService {
  constructor(
    @InjectRepository(Publicite) private readonly publicites: Repository<Publicite>,
    @InjectRepository(OuverturePublicite)
    private readonly ouvertures: Repository<OuverturePublicite>,
    @InjectRepository(Business) private readonly businesses: Repository<Business>,
    @InjectRepository(CheckIn) private readonly checkIns: Repository<CheckIn>,
    private readonly ledger: LedgerService,
    private readonly reglages: ReglagesService,
    private readonly photos: PhotosService,
  ) {}

  // --- Côté commerçant -----------------------------------------------------

  async creer(businessId: string, dto: CreerPubliciteDto): Promise<Publicite> {
    const debut = new Date(dto.debutLe);
    const fin = new Date(dto.finLe);

    if (Number.isNaN(debut.getTime()) || Number.isNaN(fin.getTime())) {
      throw new BadRequestException('Les dates de début et de fin ne sont pas valides.');
    }
    if (fin <= debut) {
      throw new BadRequestException('La fin de l’offre doit venir après son début.');
    }

    const dureeMax = this.reglages.entier('publicite.dureeMaximaleJours');
    if ((fin.getTime() - debut.getTime()) / JOUR_MS > dureeMax) {
      throw new BadRequestException(
        `Une offre ne peut pas durer plus de ${dureeMax} jours. Au-delà, elle finit oubliée et brouille la recherche.`,
      );
    }

    const cout = arrondir(
      dto.coutParOuverture ?? this.reglages.nombre('publicite.coutParOuvertureParDefaut'),
    );
    const budget = arrondir(dto.budgetJetons);

    if (cout <= 0) {
      throw new BadRequestException("Le coût d'une ouverture doit être supérieur à zéro.");
    }
    if (budget < cout) {
      throw new BadRequestException(
        `Le budget (${budget}) doit couvrir au moins une ouverture (${cout} jetons).`,
      );
    }

    return this.publicites.save(
      this.publicites.create({
        businessId,
        titre: dto.titre,
        description: dto.description,
        motsCles: dto.motsCles ?? '',
        offre: dto.offre,
        reductionPourcent: dto.reductionPourcent ?? null,
        reductionJetons: dto.reductionJetons ?? null,
        debutLe: debut,
        finLe: fin,
        active: true,
        budgetJetons: budget,
        depenseJetons: 0,
        coutParOuverture: cout,
      }),
    );
  }

  /** Les offres d'un commerçant, avec ce qu'elles ont donné. */
  async listerDuCommerce(businessId: string) {
    const offres = await this.publicites.find({
      where: { businessId },
      order: { createdAt: 'DESC' },
    });
    if (offres.length === 0) {
      return [];
    }

    const ids = offres.map((o) => o.id);
    const [ouvertures, photos] = await Promise.all([
      this.ouvertures.find({ where: { publiciteId: In(ids) } }),
      this.photos.versions('publicite', ids),
    ]);

    return offres.map((offre) => {
      const siennes = ouvertures.filter((o) => o.publiciteId === offre.id);
      return {
        ...offre,
        photoVersion: photos.get(offre.id) ?? null,
        enCours: this.enCours(offre),
        nombreOuvertures: siennes.length,
        nombrePayees: siennes.filter((o) => o.paye).length,
        nombreBonsUtilises: siennes.filter((o) => o.utiliseLe).length,
        budgetRestant: arrondir(offre.budgetJetons - offre.depenseJetons),
      };
    });
  }

  async basculerActive(publiciteId: string, active: boolean): Promise<Publicite> {
    const offre = await this.trouver(publiciteId);
    await this.publicites.update({ id: publiciteId }, { active });
    return { ...offre, active };
  }

  // --- Côté joueur ---------------------------------------------------------

  /**
   * La recherche.
   *
   * Le tri par pertinence se fait en mémoire, pas en base : il faut comparer
   * quatre champs avec des poids différents, ce qu'aucune requête SQL simple
   * ne sait faire. C'est tenable tant que le nombre d'offres EN COURS reste
   * de l'ordre de quelques milliers — ce qui laisse de la marge. Le jour où
   * ça ne suffira plus, il faudra un vrai index de recherche ; ce n'est pas
   * une raison d'en installer un aujourd'hui.
   */
  async rechercher(requete: string, playerId?: string) {
    const maintenant = new Date();
    const enCours = await this.publicites.find({
      where: { active: true, debutLe: LessThanOrEqual(maintenant), finLe: MoreThanOrEqual(maintenant) },
    });

    const avecBudget = enCours.filter((o) => o.budgetJetons - o.depenseJetons >= 0);
    if (avecBudget.length === 0) {
      return [];
    }

    const nomsParLieu = await this.nomsDesCommerces(avecBudget.map((o) => o.businessId));

    const terme = requete?.trim() ?? '';
    const classees = avecBudget
      .map((offre) => ({
        offre,
        score: terme
          ? pertinence(
              {
                titre: offre.titre,
                motsCles: offre.motsCles,
                description: offre.description,
                nomDuCommerce: nomsParLieu.get(offre.businessId) ?? '',
              },
              terme,
            )
          : 1,
      }))
      // Sans recherche, on montre tout ; avec, on ne montre que ce qui répond.
      .filter((x) => x.score > 0)
      .sort((a, b) => b.score - a.score || b.offre.createdAt.getTime() - a.offre.createdAt.getTime());

    return this.habiller(
      classees.map((x) => x.offre),
      nomsParLieu,
      playerId,
    );
  }

  /**
   * Ouvrir une offre : la lire, et être payé si l'ouverture est crédible.
   *
   * L'offre s'affiche TOUJOURS. Ce qui varie, c'est si de l'argent bouge —
   * et la raison est toujours dite au joueur.
   */
  async ouvrir(publiciteId: string, playerId: string) {
    const offre = await this.trouver(publiciteId);
    const business = await this.businesses.findOne({ where: { id: offre.businessId } });

    const [dejaOuverte, payeesAujourdhui, derniereVisite] = await Promise.all([
      this.ouvertures.findOne({ where: { publiciteId, playerId } }),
      this.comptePayeesAujourdhui(playerId),
      this.derniereVisite(playerId),
    ]);

    const verdict = verdictDePaiement({
      publiciteEnCours: this.enCours(offre),
      budgetRestant: arrondir(offre.budgetJetons - offre.depenseJetons),
      coutDeLOuverture: offre.coutParOuverture,
      dejaPaye: Boolean(dejaOuverte?.paye),
      ouverturesPayeesAujourdhui: payeesAujourdhui,
      plafondQuotidien: this.reglages.entier('publicite.ouverturesPayeesParJour'),
      joursDepuisDerniereVisite: derniereVisite,
      ancienneteVisiteMaximale: this.reglages.entier('publicite.ancienneteVisiteJours'),
      estSonPropreCommerce: business?.userId === playerId,
    });

    let montantVerse = dejaOuverte?.montantVerse ?? 0;

    if (verdict.paye && business) {
      montantVerse = await this.verser(offre, business.userId, playerId);
    }

    // La ligne d'ouverture est aussi le bon de réduction : on la crée à la
    // première ouverture et on ne la remplace jamais, pour garder la date
    // d'obtention du bon.
    const ouverture =
      dejaOuverte ??
      (await this.ouvertures.save(
        this.ouvertures.create({
          publiciteId,
          playerId,
          ouverteLe: new Date(),
          montantVerse,
          paye: verdict.paye,
          raisonNonPaye: verdict.paye ? null : verdict.code,
        }),
      ));

    if (dejaOuverte && verdict.paye) {
      await this.ouvertures.update(
        { id: dejaOuverte.id },
        { paye: true, montantVerse, raisonNonPaye: null },
      );
    }

    return {
      offre: (await this.habiller([offre], await this.nomsDesCommerces([offre.businessId]), playerId))[0],
      paiement: verdict.paye
        ? { paye: true as const, montant: montantVerse }
        : { paye: false as const, raison: verdict.raison },
      bonObtenuLe: ouverture.ouverteLe,
    };
  }

  /** Les bons qu'un joueur a en poche, et ceux qu'il a déjà utilisés. */
  async mesBons(playerId: string) {
    const ouvertures = await this.ouvertures.find({
      where: { playerId },
      order: { ouverteLe: 'DESC' },
    });
    if (ouvertures.length === 0) {
      return [];
    }

    const offres = await this.publicites.find({
      where: { id: In(ouvertures.map((o) => o.publiciteId)) },
    });
    const parId = new Map(offres.map((o) => [o.id, o]));
    const noms = await this.nomsDesCommerces(offres.map((o) => o.businessId));
    const photos = await this.photos.versions('publicite', offres.map((o) => o.id));

    return ouvertures
      .map((ouverture) => {
        const offre = parId.get(ouverture.publiciteId);
        if (!offre) return null;
        return {
          id: ouverture.id,
          publiciteId: offre.id,
          titre: offre.titre,
          offre: offre.offre,
          reduction: libelleReduction({
            pourcent: offre.reductionPourcent,
            jetons: offre.reductionJetons,
          }),
          commerce: noms.get(offre.businessId) ?? '(commerce supprimé)',
          businessId: offre.businessId,
          photoVersion: photos.get(offre.id) ?? null,
          obtenuLe: ouverture.ouverteLe,
          utiliseLe: ouverture.utiliseLe,
          finLe: offre.finLe,
          // Un bon ne vaut que pendant la période de l'offre : c'est le
          // commerçant qui s'est engagé sur cette durée.
          valable: !ouverture.utiliseLe && this.enCours(offre),
        };
      })
      .filter((x): x is NonNullable<typeof x> => x !== null);
  }

  // --- Outils --------------------------------------------------------------

  private async trouver(id: string): Promise<Publicite> {
    const offre = await this.publicites.findOne({ where: { id } });
    if (!offre) {
      throw new NotFoundException('Offre introuvable.');
    }
    return offre;
  }

  /** Vérifie qu'une offre appartient bien au commerce visé. */
  async verifierAppartenance(publiciteId: string, businessId: string): Promise<Publicite> {
    const offre = await this.trouver(publiciteId);
    if (offre.businessId !== businessId) {
      throw new ForbiddenException("Cette offre n'est pas la tienne.");
    }
    return offre;
  }

  private enCours(offre: Publicite): boolean {
    const maintenant = Date.now();
    return (
      offre.active &&
      new Date(offre.debutLe).getTime() <= maintenant &&
      new Date(offre.finLe).getTime() >= maintenant &&
      offre.budgetJetons - offre.depenseJetons >= offre.coutParOuverture
    );
  }

  private async nomsDesCommerces(ids: string[]): Promise<Map<string, string>> {
    if (ids.length === 0) return new Map();
    const lieux = await this.businesses.find({ where: { id: In([...new Set(ids)]) } });
    return new Map(lieux.map((l) => [l.id, l.nom]));
  }

  /** Combien d'offres ont déjà été PAYÉES à ce joueur depuis minuit. */
  private async comptePayeesAujourdhui(playerId: string): Promise<number> {
    const minuit = new Date();
    minuit.setHours(0, 0, 0, 0);
    return this.ouvertures.count({
      where: { playerId, paye: true, ouverteLe: MoreThanOrEqual(minuit) },
    });
  }

  /** Depuis combien de jours ce joueur n'a pas validé de venue. */
  private async derniereVisite(playerId: string): Promise<number | null> {
    const derniere = await this.checkIns.findOne({
      where: { playerId },
      order: { createdAt: 'DESC' },
    });
    if (!derniere) {
      return null;
    }
    return Math.floor((Date.now() - new Date(derniere.createdAt).getTime()) / JOUR_MS);
  }

  /**
   * Le mouvement d'argent : du commerçant vers le joueur, commission gardée.
   *
   * Deux mouvements plutôt qu'un, pour que le registre dise exactement où va
   * chaque centime — c'est la même mécanique que pour le ciblage.
   */
  private async verser(
    offre: Publicite,
    commercantUserId: string,
    playerId: string,
  ): Promise<number> {
    const part = this.reglages.nombre('publicite.partJoueur');
    const versJoueur = arrondir(offre.coutParOuverture * part);
    const versPlateforme = arrondir(offre.coutParOuverture - versJoueur);

    const [compteCommercant, compteJoueur, comptePlateforme] = await Promise.all([
      this.ledger.compteDe('commercant', commercantUserId),
      this.ledger.compteDe('joueur', playerId),
      this.ledger.compteDe('plateforme'),
    ]);

    if (versJoueur > 0) {
      await this.ledger.deplacer(compteCommercant, compteJoueur, versJoueur, {
        motif: 'offre_vue_joueur',
        reference: offre.id,
        detail: offre.titre,
      });
    }
    if (versPlateforme > 0) {
      await this.ledger.deplacer(compteCommercant, comptePlateforme, versPlateforme, {
        motif: 'offre_vue_commission',
        reference: offre.id,
        detail: offre.titre,
      });
    }

    await this.publicites.update(
      { id: offre.id },
      { depenseJetons: arrondir(offre.depenseJetons + offre.coutParOuverture) },
    );

    return versJoueur;
  }

  /** Met une offre en forme pour l'affichage, du point de vue d'un joueur. */
  private async habiller(
    offres: Publicite[],
    noms: Map<string, string>,
    playerId?: string,
  ) {
    const photos = await this.photos.versions('publicite', offres.map((o) => o.id));
    const miennes = playerId
      ? await this.ouvertures.find({
          where: { playerId, publiciteId: In(offres.map((o) => o.id)) },
        })
      : [];
    const parPublicite = new Map(miennes.map((o) => [o.publiciteId, o]));

    return offres.map((offre) => {
      const mienne = parPublicite.get(offre.id);
      return {
        id: offre.id,
        titre: offre.titre,
        description: offre.description,
        offre: offre.offre,
        reduction: libelleReduction({
          pourcent: offre.reductionPourcent,
          jetons: offre.reductionJetons,
        }),
        commerce: noms.get(offre.businessId) ?? '(commerce supprimé)',
        businessId: offre.businessId,
        photoVersion: photos.get(offre.id) ?? null,
        finLe: offre.finLe,
        gainPossible: arrondir(
          offre.coutParOuverture * this.reglages.nombre('publicite.partJoueur'),
        ),
        dejaOuverte: Boolean(mienne),
        dejaPayee: Boolean(mienne?.paye),
      };
    });
  }
}
