import {
  BadRequestException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ILike, LessThan, Repository } from 'typeorm';
import { User, UserType } from '../users/user.entity';
import { ConnexionDto } from './dto/connexion.dto';
import { InscriptionDto } from './dto/inscription.dto';
import {
  genererJetonSession,
  hacherMotDePasse,
  verifierMotDePasse,
} from './password';
import { Session } from './session.entity';

// Une session dure 30 jours, puis il faut se reconnecter.
const DUREE_SESSION_JOURS = 30;

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
  ) {}

  private enUtilisateurConnecte(user: User): UtilisateurConnecte {
    return { id: user.id, pseudo: user.pseudo, email: user.email, type: user.type };
  }

  async inscrire(dto: InscriptionDto): Promise<{ utilisateur: UtilisateurConnecte; jeton: string }> {
    const email = dto.email.trim().toLowerCase();

    const existant = await this.users.findOne({ where: { email } });
    if (existant) {
      throw new BadRequestException('Un compte existe déjà avec cette adresse email.');
    }

    // Le pseudo sert à désigner quelqu'un (choisir un validateur, envoyer une
    // demande d'ami) : deux personnes ne peuvent pas porter le même, sinon on
    // ne sait pas de qui on parle. Comparaison insensible à la casse.
    const pseudo = dto.pseudo.trim();
    const pseudoPris = await this.users.findOne({ where: { pseudo: ILike(pseudo) } });
    if (pseudoPris) {
      throw new BadRequestException('Ce pseudo est déjà pris — choisis-en un autre.');
    }

    const user = await this.users.save(
      this.users.create({
        email,
        pseudo,
        type: dto.type === 'commercant' ? UserType.COMMERCANT : UserType.PARTICULIER,
        motDePasseHache: hacherMotDePasse(dto.motDePasse),
      }),
    );

    return { utilisateur: this.enUtilisateurConnecte(user), jeton: await this.ouvrirSession(user) };
  }

  async connecter(dto: ConnexionDto): Promise<{ utilisateur: UtilisateurConnecte; jeton: string }> {
    const email = dto.email.trim().toLowerCase();
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
      throw new UnauthorizedException('Email ou mot de passe incorrect.');
    }

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
