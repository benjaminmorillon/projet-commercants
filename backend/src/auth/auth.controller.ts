import { Body, Controller, Get, Post, Req, Res } from '@nestjs/common';
import type { Request, Response } from 'express';
import { AuthService, UtilisateurConnecte } from './auth.service';
import { CLIENT_MOBILE, jetonDeLaRequete, NOM_COOKIE_SESSION } from './cookies';
import { ConnexionDto } from './dto/connexion.dto';
import { InscriptionDto } from './dto/inscription.dto';
import { MotDePasseOublieDto, ReinitialiserDto } from './dto/mot-de-passe.dto';
import { Public } from './public.decorator';
import { Utilisateur } from './utilisateur.decorator';
import { PhotosService } from '../photos/photos.service';

const TRENTE_JOURS_MS = 30 * 24 * 60 * 60 * 1000;

@Controller('auth')
export class AuthController {
  constructor(
    private readonly auth: AuthService,
    private readonly photos: PhotosService,
  ) {}

  /**
   * Comment rendre le jeton de session, selon qui demande.
   *
   * Un NAVIGATEUR le reçoit dans un cookie `httpOnly` : le JavaScript de la
   * page ne peut pas le lire, donc un script injecté ne peut pas le voler
   * pour s'en servir ailleurs. Il n'apparaît jamais dans la réponse.
   *
   * L'APPLICATION MOBILE le reçoit dans la réponse, et aucun cookie n'est
   * posé. Il n'y a pas de navigateur pour en porter un, ni de page web dans
   * laquelle un script étranger pourrait s'injecter ; l'application le range
   * dans le coffre du téléphone et le renvoie en en-tête.
   *
   * C'est le client qui annonce ce qu'il est, par l'en-tête `X-Client`. Ce
   * n'est pas une barrière de sécurité — n'importe qui peut envoyer cet
   * en-tête — mais un choix de transport : le navigateur, lui, ne le demande
   * pas, donc ses réponses ne contiennent jamais le jeton.
   */
  private estMobile(requete: Request): boolean {
    return String(requete.headers['x-client'] ?? '').toLowerCase() === CLIENT_MOBILE;
  }

  private poserCookie(reponse: Response, jeton: string) {
    reponse.cookie(NOM_COOKIE_SESSION, jeton, {
      httpOnly: true,
      sameSite: 'lax',
      maxAge: TRENTE_JOURS_MS,
      path: '/',
      // En production (HTTPS), le cookie ne doit jamais voyager en clair.
      secure: process.env.NODE_ENV === 'production',
    });
  }

  @Public()
  @Post('inscription')
  async inscription(
    @Body() dto: InscriptionDto,
    @Req() requete: Request,
    @Res({ passthrough: true }) reponse: Response,
  ) {
    const { utilisateur, jeton } = await this.auth.inscrire(dto);
    return this.remettreLaSession(requete, reponse, utilisateur, jeton);
  }

  @Public()
  @Post('connexion')
  async connexion(
    @Body() dto: ConnexionDto,
    @Req() requete: Request,
    @Res({ passthrough: true }) reponse: Response,
  ) {
    const { utilisateur, jeton } = await this.auth.connecter(dto);
    return this.remettreLaSession(requete, reponse, utilisateur, jeton);
  }

  private remettreLaSession(
    requete: Request,
    reponse: Response,
    utilisateur: UtilisateurConnecte,
    jeton: string,
  ) {
    if (this.estMobile(requete)) {
      return { utilisateur, jeton };
    }
    this.poserCookie(reponse, jeton);
    return utilisateur;
  }

  // On répond toujours la même chose, que l'adresse existe ou non.
  @Public()
  @Post('mot-de-passe-oublie')
  async motDePasseOublie(@Body() dto: MotDePasseOublieDto, @Req() requete: Request) {
    const origine = `${requete.protocol}://${requete.get('host')}`;
    await this.auth.demanderReinitialisation(dto.email, origine);
    return {
      message:
        'Si un compte existe avec cette adresse, un lien de réinitialisation vient d’être envoyé.',
    };
  }

  @Public()
  @Post('reinitialiser')
  async reinitialiser(
    @Body() dto: ReinitialiserDto,
    @Res({ passthrough: true }) reponse: Response,
  ) {
    const { utilisateur, jeton } = await this.auth.reinitialiserMotDePasse(
      dto.jeton,
      dto.motDePasse,
    );
    this.poserCookie(reponse, jeton);
    return utilisateur;
  }

  @Post('deconnexion')
  async deconnexion(@Req() requete: Request, @Res({ passthrough: true }) reponse: Response) {
    await this.auth.deconnecter(jetonDeLaRequete(requete.headers));
    reponse.clearCookie(NOM_COOKIE_SESSION, { path: '/' });
    return { deconnecte: true };
  }

  // Qui suis-je ? La page s'en sert au chargement pour savoir quoi afficher.
  @Get('moi')
  async moi(@Utilisateur() utilisateur: UtilisateurConnecte) {
    return {
      ...utilisateur,
      photoVersion: await this.photos.version('joueur', utilisateur.id),
    };
  }
}
