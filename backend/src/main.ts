import { mkdirSync } from 'fs';
import { join } from 'path';
import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';
import { json, urlencoded } from 'express';
import { enProduction, entetesDeSecurite } from './securite';

// Taille maximale d'une requête.
//
// Express s'arrête à 100 Ko par défaut. Or les photos (de profil,
// d'établissement, d'événement) arrivent encodées en texte dans du JSON, ce
// qui les alourdit d'un tiers : une photo de 400 Ko en fait 540 une fois
// encodée. Sans cette ligne, Express les refusait AVANT que nos propres
// contrôles ne les voient — avec un message anglais incompréhensible
// (« request entity too large ») au lieu de « Image trop lourde (520 Ko,
// maximum 400 Ko) ».
//
// La limite reste basse : c'est un garde-fou contre un envoi démesuré, pas
// le contrôle de la taille des images. Celui-là est fait juste après, en
// français, par les règles de chaque type d'image.
const TAILLE_MAXIMALE_REQUETE = '1mb';

async function bootstrap() {
  mkdirSync(join(__dirname, '..', 'data'), { recursive: true });

  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  // Derrière un proxy, c'est lui qui sait si le visiteur est arrivé en HTTPS
  // et depuis quelle adresse.
  if (enProduction()) {
    app.set('trust proxy', 1);
  }

  app.use(json({ limit: TAILLE_MAXIMALE_REQUETE }));
  app.use(urlencoded({ extended: true, limit: TAILLE_MAXIMALE_REQUETE }));
  app.use(entetesDeSecurite);
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));

  const port = process.env.PORT ?? 3000;
  await app.listen(port);
  // eslint-disable-next-line no-console
  console.log(`Serveur démarré sur http://localhost:${port}`);
  if (!enProduction()) {
    // eslint-disable-next-line no-console
    console.log(
      'Mode développement : paiements et emails sont simulés, et le site tourne en HTTP.',
    );
  }
}

bootstrap();
