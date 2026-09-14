import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { Business } from '../businesses/business.entity';
import { CheckIn } from '../checkins/checkin.entity';
import { LedgerService } from '../ledger/ledger.service';
import { PlayerProfile } from '../players/player-profile.entity';
import { PlayerProgression } from '../progression/player-progression.entity';
import { PhotosService } from '../photos/photos.service';
import { User, UserType } from '../users/user.entity';
import { MissionValidation } from '../validations/mission-validation.entity';

export interface LigneCompte {
  id: string;
  pseudo: string;
  email: string;
  type: UserType;
  administrateur: boolean;
  createdAt: Date;
  soldeJetons: number;
  /** Joueurs seulement. */
  niveau: number | null;
  xpTotal: number | null;
  questionnaireFait: boolean;
  /** Commerçants seulement. */
  etablissement: string | null;
  photoVersion: number | null;
}

@Injectable()
export class ComptesService {
  constructor(
    @InjectRepository(User) private readonly users: Repository<User>,
    @InjectRepository(PlayerProfile) private readonly profiles: Repository<PlayerProfile>,
    @InjectRepository(PlayerProgression)
    private readonly progressions: Repository<PlayerProgression>,
    @InjectRepository(Business) private readonly businesses: Repository<Business>,
    @InjectRepository(CheckIn) private readonly checkIns: Repository<CheckIn>,
    @InjectRepository(MissionValidation)
    private readonly validations: Repository<MissionValidation>,
    private readonly ledger: LedgerService,
    private readonly photos: PhotosService,
  ) {}

  async lister(recherche?: string, type?: string): Promise<LigneCompte[]> {
    const tous = await this.users.find({ order: { createdAt: 'DESC' } });

    const terme = recherche?.trim().toLowerCase();
    const filtres = tous.filter((user) => {
      if (type === 'particulier' && user.type !== UserType.PARTICULIER) return false;
      if (type === 'commercant' && user.type !== UserType.COMMERCANT) return false;
      if (type === 'administrateur' && !user.administrateur) return false;
      if (!terme) return true;
      return (
        user.pseudo.toLowerCase().includes(terme) || user.email.toLowerCase().includes(terme)
      );
    });

    if (filtres.length === 0) {
      return [];
    }

    const ids = filtres.map((u) => u.id);
    const [profils, progressions, etablissements, photos] = await Promise.all([
      this.profiles.find({ where: { userId: In(ids) } }),
      this.progressions.find({ where: { playerId: In(ids) } }),
      this.businesses.find({ where: { userId: In(ids) } }),
      this.photos.versions('joueur', ids),
    ]);

    const profilPar = new Map(profils.map((p) => [p.userId, p]));
    const progressionPar = new Map(progressions.map((p) => [p.playerId, p]));
    const etablissementPar = new Map(etablissements.map((b) => [b.userId, b]));

    // Un seul aller-retour vers le registre pour tout le monde, plutôt qu'un
    // par ligne : une liste de cent comptes ferait cent requêtes.
    const soldes = await this.soldesDe(filtres);

    return filtres.map((user) => {
      const joueur = user.type === UserType.PARTICULIER;
      const progression = progressionPar.get(user.id);

      return {
        id: user.id,
        pseudo: user.pseudo,
        email: user.email,
        type: user.type,
        administrateur: Boolean(user.administrateur),
        createdAt: user.createdAt,
        soldeJetons: soldes.get(user.id) ?? 0,
        niveau: joueur ? progression?.niveauActuel ?? 1 : null,
        xpTotal: joueur ? progression?.xpTotal ?? 0 : null,
        questionnaireFait: Boolean(profilPar.get(user.id)?.questionnaireCompletedAt),
        etablissement: etablissementPar.get(user.id)?.nom ?? null,
        photoVersion: photos.get(user.id) ?? null,
      };
    });
  }

  private async soldesDe(users: User[]): Promise<Map<string, number>> {
    const soldes = new Map<string, number>();

    await Promise.all(
      users.map(async (user) => {
        const type = user.type === UserType.COMMERCANT ? 'commercant' : 'joueur';
        soldes.set(user.id, await this.ledger.solde(type, user.id));
      }),
    );

    return soldes;
  }

  /** La fiche complète d'un compte : qui il est, ce qu'il a fait, ce qu'il a. */
  async detail(id: string) {
    const user = await this.users.findOne({ where: { id } });
    if (!user) {
      throw new NotFoundException('Compte introuvable.');
    }

    const joueur = user.type === UserType.PARTICULIER;
    const typeCompte = joueur ? 'joueur' : 'commercant';
    const compte = await this.ledger.compteDe(typeCompte, user.id);

    const [profil, progression, etablissement, visites, validations, mouvements] =
      await Promise.all([
        this.profiles.findOne({ where: { userId: id } }),
        this.progressions.findOne({ where: { playerId: id } }),
        this.businesses.findOne({ where: { userId: id } }),
        joueur ? this.checkIns.count({ where: { playerId: id } }) : Promise.resolve(0),
        joueur ? this.validations.count({ where: { playerId: id } }) : Promise.resolve(0),
        this.ledger.historique(compte, 30),
      ]);

    return {
      compte: {
        id: user.id,
        pseudo: user.pseudo,
        email: user.email,
        type: user.type,
        administrateur: Boolean(user.administrateur),
        createdAt: user.createdAt,
      },
      profil: profil
        ? {
            explorateur: profil.scoreExplorateur,
            accomplisseur: profil.scoreAccomplisseur,
            competiteur: profil.scoreCompetiteur,
            socialisateur: profil.scoreSocialisateur,
            questionnaireFait: Boolean(profil.questionnaireCompletedAt),
          }
        : null,
      progression: progression
        ? { niveau: progression.niveauActuel, xpTotal: progression.xpTotal }
        : null,
      etablissement: etablissement ? { id: etablissement.id, nom: etablissement.nom } : null,
      activite: { visites, validations },
      jetons: { solde: compte.solde, mouvements },
    };
  }

  /**
   * Accorde ou retire le droit d'administrer.
   *
   * Deux verrous, qui évitent tous les deux la même catastrophe : se retrouver
   * devant un back-office dont plus personne n'a la clé.
   */
  async changerAdministration(
    id: string,
    accorder: boolean,
    demandeurId: string,
  ): Promise<{ pseudo: string; email: string; administrateur: boolean }> {
    const user = await this.users.findOne({ where: { id } });
    if (!user) {
      throw new NotFoundException('Compte introuvable.');
    }

    if (!accorder) {
      if (id === demandeurId) {
        throw new BadRequestException(
          "Vous ne pouvez pas retirer vos propres droits : vous seriez aussitôt mis dehors. Demandez à un autre administrateur de le faire.",
        );
      }

      const restants = await this.users.count({ where: { administrateur: true } });
      if (restants <= 1) {
        throw new BadRequestException(
          "C'est le dernier administrateur : lui retirer ses droits fermerait l'espace d'administration à tout le monde. Nommez d'abord quelqu'un d'autre.",
        );
      }
    }

    if (Boolean(user.administrateur) === accorder) {
      return { pseudo: user.pseudo, email: user.email, administrateur: accorder };
    }

    await this.users.update({ id }, { administrateur: accorder });
    return { pseudo: user.pseudo, email: user.email, administrateur: accorder };
  }
}
