import { BadRequestException, Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, In, IsNull, Repository } from 'typeorm';
import { Compte } from './compte.entity';
import {
  arrondir,
  enCentimes,
  libelleMouvement,
  MotifMouvement,
  soldeSuffisant,
  TypeCompte,
  verifierMontant,
} from './ledger-rules';
import { MouvementJeton } from './mouvement.entity';

export interface MouvementLisible {
  id: string;
  sens: 'entree' | 'sortie';
  montant: number;
  libelle: string;
  detail: string | null;
  motif: MotifMouvement;
  reference: string | null;
  createdAt: Date;
}

interface OptionsMouvement {
  motif: MotifMouvement;
  reference?: string | null;
  detail?: string | null;
}

@Injectable()
export class LedgerService implements OnModuleInit {
  private readonly logger = new Logger(LedgerService.name);

  constructor(
    @InjectRepository(Compte)
    private readonly comptes: Repository<Compte>,
    @InjectRepository(MouvementJeton)
    private readonly mouvements: Repository<MouvementJeton>,
    private readonly dataSource: DataSource,
  ) {}

  /**
   * Au démarrage, on vérifie que les soldes correspondent bien au journal.
   * Si un jour ça diverge, on veut l'apprendre dans les logs au boot, pas
   * dans un litige avec un commerçant.
   */
  async onModuleInit(): Promise<void> {
    const { coherent, ecarts } = await this.verifierCoherence();
    if (coherent) {
      this.logger.log('Registre de jetons cohérent.');
    } else {
      this.logger.error(
        `Registre de jetons incohérent : ${ecarts.length} compte(s) en écart. ${JSON.stringify(ecarts)}`,
      );
    }
  }

  /** Le compte de quelqu'un, créé au premier besoin. */
  async compteDe(type: TypeCompte, proprietaireId: string | null = null): Promise<Compte> {
    const existant = await this.comptes.findOne({
      where: { type, proprietaireId: proprietaireId ?? IsNull() },
    });
    if (existant) {
      return existant;
    }
    return this.comptes.save(this.comptes.create({ type, proprietaireId, solde: 0 }));
  }

  compteJoueur(playerId: string): Promise<Compte> {
    return this.compteDe('joueur', playerId);
  }

  compteCommercant(userId: string): Promise<Compte> {
    return this.compteDe('commercant', userId);
  }

  comptePlateforme(): Promise<Compte> {
    return this.compteDe('plateforme', null);
  }

  compteCause(): Promise<Compte> {
    return this.compteDe('cause', null);
  }

  async solde(type: TypeCompte, proprietaireId: string | null = null): Promise<number> {
    return (await this.compteDe(type, proprietaireId)).solde;
  }

  /**
   * Déplace des jetons d'un compte vers un autre.
   *
   * `source` à null = émission (la plateforme crée les jetons d'une
   * récompense). Tout le reste est un vrai transfert, refusé si le compte de
   * départ n'a pas de quoi. L'écriture du mouvement et la mise à jour des deux
   * soldes se font dans une seule transaction : on ne peut pas se retrouver
   * avec un débit sans crédit.
   */
  async deplacer(
    source: Compte | null,
    destination: Compte | null,
    montantBrut: number,
    options: OptionsMouvement,
  ): Promise<MouvementJeton> {
    const montant = arrondir(montantBrut);
    const verification = verifierMontant(montant);
    if (!verification.valide) {
      throw new BadRequestException(verification.raison);
    }
    if (!source && !destination) {
      throw new BadRequestException('Un mouvement doit avoir au moins une extrémité.');
    }

    return this.dataSource.transaction(async (gestionnaire) => {
      const comptes = gestionnaire.getRepository(Compte);

      if (source) {
        // On relit le solde dans la transaction : entre la vérification et
        // l'écriture, une autre requête a pu passer.
        const aJour = await comptes.findOne({ where: { id: source.id } });
        if (!aJour || !soldeSuffisant(aJour.solde, montant)) {
          throw new BadRequestException(
            `Solde insuffisant : ${arrondir(aJour?.solde ?? 0)} jeton(s) disponible(s) pour ${montant}.`,
          );
        }
        aJour.solde = arrondir(aJour.solde - montant);
        aJour.updatedAt = new Date();
        await comptes.save(aJour);
      }

      if (destination) {
        const aJour = await comptes.findOne({ where: { id: destination.id } });
        if (aJour) {
          aJour.solde = arrondir(aJour.solde + montant);
          aJour.updatedAt = new Date();
          await comptes.save(aJour);
        }
      }

      const mouvements = gestionnaire.getRepository(MouvementJeton);
      return mouvements.save(
        mouvements.create({
          compteSourceId: source?.id ?? null,
          compteDestinationId: destination?.id ?? null,
          montant,
          motif: options.motif,
          reference: options.reference ?? null,
          detail: options.detail ?? null,
        }),
      );
    });
  }

  /** Raccourci : la plateforme crée des jetons pour récompenser quelqu'un. */
  async emettre(
    destination: Compte,
    montant: number,
    options: OptionsMouvement,
  ): Promise<MouvementJeton> {
    return this.deplacer(null, destination, montant, options);
  }

  /** L'historique d'un compte, les deux sens mélangés, du plus récent au plus ancien. */
  async historique(compte: Compte, limite = 60): Promise<MouvementLisible[]> {
    const lignes = await this.mouvements.find({
      where: [{ compteSourceId: compte.id }, { compteDestinationId: compte.id }],
      order: { createdAt: 'DESC' },
      take: limite,
    });

    return lignes.map((ligne) => {
      const sens: 'entree' | 'sortie' =
        ligne.compteDestinationId === compte.id ? 'entree' : 'sortie';
      return {
        id: ligne.id,
        sens,
        montant: ligne.montant,
        libelle: libelleMouvement(ligne.motif, sens),
        detail: ligne.detail,
        motif: ligne.motif,
        reference: ligne.reference,
        createdAt: ligne.createdAt,
      };
    });
  }

  /**
   * Contrôle de cohérence : le solde affiché de chaque compte doit être égal
   * à la somme de ses mouvements. Sert de filet — si ça diverge un jour, on
   * le saura au lieu de le découvrir dans un litige.
   */
  async verifierCoherence(): Promise<{
    coherent: boolean;
    ecarts: { compteId: string; solde: number; calcule: number }[];
  }> {
    const [comptes, mouvements] = await Promise.all([
      this.comptes.find(),
      this.mouvements.find(),
    ]);

    const calcules = new Map<string, number>();
    comptes.forEach((compte) => calcules.set(compte.id, 0));
    mouvements.forEach((mouvement) => {
      if (mouvement.compteSourceId && calcules.has(mouvement.compteSourceId)) {
        calcules.set(
          mouvement.compteSourceId,
          (calcules.get(mouvement.compteSourceId) as number) - mouvement.montant,
        );
      }
      if (mouvement.compteDestinationId && calcules.has(mouvement.compteDestinationId)) {
        calcules.set(
          mouvement.compteDestinationId,
          (calcules.get(mouvement.compteDestinationId) as number) + mouvement.montant,
        );
      }
    });

    const ecarts = comptes
      .map((compte) => ({
        compteId: compte.id,
        solde: compte.solde,
        calcule: arrondir(calcules.get(compte.id) ?? 0),
      }))
      .filter((ligne) => enCentimes(ligne.solde) !== enCentimes(ligne.calcule));

    return { coherent: ecarts.length === 0, ecarts };
  }

  /** Soldes de plusieurs commerçants d'un coup (tableau de bord, listes). */
  async soldesCommercants(userIds: string[]): Promise<Map<string, number>> {
    if (userIds.length === 0) {
      return new Map();
    }
    const comptes = await this.comptes.find({
      where: { type: 'commercant', proprietaireId: In(userIds) },
    });
    return new Map(comptes.map((c) => [c.proprietaireId as string, c.solde]));
  }
}
