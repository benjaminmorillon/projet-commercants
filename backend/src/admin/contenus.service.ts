import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { Business } from '../businesses/business.entity';
import { Campaign } from '../campaigns/campaign.entity';
import { CheckIn } from '../checkins/checkin.entity';
import { GroupMission } from '../duos/group-mission.entity';
import { Event } from '../events/event.entity';
import { Mission } from '../missions/mission.entity';
import { User } from '../users/user.entity';
import { MissionValidation } from '../validations/mission-validation.entity';
import { changements, Changement, fusionnerPosition, Libelles, resumer } from './diff';

// Les champs qu'on accepte de modifier, et leur nom dans le journal. Ce qui
// n'est pas dans ces tables n'est pas modifiable — un identifiant ou une date
// de création soumis par une page bricolée est simplement ignoré.
const CHAMPS_COMMERCE: Libelles = {
  nom: 'nom',
  adresse: 'adresse',
  latitude: 'latitude',
  longitude: 'longitude',
  typeEtablissement: "type d'établissement",
  capaciteEstimee: 'capacité estimée',
  noteGoogle: 'note Google',
};

const CHAMPS_MISSION: Libelles = {
  titre: 'titre',
  description: 'description',
  archetypeDominant: 'archétype',
  duree: 'durée',
  theme: 'thème',
  modeInteraction: 'mode',
  recompenseBase: 'récompense',
};

const CHAMPS_EVENEMENT: Libelles = {
  titre: 'titre',
  description: 'description',
  dateDebut: 'date de début',
};

export interface Modification {
  changements: Changement[];
  resume: string;
}

@Injectable()
export class ContenusService {
  constructor(
    @InjectRepository(Business) private readonly businesses: Repository<Business>,
    @InjectRepository(User) private readonly users: Repository<User>,
    @InjectRepository(Mission) private readonly missions: Repository<Mission>,
    @InjectRepository(Event) private readonly events: Repository<Event>,
    @InjectRepository(MissionValidation)
    private readonly validations: Repository<MissionValidation>,
    @InjectRepository(GroupMission) private readonly groupes: Repository<GroupMission>,
    @InjectRepository(Campaign) private readonly campagnes: Repository<Campaign>,
    @InjectRepository(CheckIn) private readonly checkIns: Repository<CheckIn>,
  ) {}

  // --- Commerces ---------------------------------------------------------

  async listerCommerces() {
    const commerces = await this.businesses.find({ order: { nom: 'ASC' } });
    if (commerces.length === 0) {
      return [];
    }

    const ids = commerces.map((c) => c.id);
    const [proprietaires, missions, visites] = await Promise.all([
      this.users.find({ where: { id: In(commerces.map((c) => c.userId)) } }),
      this.missions.find({ where: { businessId: In(ids) } }),
      this.checkIns.find({ where: { businessId: In(ids) }, select: { businessId: true } }),
    ]);

    const emailParUser = new Map(proprietaires.map((u) => [u.id, u.email]));
    const compter = (liste: { businessId: string | null }[]) =>
      liste.reduce((acc, x) => {
        if (x.businessId) acc.set(x.businessId, (acc.get(x.businessId) ?? 0) + 1);
        return acc;
      }, new Map<string, number>());

    const missionsPar = compter(missions);
    const visitesPar = compter(visites);

    return commerces.map((commerce) => ({
      ...commerce,
      proprietaireEmail: emailParUser.get(commerce.userId) ?? '(compte supprimé)',
      nombreMissions: missionsPar.get(commerce.id) ?? 0,
      nombreVisites: visitesPar.get(commerce.id) ?? 0,
    }));
  }

  async modifierCommerce(id: string, soumis: Record<string, unknown>): Promise<Modification> {
    const commerce = await this.businesses.findOne({ where: { id } });
    if (!commerce) {
      throw new NotFoundException('Établissement introuvable.');
    }

    const liste = changements(commerce as unknown as Record<string, unknown>, soumis, CHAMPS_COMMERCE);
    this.verifierCoordonnees(liste);

    if (liste.length > 0) {
      await this.businesses.update({ id }, this.patch(liste));
    }

    // Ce qu'on enregistre, ce sont bien les coordonnées. Ce qu'on RACONTE au
    // journal, c'est un déplacement en mètres : personne ne lit une latitude.
    const pourLeJournal = fusionnerPosition(liste, {
      latitude: commerce.latitude,
      longitude: commerce.longitude,
    });

    return { changements: pourLeJournal, resume: resumer(commerce.nom, pourLeJournal) };
  }

  // --- Missions ----------------------------------------------------------

  async listerMissions(recherche?: string) {
    const toutes = await this.missions.find({ order: { id: 'ASC' } });
    const lieux = await this.businesses.find({ select: { id: true, nom: true } });
    const nomParLieu = new Map(lieux.map((l) => [l.id, l.nom]));

    // Combien de fois chaque mission a été jouée : c'est ce qui décide si on
    // peut encore la supprimer.
    const jouees = await this.validations
      .createQueryBuilder('v')
      .select('v.missionId', 'missionId')
      .addSelect('COUNT(v.id)', 'total')
      .groupBy('v.missionId')
      .getRawMany<{ missionId: string; total: string }>();
    const joueesPar = new Map(jouees.map((j) => [j.missionId, Number(j.total)]));

    const terme = recherche?.trim().toLowerCase();
    const filtrees = terme
      ? toutes.filter(
          (m) =>
            m.titre.toLowerCase().includes(terme) ||
            m.id.toLowerCase().includes(terme) ||
            m.theme.toLowerCase().includes(terme),
        )
      : toutes;

    return filtrees.map((mission) => ({
      ...mission,
      lieuNom: mission.businessId ? nomParLieu.get(mission.businessId) ?? '(lieu supprimé)' : null,
      nombreFois: joueesPar.get(mission.id) ?? 0,
    }));
  }

  /**
   * Crée une mission de catalogue (sans lieu rattaché).
   *
   * L'identifiant suit la convention du catalogue de référence (« EXP-001 »)
   * plutôt qu'un uuid : on doit pouvoir le lire et le citer. Les missions
   * créées depuis le back-office portent le préfixe ADM.
   */
  async creerMission(soumis: Record<string, unknown>): Promise<Mission> {
    const existantes = await this.missions.find({ select: { id: true } });
    const numeros = existantes
      .map((m) => /^ADM-(\d+)$/.exec(m.id))
      .filter((r): r is RegExpExecArray => r !== null)
      .map((r) => Number(r[1]));
    const suivant = (numeros.length ? Math.max(...numeros) : 0) + 1;

    return this.missions.save(
      this.missions.create({
        id: `ADM-${String(suivant).padStart(3, '0')}`,
        titre: String(soumis.titre),
        description: String(soumis.description),
        archetypeDominant: String(soumis.archetypeDominant),
        duree: String(soumis.duree),
        theme: String(soumis.theme),
        modeInteraction: String(soumis.modeInteraction),
        recompenseBase: Number(soumis.recompenseBase),
        phaseRelationnelle: null,
        typeSpecial: null,
        parcoursId: null,
        etape: null,
        debloqueMissionId: null,
        businessId: null,
      }),
    );
  }

  async modifierMission(id: string, soumis: Record<string, unknown>): Promise<Modification> {
    const mission = await this.missions.findOne({ where: { id } });
    if (!mission) {
      throw new NotFoundException('Mission introuvable.');
    }

    const liste = changements(mission as unknown as Record<string, unknown>, soumis, CHAMPS_MISSION);
    if (liste.length > 0) {
      await this.missions.update({ id }, this.patch(liste));
    }

    return { changements: liste, resume: resumer(`Mission ${id} « ${mission.titre} »`, liste) };
  }

  async supprimerMission(id: string): Promise<{ titre: string }> {
    const mission = await this.missions.findOne({ where: { id } });
    if (!mission) {
      throw new NotFoundException('Mission introuvable.');
    }

    // Une mission déjà jouée fait partie de l'histoire des joueurs : leurs
    // validations, leur XP et leurs jetons y renvoient. La supprimer ne
    // rendrait pas le site plus propre, elle laisserait des trous dans des
    // profils. On refuse, en disant quoi faire à la place.
    const [jouee, enGroupe] = await Promise.all([
      this.validations.count({ where: { missionId: id } }),
      this.groupes.count({ where: { missionId: id } }),
    ]);

    if (jouee > 0 || enGroupe > 0) {
      throw new ConflictException(
        `Cette mission a déjà été jouée (${jouee} validation(s), ${enGroupe} en duo ou groupe). ` +
          "La supprimer laisserait des trous dans les profils des joueurs. Modifiez-la plutôt, ou baissez sa récompense à son minimum pour qu'elle cesse d'être attractive.",
      );
    }

    await this.missions.delete({ id });
    return { titre: mission.titre };
  }

  // --- Événements --------------------------------------------------------

  async listerEvenements() {
    const evenements = await this.events.find({ order: { dateDebut: 'DESC' } });
    const lieux = await this.businesses.find({ select: { id: true, nom: true } });
    const nomParLieu = new Map(lieux.map((l) => [l.id, l.nom]));

    const campagnes = await this.campagnes.find({ select: { eventId: true } });
    const campagnesPar = campagnes.reduce((acc, c) => {
      if (c.eventId) acc.set(c.eventId, (acc.get(c.eventId) ?? 0) + 1);
      return acc;
    }, new Map<string, number>());

    return evenements.map((evenement) => ({
      // L'image est parfois une data URL de plusieurs centaines de kilo-octets :
      // elle n'a rien à faire dans une liste.
      id: evenement.id,
      businessId: evenement.businessId,
      titre: evenement.titre,
      description: evenement.description,
      dateDebut: evenement.dateDebut,
      aUneImage: Boolean(evenement.imageDataUrl),
      createdAt: evenement.createdAt,
      lieuNom: nomParLieu.get(evenement.businessId) ?? '(lieu supprimé)',
      nombreCampagnes: campagnesPar.get(evenement.id) ?? 0,
    }));
  }

  async modifierEvenement(id: string, soumis: Record<string, unknown>): Promise<Modification> {
    const evenement = await this.events.findOne({ where: { id } });
    if (!evenement) {
      throw new NotFoundException('Événement introuvable.');
    }

    const liste = changements(
      evenement as unknown as Record<string, unknown>,
      soumis,
      CHAMPS_EVENEMENT,
    );

    const date = liste.find((c) => c.champ === 'dateDebut');
    if (date && Number.isNaN(new Date(String(date.apres)).getTime())) {
      throw new BadRequestException("La date de début n'est pas une date valide.");
    }

    if (liste.length > 0) {
      const patch = this.patch(liste);
      if (patch.dateDebut) {
        patch.dateDebut = new Date(String(patch.dateDebut));
      }
      await this.events.update({ id }, patch);
    }

    return { changements: liste, resume: resumer(`Événement « ${evenement.titre} »`, liste) };
  }

  async supprimerEvenement(id: string): Promise<{ titre: string }> {
    const evenement = await this.events.findOne({ where: { id } });
    if (!evenement) {
      throw new NotFoundException('Événement introuvable.');
    }

    // Une campagne rattachée signifie que des joueurs ont été invités et
    // payés pour cet événement : la ligne est déjà passée dans le registre
    // de jetons. On ne supprime pas ce à quoi de l'argent renvoie.
    const campagnes = await this.campagnes.count({ where: { eventId: id } });
    if (campagnes > 0) {
      throw new ConflictException(
        `${campagnes} campagne(s) d'invitation renvoient à cet événement, et des joueurs ont déjà été crédités. ` +
          'Modifiez-le plutôt que de le supprimer.',
      );
    }

    await this.events.delete({ id });
    return { titre: evenement.titre };
  }

  // --- Outils ------------------------------------------------------------

  /** L'objet à passer à `update()`, construit à partir des seuls changements. */
  private patch(liste: Changement[]): Record<string, unknown> {
    return Object.fromEntries(liste.map((c) => [c.champ, c.apres]));
  }

  /**
   * Des coordonnées hors du monde déplaceraient le lieu au milieu de nulle
   * part : la carte s'afficherait, mais plus aucun check-in ne serait
   * possible et personne ne comprendrait pourquoi.
   */
  private verifierCoordonnees(liste: Changement[]): void {
    const bornes: Record<string, [number, number]> = {
      latitude: [-90, 90],
      longitude: [-180, 180],
    };

    for (const changement of liste) {
      const borne = bornes[changement.champ];
      if (!borne) continue;

      const valeur = Number(changement.apres);
      if (!Number.isFinite(valeur) || valeur < borne[0] || valeur > borne[1]) {
        throw new BadRequestException(
          `La ${changement.libelle} doit être un nombre entre ${borne[0]} et ${borne[1]}.`,
        );
      }
    }
  }
}
