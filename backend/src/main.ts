import { mkdirSync } from 'fs';
import { join } from 'path';
import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';
import { enProduction, entetesDeSecurite } from './securite';

async function bootstrap() {
  mkdirSync(join(__dirname, '..', 'data'), { recursive: true });

  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  // Derrière un proxy, c'est lui qui sait si le visiteur est arrivé en HTTPS
  // et depuis quelle adresse.
  if (enProduction()) {
    app.set('trust proxy', 1);
  }

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
