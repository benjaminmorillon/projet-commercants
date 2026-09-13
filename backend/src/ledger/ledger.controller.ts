import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { UtilisateurConnecte } from '../auth/auth.service';
import { BusinessOwnerGuard } from '../auth/business-owner.guard';
import { Utilisateur } from '../auth/utilisateur.decorator';
import { PayerPartenaireDto } from './dto/payer-partenaire.dto';
import { RechargerDto } from './dto/recharger.dto';
import { JetonsService } from './jetons.service';

@Controller('jetons')
export class JetonsController {
  constructor(private readonly jetons: JetonsService) {}

  // --- Joueur : tout est rattaché à la session, aucun identifiant à passer ---

  @Get('mon-solde')
  monSolde(@Utilisateur() utilisateur: UtilisateurConnecte) {
    return this.jetons.soldeJoueur(utilisateur.id);
  }

  @Post('payer')
  payer(@Utilisateur() utilisateur: UtilisateurConnecte, @Body() dto: PayerPartenaireDto) {
    return this.jetons.payerChezPartenaire(utilisateur.id, dto.businessId, dto.montant);
  }

  @Post('donner')
  donner(@Utilisateur() utilisateur: UtilisateurConnecte, @Body() dto: RechargerDto) {
    return this.jetons.donner(utilisateur.id, dto.montant);
  }
}

@UseGuards(BusinessOwnerGuard)
@Controller('businesses')
export class BusinessJetonsController {
  constructor(private readonly jetons: JetonsService) {}

  @Get(':id/jetons')
  async solde(
    @Param('id') _id: string,
    @Utilisateur() utilisateur: UtilisateurConnecte,
  ) {
    // Le garde a déjà vérifié que l'établissement appartient au compte : le
    // compte de jetons, lui, est rattaché au compte utilisateur.
    const detail = await this.jetons.soldeCommercant(utilisateur.id);
    return { ...detail, prestataire: this.jetons.infosPrestataire() };
  }

  @Post(':id/jetons/recharger')
  recharger(
    @Param('id') _id: string,
    @Utilisateur() utilisateur: UtilisateurConnecte,
    @Body() dto: RechargerDto,
  ) {
    return this.jetons.recharger(utilisateur.id, dto.montant);
  }

  @Get(':id/jetons/rechargements')
  rechargements(
    @Param('id') _id: string,
    @Utilisateur() utilisateur: UtilisateurConnecte,
  ) {
    return this.jetons.listerRechargements(utilisateur.id);
  }
}
