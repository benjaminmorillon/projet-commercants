import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { Business } from '../businesses/business.entity';
import { Compte } from '../ledger/compte.entity';
import { arrondir, TypeCompte } from '../ledger/ledger-rules';
import { LedgerService } from '../ledger/ledger.service';
import { User } from '../users/user.entity';

export interface LigneRegistre {
  id: string;
  type: TypeCompte;
  /** Qui c'est, en clair : un pseudo, un nom d'établissement, ou la plateforme. */
  nom: string;
  proprietaireId: string | null;
  solde: number;
}

@Injectable()
export class RegistreService {
  constructor(
    @InjectRepository(Compte) private readonly comptes: Repository<Compte>,
    @InjectRepository(User) private readonly users: Repository<User>,
    @InjectRepository(Business) private readonly businesses: Repository<Business>,
    private readonly ledger: LedgerService,
  ) {}

  private static readonly NOMS_TECHNIQUES: Record<string, string> = {
    plateforme: 'La plateforme',
    cause: 'Les causes soutenues',
  };

  async etat() {
    const comptes = await this.comptes.find();

    const proprietaires = comptes.map((c) => c.proprietaireId).filter((x): x is string => !!x);
    const [users, etablissements] = await Promise.all([
      proprietaires.length ? this.users.find({ where: { id: In(proprietaires) } }) : [],
      proprietaires.length
        ? this.businesses.find({ where: { userId: In(proprietaires) } })
        : [],
    ]);

    const pseudoPar = new Map(users.map((u) => [u.id, u.pseudo]));
    const etablissementPar = new Map(etablissements.map((b) => [b.userId, b.nom]));

    const lignes: LigneRegistre[] = comptes.map((compte) => ({
      id: compte.id,
      type: compte.type,
      nom: compte.proprietaireId
        ? compte.type === 'commercant'
          ? etablissementPar.get(compte.proprietaireId) ??
            pseudoPar.get(compte.proprietaireId) ??
            '(compte supprimé)'
          : pseudoPar.get(compte.proprietaireId) ?? '(compte supprimé)'
        : RegistreService.NOMS_TECHNIQUES[compte.type] ?? compte.type,
      proprietaireId: compte.proprietaireId,
      solde: arrondir(compte.solde),
    }));

    // Le total par famille de comptes : c'est ce qui permet de voir d'un coup
    // d'œil où sont les jetons.
    const parType = lignes.reduce((acc, ligne) => {
      acc.set(ligne.type, arrondir((acc.get(ligne.type) ?? 0) + ligne.solde));
      return acc;
    }, new Map<TypeCompte, number>());

    const coherence = await this.ledger.verifierCoherence();

    return {
      lignes: lignes.sort((a, b) => b.solde - a.solde),
      totaux: {
        joueurs: parType.get('joueur') ?? 0,
        commercants: parType.get('commercant') ?? 0,
        plateforme: parType.get('plateforme') ?? 0,
        causes: parType.get('cause') ?? 0,
        enCirculation: arrondir(lignes.reduce((somme, l) => somme + l.solde, 0)),
      },
      coherence,
    };
  }

  async mouvementsDe(compteId: string, limite = 60) {
    const compte = await this.comptes.findOne({ where: { id: compteId } });
    if (!compte) {
      throw new NotFoundException('Compte de jetons introuvable.');
    }
    return { solde: arrondir(compte.solde), mouvements: await this.ledger.historique(compte, limite) };
  }

  /**
   * Corrige le solde d'un compte.
   *
   * Jamais en retouchant le solde : toujours par un mouvement, avec ses deux
   * extrémités, sa raison écrite et sa trace. C'est ce qui fait qu'un registre
   * reste vérifiable — `verifierCoherence()` recalcule chaque solde à partir
   * des mouvements, et une retouche directe le ferait diverger aussitôt.
   *
   *  - créditer : la plateforme émet les jetons, comme pour une récompense ;
   *  - retirer  : ils retournent au compte de la plateforme.
   */
  async corriger(options: {
    compteId: string;
    sens: 'crediter' | 'retirer';
    montant: number;
    raison: string;
  }): Promise<{ nom: string; solde: number; montant: number; sens: string }> {
    const raison = options.raison?.trim() ?? '';
    if (raison.length < 5) {
      // Une correction sans motif écrit est invérifiable six mois plus tard.
      throw new BadRequestException(
        'Écrivez la raison de la correction (au moins 5 caractères) : elle restera au journal.',
      );
    }

    const compte = await this.comptes.findOne({ where: { id: options.compteId } });
    if (!compte) {
      throw new NotFoundException('Compte de jetons introuvable.');
    }

    const montant = arrondir(Number(options.montant));
    if (!Number.isFinite(montant) || montant <= 0) {
      throw new BadRequestException(
        'Indiquez un montant positif, et choisissez « créditer » ou « retirer » pour le sens.',
      );
    }

    const plateforme = await this.ledger.compteDe('plateforme');

    if (options.sens === 'crediter') {
      // Émission : la plateforme crée les jetons qu'elle aurait dû verser.
      await this.ledger.emettre(compte, montant, {
        motif: 'correction_administrative',
        detail: raison,
      });
    } else {
      // Retrait : les jetons reviennent à la plateforme. `deplacer` refuse
      // si le compte ne les a pas — on ne peut pas retirer ce qui n'est
      // pas là, et c'est très bien ainsi.
      await this.ledger.deplacer(compte, plateforme, montant, {
        motif: 'correction_administrative',
        detail: raison,
      });
    }

    const aJour = await this.comptes.findOne({ where: { id: options.compteId } });
    const etat = await this.etat();
    const ligne = etat.lignes.find((l) => l.id === options.compteId);

    return {
      nom: ligne?.nom ?? 'Compte',
      solde: arrondir(aJour?.solde ?? 0),
      montant,
      sens: options.sens,
    };
  }
}
