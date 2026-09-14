import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ReglagesService } from '../admin/reglages.service';
import { PlayerProfile } from '../players/player-profile.entity';
import { PlayerProgression } from '../progression/player-progression.entity';
import { MissionValidation } from '../validations/mission-validation.entity';
import {
  Arbre,
  MissionDeLArbre,
  Noeud,
  ReglagesArbre,
  construireArbre,
  multiplicateurDePalier,
  palierDeLaMission,
} from './arbre';
import { Mission } from './mission.entity';

/**
 * L'arbre des missions d'un joueur.
 *
 * Ce service ne décide de rien : il va chercher les quatre ingrédients
 * (le catalogue, ce que le joueur a déjà accompli, son profil, son niveau),
 * puis laisse les fonctions pures de `arbre.ts` faire le travail.
 */
@Injectable()
export class ArbreService {
  constructor(
    @InjectRepository(Mission)
    private readonly missions: Repository<Mission>,
    @InjectRepository(MissionValidation)
    private readonly validations: Repository<MissionValidation>,
    @InjectRepository(PlayerProfile)
    private readonly profils: Repository<PlayerProfile>,
    @InjectRepository(PlayerProgression)
    private readonly progressions: Repository<PlayerProgression>,
    private readonly reglages: ReglagesService,
  ) {}

  /** Les réglages de l'arbre, tels que le back-office les a laissés. */
  private reglagesArbre(): ReglagesArbre {
    return {
      taillePalier: this.reglages.entier('arbre.taillePalier'),
      requisesParPalier: this.reglages.entier('arbre.missionsRequisesParPalier'),
      niveauParVoie: this.reglages.entier('arbre.niveauParVoie'),
      bonusParPalier: this.reglages.nombre('arbre.bonusParPalier'),
      bonusMaximum: this.reglages.nombre('arbre.bonusMaximum'),
    };
  }

  async pourLeJoueur(playerId: string): Promise<Arbre> {
    const [missions, accomplies, profil, progression] = await Promise.all([
      this.missions.find(),
      this.validations.find({
        where: { playerId, statut: 'validee' },
        select: { missionId: true },
      }),
      this.profils.findOne({ where: { userId: playerId } }),
      this.progressions.findOne({ where: { playerId } }),
    ]);

    return construireArbre({
      missions,
      accomplies: accomplies.map((v) => v.missionId),
      scores: {
        // Un joueur qui n'a pas encore répondu au questionnaire a quatre
        // scores à zéro : toutes les voies sont à égalité, et l'ordre de
        // déclaration s'applique. Il a donc quand même un arbre.
        scoreExplorateur: profil?.scoreExplorateur ?? 0,
        scoreAccomplisseur: profil?.scoreAccomplisseur ?? 0,
        scoreCompetiteur: profil?.scoreCompetiteur ?? 0,
        scoreSocialisateur: profil?.scoreSocialisateur ?? 0,
      },
      niveau: progression?.niveauActuel ?? 1,
      reglages: this.reglagesArbre(),
    });
  }

  /** Le nœud d'une mission dans l'arbre de ce joueur, s'il existe. */
  async noeud(playerId: string, missionId: string): Promise<Noeud | null> {
    const arbre = await this.pourLeJoueur(playerId);
    for (const voie of arbre.voies) {
      for (const palier of voie.paliers) {
        const trouve = palier.noeuds.find((n) => n.missionId === missionId);
        if (trouve) return trouve;
      }
    }
    return null;
  }

  /**
   * Refuse de lancer une mission que l'arbre n'a pas encore ouverte.
   *
   * Sans ce contrôle, l'arbre ne serait qu'un dessin : n'importe qui
   * pourrait demander la validation de la mission la plus payante en
   * appelant l'API directement, et le déblocage progressif ne vaudrait rien.
   */
  async assertMissionOuverte(playerId: string, missionId: string): Promise<void> {
    const noeud = await this.noeud(playerId, missionId);
    // Mission introuvable dans l'arbre : ce n'est pas à cette garde de le
    // dire. Le service appelant répondra « Mission introuvable ».
    if (!noeud) return;

    if (noeud.etat === 'ouverte' || noeud.etat === 'accomplie') return;

    throw new BadRequestException(
      noeud.condition ??
        "Cette mission n'est pas encore ouverte dans ton arbre : accomplis d'abord celles qui la précèdent.",
    );
  }

  /**
   * La prime de palier d'une mission donnée.
   *
   * Appelée au moment de créditer le joueur, pour que la somme qui tombe
   * dans le portefeuille soit exactement celle annoncée sur le nœud de
   * l'arbre. Si les deux calculs divergeaient, le joueur le remarquerait
   * au centime près.
   */
  async primeDePalier(missionId: string): Promise<number> {
    return (await this.primesDePalier([missionId])).get(missionId) ?? 1;
  }

  /**
   * La même chose pour plusieurs missions d'un coup. Le catalogue n'est lu
   * qu'une fois : une liste de vingt validations à trancher ne doit pas
   * déclencher vingt lectures de la table des missions.
   */
  async primesDePalier(missionIds: string[]): Promise<Map<string, number>> {
    const primes = new Map<string, number>();
    if (missionIds.length === 0) return primes;

    const reglages = this.reglagesArbre();
    const toutes = (await this.missions.find()) as MissionDeLArbre[];

    for (const id of missionIds) {
      const palier = palierDeLaMission(id, toutes, reglages.taillePalier);
      primes.set(
        id,
        multiplicateurDePalier(palier, reglages.bonusParPalier, reglages.bonusMaximum),
      );
    }
    return primes;
  }
}
