import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, IsNull, Not, Repository } from 'typeorm';
import { BalancingService } from '../balancing/balancing.service';
import { Business } from '../businesses/business.entity';
import { CheckinsService } from '../checkins/checkins.service';
import { Mission } from '../missions/mission.entity';
import { MissionValidation } from '../validations/mission-validation.entity';
import { choisirMissionsTypes } from './missions-types';

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
  ) {}

  async getMap(playerId?: string) {
    const [lieux, missionsDeLieux, catalogue] = await Promise.all([
      this.businesses.find(),
      this.missions.find({ where: { businessId: Not(IsNull()) } }),
      this.missions.find({ where: { businessId: IsNull() } }),
    ]);

    const ids = lieux.map((l) => l.id);
    const [balancing, ratings, visites] = await Promise.all([
      this.balancing.getForBusinesses(ids),
      this.checkins.getRatingsSummary(ids),
      this.checkins.getVisitsSummary(ids),
    ]);

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

    return {
      lieux: lieux.map((lieu) => {
        const propres = missionsDeLieux.filter((m) => m.businessId === lieu.id);
        const types = choisirMissionsTypes(lieu.id, catalogue);

        return {
          id: lieu.id,
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
          missions: [
            ...propres.map((m) => enMission(m, false)),
            ...types.map((m) => enMission(m, true)),
          ],
        };
      }),
    };
  }
}
