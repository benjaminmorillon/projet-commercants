import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { randomInt } from 'crypto';
import * as QRCode from 'qrcode';
import { In, IsNull, LessThan, Repository } from 'typeorm';
import { ReglagesService } from '../admin/reglages.service';
import { Business } from '../businesses/business.entity';
import { CheckIn } from '../checkins/checkin.entity';
import { CheckinsService } from '../checkins/checkins.service';
import { PhotosService } from '../photos/photos.service';
import { User, UserType } from '../users/user.entity';
import {
  DUREE_CODE_SECONDES,
  codeLisible,
  fabriquerCode,
  lireCodeSaisi,
  secondesRestantes,
  verdictDuScan,
} from './code-presence';
import { CodePresence } from './code-presence.entity';
import { RetraitClient } from './retrait-client.entity';

const JOUR_MS = 24 * 60 * 60 * 1000;

export interface MonCode {
  code: string;
  lisible: string;
  expireLe: Date;
  secondesRestantes: number;
  /**
   * Le QR lui-même, en clair dans la réponse.
   *
   * Il serait plus élégant de le servir à son adresse, comme les photos —
   * mais une balise image ne joint pas d'elle-même le jeton de session, et
   * un code de présence ne peut pas être public. Les contournements possibles
   * (en-têtes sur l'image) ne marchent pas partout : sur l'application web,
   * ils sont ignorés, et le joueur se retrouve devant un carré blanc.
   *
   * Une image de 3 Ko dans le JSON coûte moins cher que ce piège-là.
   */
  qr: string;
}

@Injectable()
export class PresenceService {
  constructor(
    @InjectRepository(CodePresence) private readonly codes: Repository<CodePresence>,
    @InjectRepository(User) private readonly users: Repository<User>,
    @InjectRepository(Business) private readonly businesses: Repository<Business>,
    @InjectRepository(CheckIn) private readonly checkIns: Repository<CheckIn>,
    @InjectRepository(RetraitClient) private readonly retraits: Repository<RetraitClient>,
    private readonly checkins: CheckinsService,
    private readonly photos: PhotosService,
    private readonly reglages: ReglagesService,
  ) {}

  private duree(): number {
    return this.reglages.entier('presence.dureeCodeSecondes') || DUREE_CODE_SECONDES;
  }

  // --- Côté joueur ---------------------------------------------------------

  /**
   * Le code du moment.
   *
   * On réutilise celui qui est encore valable plutôt que d'en créer un à
   * chaque affichage : sinon le code changerait sous les yeux du commerçant
   * pendant qu'il le tape, simplement parce que le joueur a rafraîchi son
   * écran.
   */
  async monCode(playerId: string): Promise<MonCode> {
    const maintenant = new Date();

    const encoreBon = await this.codes.findOne({
      where: { playerId, utiliseLe: IsNull() },
      order: { creeLe: 'DESC' },
    });

    if (encoreBon && encoreBon.expireLe.getTime() > maintenant.getTime()) {
      return this.habiller(encoreBon, maintenant);
    }

    return this.habiller(await this.creer(playerId, maintenant), maintenant);
  }

  /** Un code neuf, à la demande (le joueur a laissé le sien expirer). */
  async renouveler(playerId: string): Promise<MonCode> {
    const maintenant = new Date();
    return this.habiller(await this.creer(playerId, maintenant), maintenant);
  }

  private async habiller(ligne: CodePresence, maintenant: Date): Promise<MonCode> {
    return {
      code: ligne.code,
      lisible: codeLisible(ligne.code),
      expireLe: ligne.expireLe,
      secondesRestantes: secondesRestantes(ligne.expireLe, maintenant),
      qr: await this.dessinerQr(ligne.code),
    };
  }

  /**
   * Le QR, en image.
   *
   * Correction d'erreur « M » : lisible même un peu sali ou reflété par
   * l'écran, sans gonfler le nombre de modules au point de le rendre
   * difficile à viser.
   */
  private dessinerQr(code: string): Promise<string> {
    return QRCode.toDataURL(code, {
      errorCorrectionLevel: 'M',
      width: 512,
      margin: 2,
      color: { dark: '#0b0913ff', light: '#ffffffff' },
    });
  }

  private async creer(playerId: string, maintenant: Date): Promise<CodePresence> {
    await this.menageDesVieuxCodes();

    // `randomInt` et non `Math.random` : un générateur devinable rendrait
    // les codes devinables avec lui.
    const ligne = this.codes.create({
      code: fabriquerCode((borne) => randomInt(borne)),
      playerId,
      creeLe: maintenant,
      expireLe: new Date(maintenant.getTime() + this.duree() * 1000),
      utiliseLe: null,
      businessId: null,
    });

    return this.codes.save(ligne);
  }

  /**
   * Les codes d'hier ne servent plus à rien : ni à scanner (expirés), ni à
   * l'historique (la venue, elle, est enregistrée ailleurs). On les efface
   * pour que la table ne grossisse pas indéfiniment.
   */
  private async menageDesVieuxCodes(): Promise<void> {
    await this.codes.delete({ expireLe: LessThan(new Date(Date.now() - JOUR_MS)) });
  }

  // --- Côté commerçant -----------------------------------------------------

  /**
   * Le scan.
   *
   * C'est ce geste qui remplace l'ancien pointage GPS. Il produit exactement
   * la même chose qu'avant — une venue enregistrée — pour que tout ce qui en
   * dépend (l'XP, les quartiers levés sur la carte, le rééquilibrage, la
   * règle anti-fraude des offres, la validation des missions sur place)
   * continue de fonctionner sans être retouché.
   */
  async scanner(businessId: string, saisi: unknown) {
    const lecture = lireCodeSaisi(saisi);
    if (!lecture.ok) {
      throw new BadRequestException(lecture.raison);
    }

    const commerce = await this.businesses.findOne({ where: { id: businessId } });
    if (!commerce) {
      throw new NotFoundException('Lieu introuvable.');
    }

    const maintenant = new Date();
    const ligne = await this.codes.findOne({ where: { code: lecture.code } });

    const verdict = verdictDuScan({
      trouve: Boolean(ligne),
      expireLe: ligne?.expireLe ?? null,
      dejaUtilise: Boolean(ligne?.utiliseLe),
      estSonPropreCommerce: ligne?.playerId === commerce.userId,
      maintenant,
    });

    if (!verdict.accepte) {
      throw new BadRequestException(verdict.raison);
    }

    const code = ligne as CodePresence;

    // On consomme le code AVANT d'enregistrer la venue : si l'enregistrement
    // échoue, un code brûlé pour rien est moins grave qu'un code encore
    // valable qui aurait déjà produit une venue.
    await this.codes.update({ id: code.id }, { utiliseLe: maintenant, businessId });

    const passage = await this.checkins.enregistrerPassage(businessId, code.playerId);
    const joueur = await this.users.findOne({ where: { id: code.playerId } });
    const visites = await this.checkIns.count({
      where: { playerId: code.playerId, businessId },
    });

    return {
      joueur: {
        id: code.playerId,
        pseudo: joueur?.pseudo ?? 'Joueur',
        photoVersion: (await this.photos.versions('joueur', [code.playerId])).get(code.playerId) ?? null,
      },
      premiereVisite: visites <= 1,
      visites,
      zoneDecouverte: (passage as { zoneDecouverte?: unknown }).zoneDecouverte ?? null,
    };
  }

  /**
   * Les commerces qui connaissent ce joueur, et où il en est avec chacun.
   *
   * L'écran « Mon code » promet au joueur qu'il pourra sortir de ces listes.
   * Une promesse qu'on ne peut pas tenir depuis l'interface n'en est pas une :
   * voilà de quoi la tenir.
   */
  async mesCommerces(playerId: string) {
    const [visites, retraits] = await Promise.all([
      this.checkIns.find({ where: { playerId }, order: { createdAt: 'ASC' } }),
      this.retraits.find({ where: { playerId } }),
    ]);
    if (visites.length === 0) {
      return [];
    }

    const sortis = new Set(retraits.map((r) => r.businessId));
    const parCommerce = new Map<string, { premiere: Date; derniere: Date; visites: number }>();

    for (const visite of visites) {
      const connu = parCommerce.get(visite.businessId);
      if (connu) {
        connu.derniere = visite.createdAt;
        connu.visites += 1;
      } else {
        parCommerce.set(visite.businessId, {
          premiere: visite.createdAt,
          derniere: visite.createdAt,
          visites: 1,
        });
      }
    }

    const ids = [...parCommerce.keys()];
    const lieux = await this.businesses.find({ where: { id: In(ids) } });
    const noms = new Map(lieux.map((l) => [l.id, l.nom]));

    return ids
      .map((id) => {
        const compte = parCommerce.get(id) as { premiere: Date; derniere: Date; visites: number };
        return {
          businessId: id,
          nom: noms.get(id) ?? '(commerce supprimé)',
          premiereVisite: compte.premiere,
          derniereVisite: compte.derniere,
          visites: compte.visites,
          retire: sortis.has(id),
        };
      })
      .sort((a, b) => b.derniereVisite.getTime() - a.derniereVisite.getTime());
  }

  /** Sortir de la liste des clients d'un commerce, ou y revenir. */
  async changerMonRetrait(playerId: string, businessId: string, retire: boolean) {
    const existant = await this.retraits.findOne({ where: { playerId, businessId } });

    if (retire && !existant) {
      await this.retraits.save(this.retraits.create({ playerId, businessId }));
    } else if (!retire && existant) {
      await this.retraits.delete({ id: existant.id });
    }

    return { businessId, retire };
  }

  /** Les joueurs qu'un commerce a le droit de prévenir. */
  async destinatairesDesAnnonces(businessId: string): Promise<string[]> {
    return (await this.clients(businessId)).map((c) => c.playerId);
  }

  /**
   * Les clients d'un commerce : qui est venu, quand, combien de fois.
   *
   * C'est la carte de fidélité que le commerçant n'avait pas, et que le
   * client n'a pas eu à demander. Elle sert aussi de liste de ciblage pour
   * ses offres.
   */
  async clients(businessId: string) {
    const [visites, retraits] = await Promise.all([
      this.checkIns.find({ where: { businessId }, order: { createdAt: 'ASC' } }),
      this.retraits.find({ where: { businessId } }),
    ]);
    if (visites.length === 0) {
      return [];
    }

    // Ceux qui ont demandé à ne plus figurer dans cette liste en sortent —
    // sans perdre leurs venues, qui appartiennent à leur jeu à eux.
    const sortis = new Set(retraits.map((r) => r.playerId));

    const parJoueur = new Map<
      string,
      { premiereVisite: Date; derniereVisite: Date; visites: number }
    >();

    for (const visite of visites) {
      if (sortis.has(visite.playerId)) continue;
      const connu = parJoueur.get(visite.playerId);
      if (connu) {
        connu.derniereVisite = visite.createdAt;
        connu.visites += 1;
      } else {
        parJoueur.set(visite.playerId, {
          premiereVisite: visite.createdAt,
          derniereVisite: visite.createdAt,
          visites: 1,
        });
      }
    }

    const ids = [...parJoueur.keys()];
    if (ids.length === 0) {
      return [];
    }

    const [joueurs, photos] = await Promise.all([
      this.users.find({ where: ids.map((id) => ({ id })) }),
      this.photos.versions('joueur', ids),
    ]);
    const pseudos = new Map(
      joueurs.filter((j) => j.type === UserType.PARTICULIER).map((j) => [j.id, j.pseudo]),
    );

    return ids
      .map((id) => ({
        playerId: id,
        pseudo: pseudos.get(id) ?? 'Joueur',
        photoVersion: photos.get(id) ?? null,
        ...(parJoueur.get(id) as {
          premiereVisite: Date;
          derniereVisite: Date;
          visites: number;
        }),
      }))
      // Les plus fidèles en tête : c'est eux qu'on veut reconnaître.
      .sort(
        (a, b) =>
          b.visites - a.visites ||
          b.derniereVisite.getTime() - a.derniereVisite.getTime(),
      );
  }
}
