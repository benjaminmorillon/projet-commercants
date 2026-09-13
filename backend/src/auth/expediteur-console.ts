import { Injectable, Logger } from '@nestjs/common';
import { Email, ExpediteurEmail } from './expediteur-email';

/**
 * Expéditeur de démonstration : rien ne part vraiment, l'email est écrit dans
 * la console du serveur. Suffisant pour dérouler un « mot de passe oublié »
 * de bout en bout sans compte chez un fournisseur.
 */
@Injectable()
export class ExpediteurConsole implements ExpediteurEmail {
  readonly nom = 'console';
  readonly simule = true;

  private readonly logger = new Logger('Email');

  async envoyer(email: Email): Promise<void> {
    this.logger.log(
      `\n--- Email simulé ---\nÀ : ${email.destinataire}\nObjet : ${email.sujet}\n\n${email.corps}\n--------------------`,
    );
  }
}
