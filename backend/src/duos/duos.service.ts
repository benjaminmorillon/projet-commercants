import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Not, Repository } from 'typeorm';
import { BalancingService } from '../balancing/balancing.service';
import { Business } from '../businesses/business.entity';
import { Mission } from '../missions/mission.entity';
import { PlayerEventsService } from '../player-events/player-events.service';
import { PlayerProfile } from '../players/player-profile.entity';
import { User, UserType } from '../users/user.entity';
import { WalletService } from '../wallet/wallet.service';
import { ProposerDuoDto, TerminerDuoDto } from './dto/proposer-duo.dto';
import { GroupMissionParticipant } from './group-mission-participant.entity';
import { GroupMission } from './group-mission.entity';
import {
  archetypeDominant,
  choisirLieuRendezVous,
  cleCombinaison,
  HistoriqueCombinaison,
  scoreAffinite,
  TypeMatching,
} from './matching';
import { PairingOutcome } from './pairing-outcome.entity';

@Injectable()
export class DuosService {
  constructor(
    @InjectRepository(GroupMission)
    private readonly duos: Repository<GroupMission>,
    @InjectRepository(GroupMissionParticipant)
    private readonly participants: Repository<GroupMissionParticipant>,
    @InjectRepository(PairingOutcome)
    private readonly outcomes: Repository<PairingOutcome>,
    @InjectRepository(PlayerProfile)
    private readonly profiles: Repository<PlayerProfile>,
    @InjectRepository(User)
    private readonly users: Repository<User>,
    @InjectRepository(Mission)
    private readonly missions: Repository<Mission>,
    @InjectRepository(Business)
    private readonly businesses: Repository<Business>,
    private readonly balancing: BalancingService,
    private readonly wallet: WalletService,
    private readonly playerEvents: PlayerEventsService,
  ) {}

  private async getProfilOrThrow(playerId: string): Promise<PlayerProfile> {
    const profile = await this.profiles.findOne({ where: { userId: playerId } });
    if (!profile) {
      throw new NotFoundException('Joueur introuvable.');
    }
    return profile;
  }

  // Taux de réussite passé par combinaison d'archétypes : c'est ce qui fait
  // que le matching s'améliore avec le temps.
  private async historiqueParCombinaison(): Promise<Map<string, HistoriqueCombinaison>> {
    const outcomes = await this.outcomes.find();
    const parCle = new Map<string, { reussites: number; total: number }>();

    outcomes.forEach((outcome) => {
      const courant = parCle.get(outcome.combinaisonArchetypes) ?? { reussites: 0, total: 0 };
      courant.total += 1;
      if (outcome.resultat === 'reussie') {
        courant.reussites += 1;
      }
      parCle.set(outcome.combinaisonArchetypes, courant);
    });

    return new Map(
      [...parCle.entries()].map(([cle, { reussites, total }]) => [
        cle,
        { tauxReussite: reussites / total, nombreDuos: total },
      ]),
    );
  }

  private async joueursDejaEngages(): Promise<Set<string>> {
    const enCours = await this.duos.find({ where: { statut: In(['proposee', 'acceptee']) } });
    if (enCours.length === 0) {
      return new Set();
    }
    const lignes = await this.participants.find({
      where: { groupMissionId: In(enCours.map((d) => d.id)), statut: Not('refuse') },
    });
    return new Set(lignes.map((l) => l.playerId));
  }

  async proposer(playerId: string, dto: ProposerDuoDto): Promise<GroupMission> {
    const profil = await this.getProfilOrThrow(playerId);

    const engages = await this.joueursDejaEngages();
    if (engages.has(playerId)) {
      throw new BadRequestException('Tu as déjà un duo en cours — termine-le avant d’en lancer un autre.');
    }

    const [autresProfils, historique] = await Promise.all([
      this.profiles.find({ where: { userId: Not(playerId) } }),
      this.historiqueParCombinaison(),
    ]);

    const candidats = autresProfils
      .filter((p) => !engages.has(p.userId))
      // Un profil encore vierge ne dit rien du joueur : on ne l'apparie pas.
      .filter((p) => p.questionnaireCompletedAt !== null);

    if (candidats.length === 0) {
      throw new BadRequestException(
        'Aucun joueur disponible pour un duo pour l’instant — il faut au moins un autre joueur ayant rempli son questionnaire.',
      );
    }

    const mienDominant = archetypeDominant(profil);
    const classement = candidats
      .map((candidat) => {
        const cle = cleCombinaison(mienDominant, archetypeDominant(candidat));
        return {
          candidat,
          score: scoreAffinite(profil, candidat, dto.typeMatching, historique.get(cle)),
          cle,
        };
      })
      .sort((a, b) => b.score - a.score);

    const meilleur = classement[0];

    const mission = dto.missionId
      ? await this.missionAPlusieurs(dto.missionId)
      : await this.choisirMission(dto.typeMatching);
    if (!mission) {
      throw new BadRequestException('Aucune mission à plusieurs disponible dans le catalogue.');
    }

    const lieu = dto.businessId
      ? await this.businesses.findOne({ where: { id: dto.businessId } })
      : await this.choisirLieu();

    // Rendez-vous ce soir : l'IA propose un créneau commun aux deux joueurs.
    const creneau = new Date();
    creneau.setHours(19, 0, 0, 0);
    if (creneau.getTime() < Date.now()) {
      creneau.setDate(creneau.getDate() + 1);
    }

    const duo = await this.duos.save(
      this.duos.create({
        missionId: mission.id,
        businessId: lieu?.id ?? null,
        typeMatching: dto.typeMatching,
        statutRevelation: 'cachee',
        creneauDebut: creneau,
        scoreAffinite: meilleur.score,
        combinaisonArchetypes: meilleur.cle,
      }),
    );

    await this.participants.save([
      this.participants.create({ groupMissionId: duo.id, playerId, statut: 'accepte' }),
      this.participants.create({ groupMissionId: duo.id, playerId: meilleur.candidat.userId }),
    ]);

    return duo;
  }

  // On privilégie une mission brise-glace : on ne demande pas un gros effort
  // à deux inconnus dès le premier contact (section 2.7 des specs).
  // Mission choisie explicitement par le joueur (depuis la carte) : on vérifie
  // juste qu'elle se joue bien à plusieurs.
  private async missionAPlusieurs(missionId: string): Promise<Mission> {
    const mission = await this.missions.findOne({ where: { id: missionId } });
    if (!mission) {
      throw new NotFoundException('Mission introuvable.');
    }
    if (mission.modeInteraction === 'solo') {
      throw new BadRequestException('Cette mission se joue en solo, pas en duo.');
    }
    return mission;
  }

  private async choisirMission(typeMatching: TypeMatching): Promise<Mission | null> {
    const modeRecherche =
      typeMatching === 'affinite_naturelle'
        ? 'duo_affinite_naturelle'
        : 'duo_defi_complementarite';

    const candidates = await this.missions.find({
      where: { modeInteraction: modeRecherche },
    });
    if (candidates.length === 0) {
      return null;
    }

    const briseGlace = candidates.filter((m) => m.phaseRelationnelle === 'brise_glace');
    const pool = briseGlace.length > 0 ? briseGlace : candidates;
    return pool[Math.floor(Math.random() * pool.length)];
  }

  private async choisirLieu(): Promise<Business | null> {
    const lieux = await this.businesses.find();
    if (lieux.length === 0) {
      return null;
    }
    const balancing = await this.balancing.getForBusinesses(lieux.map((l) => l.id));
    const choisi = choisirLieuRendezVous(
      lieux.map((l) => ({ id: l.id, multiplicateur: balancing.get(l.id)?.multiplicateur ?? 1 })),
    );
    return lieux.find((l) => l.id === choisi?.id) ?? null;
  }

  async listerPourJoueur(playerId: string) {
    const lignes = await this.participants.find({ where: { playerId } });
    if (lignes.length === 0) {
      return [];
    }

    const duos = await this.duos.find({
      where: { id: In(lignes.map((l) => l.groupMissionId)) },
      order: { createdAt: 'DESC' },
    });

    const tousParticipants = await this.participants.find({
      where: { groupMissionId: In(duos.map((d) => d.id)) },
    });

    const [missions, businesses, users] = await Promise.all([
      this.missions.find({ where: { id: In(duos.map((d) => d.missionId)) } }),
      this.businesses.find(),
      this.users.find({ where: { id: In(tousParticipants.map((p) => p.playerId)) } }),
    ]);
    const missionById = new Map(missions.map((m) => [m.id, m]));
    const businessById = new Map(businesses.map((b) => [b.id, b]));
    const pseudoById = new Map(users.map((u) => [u.id, u.pseudo]));

    return duos.map((duo) => {
      const moi = tousParticipants.find(
        (p) => p.groupMissionId === duo.id && p.playerId === playerId,
      );
      const partenaire = tousParticipants.find(
        (p) => p.groupMissionId === duo.id && p.playerId !== playerId,
      );
      const mission = missionById.get(duo.missionId);
      const lieu = duo.businessId ? businessById.get(duo.businessId) : null;

      // Le partenaire n'est révélé qu'une fois les deux d'accord.
      const partenaireRevele = duo.statut !== 'proposee' || duo.statutRevelation === 'annoncee';

      return {
        id: duo.id,
        statut: duo.statut,
        typeMatching: duo.typeMatching,
        scoreAffinite: duo.scoreAffinite,
        creneauDebut: duo.creneauDebut,
        monStatut: moi?.statut ?? 'invite',
        jaiConfirme: moi?.aConfirme ?? false,
        partenaireAConfirme: partenaire?.aConfirme ?? false,
        partenaireStatut: partenaire?.statut ?? 'invite',
        partenairePseudo:
          partenaireRevele && partenaire ? (pseudoById.get(partenaire.playerId) ?? null) : null,
        mission: mission
          ? {
              titre: mission.titre,
              description: mission.description,
              phaseRelationnelle: mission.phaseRelationnelle,
              recompenseBase: mission.recompenseBase,
            }
          : null,
        lieu: lieu ? { nom: lieu.nom, adresse: lieu.adresse } : null,
      };
    });
  }

  async repondre(duoId: string, playerId: string, accepte: boolean): Promise<GroupMission> {
    const duo = await this.duos.findOne({ where: { id: duoId } });
    if (!duo) {
      throw new NotFoundException('Duo introuvable.');
    }
    const ligne = await this.participants.findOne({ where: { groupMissionId: duoId, playerId } });
    if (!ligne) {
      throw new NotFoundException('Tu ne fais pas partie de ce duo.');
    }
    if (duo.statut !== 'proposee') {
      throw new BadRequestException('Ce duo n’est plus en attente de réponse.');
    }

    ligne.statut = accepte ? 'accepte' : 'refuse';
    ligne.reponduLe = new Date();
    await this.participants.save(ligne);

    if (!accepte) {
      duo.statut = 'annulee';
      return this.duos.save(duo);
    }

    const tous = await this.participants.find({ where: { groupMissionId: duoId } });
    if (tous.every((p) => p.statut === 'accepte')) {
      // Les deux ont dit oui : on révèle qui est en face.
      duo.statut = 'acceptee';
      duo.statutRevelation = 'annoncee';
      return this.duos.save(duo);
    }

    return duo;
  }

  /**
   * Chaque participant confirme de son côté. Quand les deux ont confirmé, la
   * mission est validée : c'est la validation par le partenaire pour les
   * missions à plusieurs. Les deux joueurs sont alors crédités.
   */
  async confirmer(duoId: string, playerId: string, dto: TerminerDuoDto) {
    const duo = await this.duos.findOne({ where: { id: duoId } });
    if (!duo) {
      throw new NotFoundException('Duo introuvable.');
    }
    if (duo.statut !== 'acceptee') {
      throw new BadRequestException('Ce duo n’est pas en cours.');
    }

    const ligne = await this.participants.findOne({ where: { groupMissionId: duoId, playerId } });
    if (!ligne) {
      throw new NotFoundException('Tu ne fais pas partie de ce duo.');
    }

    ligne.aConfirme = true;
    await this.participants.save(ligne);

    const tous = await this.participants.find({ where: { groupMissionId: duoId } });
    if (!tous.every((p) => p.aConfirme)) {
      return { statut: 'en_attente_du_partenaire' as const };
    }

    const mission = await this.missions.findOne({ where: { id: duo.missionId } });
    const multiplicateur = await this.balancing.getMultiplier(duo.businessId);
    const recompense = Math.round((mission?.recompenseBase ?? 0) * multiplicateur * 100) / 100;

    await Promise.all(
      tous.map(async (participant) => {
        await this.wallet.applyCredit(
          participant.playerId,
          recompense,
          duo.id,
          `Duo : ${mission?.titre ?? 'mission à plusieurs'}`,
        );
        await this.playerEvents.record(participant.playerId, 'mission_groupe_terminee', {
          businessId: duo.businessId,
          missionId: duo.missionId,
        });
      }),
    );

    duo.statut = 'accomplie';
    await this.duos.save(duo);

    await this.outcomes.save(
      this.outcomes.create({
        groupMissionId: duo.id,
        combinaisonArchetypes: duo.combinaisonArchetypes,
        typeMatching: duo.typeMatching,
        resultat: 'reussie',
        feedback: dto.feedback ?? null,
      }),
    );

    return { statut: 'accomplie' as const, recompense };
  }
}
