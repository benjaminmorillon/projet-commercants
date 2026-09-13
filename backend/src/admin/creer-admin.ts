/* eslint-disable no-console */
/**
 * Donne le droit d'administration à un compte.
 *
 *   npm run admin -- mon.email@exemple.fr
 *   npm run admin -- mon.email@exemple.fr "un-mot-de-passe-solide"
 *
 * Si le compte existe, il est promu. S'il n'existe pas et qu'un mot de passe
 * est fourni, il est créé puis promu.
 *
 * C'est volontairement la SEULE façon de fabriquer le premier administrateur :
 * aucune page web ne peut accorder ce droit à partir de rien, donc personne ne
 * peut se l'accorder à soi-même en s'inscrivant.
 */
import { NestFactory } from '@nestjs/core';
import { Repository } from 'typeorm';
import { getRepositoryToken } from '@nestjs/typeorm';
import { AppModule } from '../app.module';
import { AuthService } from '../auth/auth.service';
import { User } from '../users/user.entity';

async function main(): Promise<void> {
  const [email, motDePasse] = process.argv.slice(2);

  if (!email) {
    console.error('Usage : npm run admin -- <email> [mot-de-passe]');
    process.exitCode = 1;
    return;
  }

  const contexte = await NestFactory.createApplicationContext(AppModule, {
    logger: ['error', 'warn'],
  });

  try {
    const users: Repository<User> = contexte.get(getRepositoryToken(User));
    const auth = contexte.get(AuthService);
    const normalise = email.trim().toLowerCase();

    let user = await users.findOne({ where: { email: normalise } });

    if (!user) {
      if (!motDePasse) {
        console.error(`Aucun compte avec l'adresse ${normalise}.`);
        console.error('Ajoute un mot de passe pour le créer :');
        console.error(`  npm run admin -- ${normalise} "mot-de-passe"`);
        process.exitCode = 1;
        return;
      }

      // On passe par l'inscription normale : mêmes règles de mot de passe,
      // même hachage, même création de profil qu'un compte ordinaire.
      await auth.inscrire({
        email: normalise,
        motDePasse,
        pseudo: normalise.split('@')[0].slice(0, 40),
        type: 'particulier',
      });

      user = await users.findOne({ where: { email: normalise } });
      console.log(`Compte créé pour ${normalise}.`);
    }

    if (!user) {
      console.error("Le compte n'a pas pu être créé.");
      process.exitCode = 1;
      return;
    }

    if (user.administrateur) {
      console.log(`${normalise} est déjà administrateur. Rien à faire.`);
      return;
    }

    await users.update({ id: user.id }, { administrateur: true });
    console.log(`${normalise} est maintenant administrateur.`);
    console.log("Ouvre http://localhost:3000/admin.html pour accéder à l'espace.");
  } finally {
    await contexte.close();
  }
}

main().catch((erreur) => {
  console.error(erreur);
  process.exitCode = 1;
});
