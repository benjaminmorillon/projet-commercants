import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Put,
  Query,
  Req,
} from '@nestjs/common';
import { DataSource } from 'typeorm';
import { UtilisateurConnecte } from '../auth/auth.service';
import { Business } from '../businesses/business.entity';
import { CheckIn } from '../checkins/checkin.entity';
import { Mission } from '../missions/mission.entity';
import { User, UserType } from '../users/user.entity';
import { MissionValidation } from '../validations/mission-validation.entity';
import { Admin } from './admin.guard';
import { GROUPES } from './catalogue-reglages';
import { JournalService } from './journal.service';
import { ReglagesService } from './reglages.service';

interface RequeteAdmin {
  utilisateur: UtilisateurConnecte;
}

@Controller('admin')
@Admin()
export class AdminController {
  constructor(
    private readonly reglages: ReglagesService,
    private readonly journal: JournalService,
    private readonly dataSource: DataSource,
  ) {}

  /** Sert au back-office à confirmer qu'on est bien administrateur. */
  @Get('moi')
  moi(@Req() requete: RequeteAdmin) {
    const { id, email, pseudo } = requete.utilisateur;
    return { id, email, pseudo };
  }

  /** Les compteurs de la page d'accueil du back-office. */
  @Get('resume')
  async resume() {
    const compter = async (entite: Function, where?: object) =>
      this.dataSource.getRepository(entite).count(where ? { where } : {});

    const [joueurs, commercants, commerces, missions, visites, validations] = await Promise.all([
      compter(User, { type: UserType.PARTICULIER }),
      compter(User, { type: UserType.COMMERCANT }),
      compter(Business),
      compter(Mission),
      compter(CheckIn),
      compter(MissionValidation),
    ]);

    return { joueurs, commercants, commerces, missions, visites, validations };
  }

  /** Le nom lisible d'un réglage, pour le journal. */
  private libelle(cle: string): string {
    return this.reglages.tout().find((r) => r.cle === cle)?.libelle ?? cle;
  }

  @Get('reglages')
  listerReglages() {
    return { groupes: GROUPES, reglages: this.reglages.tout() };
  }

  @Put('reglages/:cle')
  async modifierReglage(
    @Param('cle') cle: string,
    @Body() corps: { valeur: unknown },
    @Req() requete: RequeteAdmin,
  ) {
    const { avant, apres } = await this.reglages.definir(
      cle,
      corps?.valeur,
      requete.utilisateur.id,
    );

    // On n'écrit au journal que si la valeur a bougé. Réenregistrer un champ
    // sans le modifier — ce qui arrive dès qu'on clique à côté — ne doit pas
    // remplir le journal de lignes « 150 → 150 » qui le rendent illisible.
    if (avant !== apres) {
      await this.journal.enregistrer(requete.utilisateur, {
        action: 'reglage.modifie',
        cible: cle,
        resume: `${this.libelle(cle)} : ${avant} → ${apres}`,
        avant,
        apres,
      });
    }

    return { cle, valeur: apres, personnalise: true };
  }

  @Delete('reglages/:cle')
  async reinitialiserReglage(@Param('cle') cle: string, @Req() requete: RequeteAdmin) {
    const { avant, apres } = await this.reglages.remettreParDefaut(cle);

    if (avant !== apres) {
      await this.journal.enregistrer(requete.utilisateur, {
        action: 'reglage.reinitialise',
        cible: cle,
        resume: `${this.libelle(cle)} remis à sa valeur d'origine : ${avant} → ${apres}`,
        avant,
        apres,
      });
    }

    return { cle, valeur: apres, personnalise: false };
  }

  @Get('journal')
  async lireJournal(@Query('combien') combien?: string) {
    const lignes = await this.journal.dernieres(Number(combien) || 100);
    return { lignes };
  }
}
