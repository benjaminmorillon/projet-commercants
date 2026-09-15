import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, IsNull, Not, Repository } from 'typeorm';
import { BalancingService } from '../balancing/balancing.service';
import { Business } from '../businesses/business.entity';
import { CheckinsService } from '../checkins/checkins.service';
import { Mission } from '../missions/mission.entity';
import { cleZone } from '../unlocking/unlock-rules';
import { UnlockingService } from '../unlocking/unlocking.service';
import { MissionValidation } from '../validations/mission-validation.entity';
import { choisirMissionsTypes } from './missions-types';
import { ReglagesService } from '../admin/reglages.service';
import { PhotosService } from '../photos/photos.service';

export type StatutMissionJoueur = 'disponible' | 'en_attente' | 'accomplie';

@Injectable()
export class MapService {
  constructor(
    @InjectRepository(Business)
    private readonly businesses: Repository<Business>,
    @InjectRepository(Mission)
    private readonly missions: Repository<Mission>,
    @InjectRepository(MissionValidation)
    private readonly validations: Repository<MissionValidation>,
    private readonly balancing: BalancingService,
    private readonly checkins: CheckinsService,
    private readonly unlocking: UnlockingService,
    private readonly reglages: ReglagesService,
    private readonly photos: PhotosService,
  ) {}

  async getMap(playerId?: string, position?: { latitude: number; longitude: number }) {
    const [lieux, missionsDeLieux, catalogue] = await Promise.all([
      this.businesses.find(),
      this.missions.find({ where: { businessId: Not(IsNull()) } }),
      this.missions.find({ where: { businessId: IsNull() } }),
    ]);

    const ids = lieux.map((l) => l.id);
    const [balancing, ratings, visites, photos] = await Promise.all([
      this.balancing.getForBusinesses(ids),
      this.checkins.getRatingsSummary(ids),
      this.checkins.getVisitsSummary(ids),
      this.photos.versions('commerce', ids),
    ]);

    // Carte voilée (section 2.9) : sans joueur identifié on montre tout (mode
    // découverte du prototype) ; sinon on ne révèle que les zones visitées et
    // celles qui entourent le joueur à cet instant.
    const zonesVisibles = playerId
      ? await this.unlocking.zonesVisibles(playerId, position)
      : null;

    // Où en est le joueur sur chaque mission.
    const statutParMission = new Map<string, StatutMissionJoueur>();
    if (playerId) {
      const demandes = await this.validations.find({
        where: { playerId, statut: In(['en_attente', 'validee']) },
      });
      demandes.forEach((d) => {
        statutParMission.set(d.missionId, d.statut === 'validee' ? 'accomplie' : 'en_attente');
      });
    }

    const enMission = (mission: Mission, propose: boolean) => ({
      id: mission.id,
      titre: mission.titre,
      description: mission.description,
      modeInteraction: mission.modeInteraction,
      archetypeDominant: mission.archetypeDominant,
      duree: mission.duree,
      theme: mission.theme,
      phaseRelationnelle: mission.phaseRelationnelle,
      recompenseBase: mission.recompenseBase,
      estDuo: mission.modeInteraction !== 'solo',
      // Une mission "type" vient du catalogue et se valide entre joueurs ;
      // une mission du lieu est validée par le commerçant.
      estMissionType: propose,
      statutJoueur: statutParMission.get(mission.id) ?? 'disponible',
    });

    const tailleZone = this.reglages.nombre('carte.tailleZoneDegres');

    return {
      // Les quartiers levés, et la taille d'un quartier.
      //
      // Le site dessine le voile à partir de ces deux valeurs ; l'application
      // en a besoin pour la même raison. Sans elles, elle ne pourrait montrer
      // que les lieux découverts, sans jamais dire ce qui a été exploré
      // AUTOUR — or c'est justement ce qu'on regarde sur une carte voilée.
      //
      // `null` veut dire « tout est visible » (prototype sans joueur
      // identifié), et non « rien n'est visible ».
      zones: {
        visibles: zonesVisibles ? [...zonesVisibles] : null,
        tailleDegres: tailleZone,
      },
      lieux: lieux.map((lieu) => {
        const zone = cleZone(lieu.latitude, lieu.longitude, tailleZone);
        const decouvert = zonesVisibles === null || zonesVisibles.has(zone);

        // Un lieu encore voilé n'expose que sa position et sa zone : ni nom,
        // ni missions, ni statistiques. Il faut y aller pour le savoir.
        if (!decouvert) {
          return {
            id: lieu.id,
            zone,
            decouvert: false as const,
            latitude: lieu.latitude,
            longitude: lieu.longitude,
            missions: [],
          };
        }

        const propres = missionsDeLieux.filter((m) => m.businessId === lieu.id);
        const types = choisirMissionsTypes(
          lieu.id,
          catalogue,
          this.reglages.entier('carte.missionsParLieu'),
        );

        return {
          id: lieu.id,
          zone,
          decouvert: true as const,
          nom: lieu.nom,
          adresse: lieu.adresse,
          typeEtablissement: lieu.typeEtablissement,
          latitude: lieu.latitude,
          longitude: lieu.longitude,
          capaciteEstimee: lieu.capaciteEstimee,
          noteMoyenne: ratings.get(lieu.id)?.noteMoyenne ?? null,
          nombreAvis: ratings.get(lieu.id)?.nombreAvis ?? 0,
          nombreCheckins: visites.get(lieu.id) ?? 0,
          multiplicateur: balancing.get(lieu.id)?.multiplicateur ?? 1,
          tauxOccupation: balancing.get(lieu.id)?.tauxOccupation ?? 0,
          photoVersion: photos.get(lieu.id) ?? null,
          missions: [
            ...propres.map((m) => enMission(m, false)),
            ...types.map((m) => enMission(m, true)),
          ],
        };
      }),
    };
  }
}
