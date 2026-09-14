import { Body, Controller, Get, Param, Post, Query, Req } from '@nestjs/common';
import { UtilisateurConnecte } from '../auth/auth.service';
import { Admin } from './admin.guard';
import { ComptesService } from './comptes.service';
import { JournalService } from './journal.service';
import { RegistreService } from './registre.service';

interface RequeteAdmin {
  utilisateur: UtilisateurConnecte;
}

@Controller('admin')
@Admin()
export class ComptesController {
  constructor(
    private readonly comptes: ComptesService,
    private readonly registre: RegistreService,
    private readonly journal: JournalService,
  ) {}

  // --- Comptes -----------------------------------------------------------

  @Get('comptes')
  lister(@Query('recherche') recherche?: string, @Query('type') type?: string) {
    return this.comptes.lister(recherche, type);
  }

  @Get('comptes/:id')
  detail(@Param('id') id: string) {
    return this.comptes.detail(id);
  }

  @Post('comptes/:id/administrateur')
  async changerAdministration(
    @Param('id') id: string,
    @Body() corps: { accorder?: boolean },
    @Req() requete: RequeteAdmin,
  ) {
    const accorder = Boolean(corps?.accorder);
    const resultat = await this.comptes.changerAdministration(
      id,
      accorder,
      requete.utilisateur.id,
    );

    await this.journal.enregistrer(requete.utilisateur, {
      action: accorder ? 'admin.accorde' : 'admin.retire',
      cible: id,
      resume: accorder
        ? `Droits d'administration accordés à ${resultat.email}`
        : `Droits d'administration retirés à ${resultat.email}`,
      avant: !accorder,
      apres: accorder,
    });

    return resultat;
  }

  // --- Registre de jetons ------------------------------------------------

  @Get('registre')
  etatDuRegistre() {
    return this.registre.etat();
  }

  @Get('registre/:compteId/mouvements')
  mouvements(@Param('compteId') compteId: string) {
    return this.registre.mouvementsDe(compteId);
  }

  @Post('registre/correction')
  async corriger(
    @Body()
    corps: { compteId: string; sens: 'crediter' | 'retirer'; montant: number; raison: string },
    @Req() requete: RequeteAdmin,
  ) {
    const resultat = await this.registre.corriger({
      compteId: corps?.compteId,
      sens: corps?.sens === 'retirer' ? 'retirer' : 'crediter',
      montant: Number(corps?.montant),
      raison: corps?.raison ?? '',
    });

    // Une correction touche à l'argent : elle est tracée deux fois, dans le
    // registre (le mouvement, qui fait foi) et ici (qui l'a décidée et
    // pourquoi).
    await this.journal.enregistrer(requete.utilisateur, {
      action: 'jetons.correction',
      cible: corps.compteId,
      resume:
        `${resultat.sens === 'crediter' ? 'Crédit' : 'Retrait'} de ${resultat.montant} jeton(s) ` +
        `sur « ${resultat.nom} » — ${corps.raison.trim()}`,
      avant: resultat.sens === 'crediter' ? resultat.solde - resultat.montant : resultat.solde + resultat.montant,
      apres: resultat.solde,
    });

    return resultat;
  }
}
