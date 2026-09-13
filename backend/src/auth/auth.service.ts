import {
  BadRequestException,
  HttpException,
  HttpStatus,
  Inject,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ILike, IsNull, LessThan, Repository } from 'typeorm';
import { PlayerProfile } from '../players/player-profile.entity';
import { User, UserType } from '../users/user.entity';
import { createHash } from 'crypto';
import { ConnexionDto } from './dto/connexion.dto';
import { InscriptionDto } from './dto/inscription.dto';
import { EXPEDITEUR_EMAIL, ExpediteurEmail } from './expediteur-email';
import {
  enregistrerEchec,
  EtatTentatives,
  etatVide,
  reinitialiser as reinitialiserTentatives,
  verifier,
} from './rate-limit';
import { DemandeReinitialisation } from './reinitialisation.entity';
import {
  genererJetonSession,
  hacherMotDePasse,
  verifierMotDePasse,
} from './password';
import { Session } from './session.entity';

// Une session dure 30 jours, puis il faut se reconnecter.
const DUREE_SESSION_JOURS = 30;

// Un lien de réinitialisation ne vit qu'une heure, et ne sert qu'une fois.
const DUREE_LIEN_REINITIALISATION_MS = 60 * 60 * 1000;

export interface UtilisateurConnecte {
  id: string;
  pseudo: string;
  email: string;
  type: UserType;
}

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User)
    private readonly users: Repository<User>,
    @InjectRepository(Session)
    private readonly sessions: Repository<Session>,
    @InjectRepository(PlayerProfile)
    private readonly profiles: Repository<PlayerProfile>,
    @InjectRepository(DemandeReinitialisation)
    private readonly demandes: Repository<DemandeReinitialisation>,
    @Inject(EXPEDITEUR_EMAIL)
    private readonly expediteur: ExpediteurEmail,
  ) {}

  private readonly logger = new Logger(AuthService.name);

  // Compteur d'échecs par email. En mémoire : suffisant pour un serveur
  // unique, à remplacer par un stockage partagé (Redis) le jour où il y en
  // aura plusieurs — sinon chacun compterait dans son coin.
  private readonly tentatives = new Map<string, EtatTentatives>();

  private enUtilisateurConnecte(user: User): UtilisateurConnecte {
    return { id: user.id, pseudo: user.pseudo, email: user.email, type: user.type };
  }

  async inscrire(dto: InscriptionDto): Promise<{ utilisateur: UtilisateurConnecte; jeton: string }> {
    const email = dto.email.trim().toLowerCase();

    const existant = await this.users.findOne({ where: { email } });
    if (existant) {
      throw new BadRequestException('Un compte existe déjà avec cette adresse email.');
    }

    const pseudo = dto.pseudo.trim();
    const type = dto.type === 'commercant' ? UserType.COMMERCANT : UserType.PARTICULIER;

    // Le pseudo d'un JOUEUR sert à le désigner (choisir un validateur,
    // envoyer une demande d'ami) : deux joueurs ne peuvent pas porter le même,
    // sinon on ne sait pas de qui on parle. Comparaison insensible à la casse.
    //
    // Le nom d'un établissement, lui, n'a pas à être unique : deux « Le
    // Comptoir » dans deux villes différentes doivent pouvoir exister.
    if (type === UserType.PARTICULIER) {
      const pseudoPris = await this.users.findOne({
        where: { pseudo: ILike(pseudo), type: UserType.PARTICULIER },
      });
      if (pseudoPris) {
        throw new BadRequestException('Ce pseudo est déjà pris — choisis-en un autre.');
      }
    }

    const user = await this.users.save(
      this.users.create({
        email,
        pseudo,
        type,
        motDePasseHache: hacherMotDePasse(dto.motDePasse),
      }),
    );

    // Un joueur a besoin de son profil dès l'inscription : c'est lui qui
    // portera les réponses au questionnaire et les scores d'archétypes.
    if (type === UserType.PARTICULIER) {
      await this.profiles.save(this.profiles.create({ userId: user.id }));
    }

    return { utilisateur: this.enUtilisateurConnecte(user), jeton: await this.ouvrirSession(user) };
  }

  async connecter(dto: ConnexionDto): Promise<{ utilisateur: UtilisateurConnecte; jeton: string }> {
    const email = dto.email.trim().toLowerCase();

    // Trop d'échecs récents sur cette adresse : on ferme la porte un moment,
    // sinon rien n'empêche d'essayer des milliers de mots de passe.
    const maintenant = Date.now();
    const etat = this.tentatives.get(email) ?? etatVide();
    const verdict = verifier(etat, maintenant);
    if (verdict.bloque) {
      const minutes = Math.ceil(verdict.secondesRestantes / 60);
      throw new HttpException(
        `Trop de tentatives. Réessaie dans ${minutes} minute${minutes > 1 ? 's' : ''}.`,
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    // L'empreinte n'est jamais chargée par défaut (`select: false` sur
    // l'entité) : on la demande explicitement, ici et nulle part ailleurs.
    const user = await this.users.findOne({
      where: { email },
      select: { id: true, email: true, pseudo: true, type: true, motDePasseHache: true },
    });

    // Même message et même temps de réponse que l'email existe ou non : on ne
    // dit pas à un inconnu quelles adresses ont un compte chez nous.
    const empreinte =
      user?.motDePasseHache ??
      'scrypt$00000000000000000000000000000000$' + '0'.repeat(128);
    const correct = verifierMotDePasse(dto.motDePasse, empreinte);

    if (!user || !correct) {
      this.tentatives.set(email, enregistrerEchec(etat, maintenant));
      throw new UnauthorizedException('Email ou mot de passe incorrect.');
    }

    // Connexion réussie : l'ardoise est effacée.
    this.tentatives.set(email, reinitialiserTentatives());

    return { utilisateur: this.enUtilisateurConnecte(user), jeton: await this.ouvrirSession(user) };
  }

  // ---------------------------------------------------------------------
  // Mot de passe oublié
  // ---------------------------------------------------------------------

  private hacherJeton(jeton: string): string {
    // Le jeton fait déjà 256 bits tirés au hasard : un simple SHA-256 suffit
    // à ce qu'on ne puisse pas s'en servir depuis la base (pas besoin de la
    // lenteur de scrypt, il n'y a rien à deviner).
    return createHash('sha256').update(jeton).digest('hex');
  }

  /**
   * Envoie un lien de réinitialisation. Répond toujours la même chose, que
   * l'adresse existe ou non : sinon ce formulaire dirait à un inconnu quelles
   * adresses ont un compte.
   */
  async demanderReinitialisation(email: string, origine: string): Promise<void> {
    const adresse = email.trim().toLowerCase();
    const user = await this.users.findOne({ where: { email: adresse } });
    if (!user) {
      return;
    }

    // Les demandes précédentes encore valides sont annulées : un seul lien
    // à la fois.
    await this.demandes.update(
      { userId: user.id, utiliseLe: IsNull() },
      { utiliseLe: new Date() },
    );

    const jeton = genererJetonSession();
    const expireLe = new Date(Date.now() + DUREE_LIEN_REINITIALISATION_MS);
    await this.demandes.save(
      this.demandes.create({ userId: user.id, jetonHache: this.hacherJeton(jeton), expireLe }),
    );

    const lien = `${origine}/reinitialisation.html?jeton=${jeton}`;
    await this.expediteur.envoyer({
      destinataire: user.email,
      sujet: 'Réinitialiser ton mot de passe',
      corps: [
        `Bonjour ${user.pseudo},`,
        '',
        'Tu as demandé à changer ton mot de passe. Ce lien est valable une heure et ne sert qu’une fois :',
        lien,
        '',
        'Si tu n’es pas à l’origine de cette demande, ignore ce message : ton mot de passe reste inchangé.',
      ].join('\n'),
    });
  }

  /** Change le mot de passe à partir d'un lien, puis ouvre une session. */
  async reinitialiserMotDePasse(
    jeton: string,
    nouveauMotDePasse: string,
  ): Promise<{ utilisateur: UtilisateurConnecte; jeton: string }> {
    const demande = await this.demandes.findOne({
      where: { jetonHache: this.hacherJeton(jeton) },
    });

    if (!demande || demande.utiliseLe || demande.expireLe.getTime() < Date.now()) {
      throw new BadRequestException(
        'Ce lien n’est plus valable. Demande-en un nouveau depuis « Mot de passe oublié ».',
      );
    }

    const user = await this.users.findOne({ where: { id: demande.userId } });
    if (!user) {
      throw new BadRequestException('Ce lien n’est plus valable.');
    }

    user.motDePasseHache = hacherMotDePasse(nouveauMotDePasse);
    await this.users.save(user);

    demande.utiliseLe = new Date();
    await this.demandes.save(demande);

    // Changer de mot de passe coupe les sessions ouvertes ailleurs : si
    // quelqu'un d'autre était connecté, il est éjecté.
    await this.sessions.delete({ userId: user.id });
    this.tentatives.set(user.email, reinitialiserTentatives());

    return { utilisateur: this.enUtilisateurConnecte(user), jeton: await this.ouvrirSession(user) };
  }

  private async ouvrirSession(user: User): Promise<string> {
    await this.nettoyerSessionsExpirees();

    const expireLe = new Date();
    expireLe.setDate(expireLe.getDate() + DUREE_SESSION_JOURS);

    const session = await this.sessions.save(
      this.sessions.create({ jeton: genererJetonSession(), userId: user.id, expireLe }),
    );
    return session.jeton;
  }

  /** Retrouve qui se cache derrière un jeton, ou null s'il ne vaut plus rien. */
  async utilisateurDuJeton(jeton: string | null): Promise<UtilisateurConnecte | null> {
    if (!jeton) {
      return null;
    }

    const session = await this.sessions.findOne({ where: { jeton } });
    if (!session) {
      return null;
    }
    if (session.expireLe.getTime() < Date.now()) {
      await this.sessions.delete({ id: session.id });
      return null;
    }

    const user = await this.users.findOne({ where: { id: session.userId } });
    return user ? this.enUtilisateurConnecte(user) : null;
  }

  async deconnecter(jeton: string | null): Promise<void> {
    if (jeton) {
      await this.sessions.delete({ jeton });
    }
  }

  private async nettoyerSessionsExpirees(): Promise<void> {
    await this.sessions.delete({ expireLe: LessThan(new Date()) });
  }
}
