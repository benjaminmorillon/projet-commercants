/* eslint-disable no-console */
/**
 * Remplit la base avec un quartier de démonstration.
 *
 * Tout passe par les VRAIS services de l'application : les mêmes règles
 * s'appliquent qu'à un vrai utilisateur (limite de missions par jour,
 * fonctionnalités verrouillées, check-in à moins de 150 m, solde de jetons
 * suffisant). Une action refusée est signalée et la simulation continue —
 * c'est justement ce qui rend la démonstration crédible.
 *
 *   npm run demo
 */
import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { AuthService } from '../auth/auth.service';
import { BusinessesService } from '../businesses/businesses.service';
import { CampaignsService } from '../campaigns/campaigns.service';
import { CheckinsService } from '../checkins/checkins.service';
import { DuosService } from '../duos/duos.service';
import { EventsService } from '../events/events.service';
import { FriendsService } from '../friends/friends.service';
import { JetonsService } from '../ledger/jetons.service';
import { LedgerService } from '../ledger/ledger.service';
import { MissionsService } from '../missions/missions.service';
import { PlayersService } from '../players/players.service';
import { ValidationsService } from '../validations/validations.service';
import { EVENEMENTS, JOUEURS, LIEUX } from './donnees-demo';

interface Journal {
  faits: string[];
  refus: string[];
}

/** Exécute une action en laissant la simulation continuer si elle est refusée. */
async function essayer<T>(
  journal: Journal,
  intitule: string,
  action: () => Promise<T>,
): Promise<T | null> {
  try {
    const resultat = await action();
    journal.faits.push(intitule);
    return resultat;
  } catch (erreur) {
    journal.refus.push(`${intitule} — refusé : ${(erreur as Error).message}`);
    return null;
  }
}

async function main() {
  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: ['error', 'warn'],
  });

  const auth = app.get(AuthService);
  const players = app.get(PlayersService);
  const businesses = app.get(BusinessesService);
  const missionsService = app.get(MissionsService);
  const jetons = app.get(JetonsService);
  const checkins = app.get(CheckinsService);
  const validations = app.get(ValidationsService);
  const duos = app.get(DuosService);
  const events = app.get(EventsService);
  const campaigns = app.get(CampaignsService);
  const friends = app.get(FriendsService);
  const ledger = app.get(LedgerService);

  const journal: Journal = { faits: [], refus: [] };

  console.log('\n◆ Quartier de démonstration — Le Marais / Oberkampf\n');

  // --- 1. Les commerçants, leurs lieux, leurs missions et leurs jetons ------

  const lieux: { id: string; userId: string; nom: string; missions: string[] }[] = [];

  for (const lieu of LIEUX) {
    const { utilisateur } = await auth.inscrire({
      email: lieu.email,
      pseudo: lieu.nom,
      motDePasse: lieu.motDePasse,
      type: 'commercant',
    });

    const business = await businesses.createBusiness(utilisateur.id, {
      nom: lieu.nom,
      adresse: lieu.adresse,
      latitude: lieu.latitude,
      longitude: lieu.longitude,
      typeEtablissement: lieu.typeEtablissement,
      capaciteEstimee: lieu.capaciteEstimee,
    });

    const idsMissions: string[] = [];
    for (const mission of lieu.missions) {
      const creee = await missionsService.createForBusiness(business.id, mission as never);
      idsMissions.push(creee.id);
    }

    await jetons.recharger(utilisateur.id, lieu.rechargement);

    lieux.push({ id: business.id, userId: utilisateur.id, nom: lieu.nom, missions: idsMissions });
    journal.faits.push(
      `${lieu.nom} : compte créé, ${lieu.missions.length} mission(s) publiée(s), ${lieu.rechargement} jetons rechargés`,
    );
  }

  // --- 2. Les joueurs et leur questionnaire --------------------------------

  const joueurs: { id: string; pseudo: string }[] = [];

  for (const joueur of JOUEURS) {
    const { utilisateur } = await auth.inscrire({
      email: joueur.email,
      pseudo: joueur.pseudo,
      motDePasse: joueur.motDePasse,
    });
    await players.submitQuestionnaire(utilisateur.id, {
      decouverteHabitude: joueur.curseurs[0],
      competitionCooperation: joueur.curseurs[1],
      seulGroupe: joueur.curseurs[2],
      objectifImprovisation: joueur.curseurs[3],
    });
    joueurs.push({ id: utilisateur.id, pseudo: joueur.pseudo });
    journal.faits.push(`${joueur.pseudo} : compte créé et questionnaire rempli`);
  }

  // --- 3. Les visites sur place et les avis --------------------------------

  for (const [index, joueur] of JOUEURS.entries()) {
    for (const indexLieu of joueur.visites) {
      const lieu = LIEUX[indexLieu];
      await essayer(journal, `${joueur.pseudo} passe au ${lieu.nom}`, () =>
        checkins.checkIn(lieux[indexLieu].id, {
          playerId: joueurs[index].id,
          latitude: lieu.latitude,
          longitude: lieu.longitude,
        }),
      );
    }

    for (const avis of joueur.avis ?? []) {
      await essayer(journal, `${joueur.pseudo} laisse un avis sur ${LIEUX[avis.lieu].nom}`, () =>
        checkins.createReview(lieux[avis.lieu].id, {
          playerId: joueurs[index].id,
          note: avis.note,
          commentaire: avis.commentaire,
        }),
      );
    }
  }

  // --- 4. Des missions accomplies, validées par un tiers -------------------

  // Chaque joueur demande la validation d'une mission du lieu où il est passé ;
  // le commerçant confirme. La limite de missions par jour s'applique.
  const missionsSolo = (indexLieu: number) =>
    LIEUX[indexLieu].missions
      .map((mission, i) => ({ mission, id: lieux[indexLieu].missions[i] }))
      .filter((m) => m.mission.modeInteraction === 'solo');

  for (const [index, joueur] of JOUEURS.entries()) {
    for (const indexLieu of joueur.visites) {
      for (const { mission, id } of missionsSolo(indexLieu)) {
        const demande = await essayer(
          journal,
          `${joueur.pseudo} accomplit « ${mission.titre} »`,
          () =>
            validations.requestValidation(joueurs[index].id, id, {
              choix: index % 3 === 0 ? 'accumulation' : 'depense',
            }),
        );
        if (demande) {
          await essayer(
            journal,
            `${LIEUX[indexLieu].nom} valide la mission de ${joueur.pseudo}`,
            () => validations.resolve(demande.id, 'validee', lieux[indexLieu].userId),
          );
        }
      }
    }
  }

  // Une mission du catalogue commun (celles sans lieu), validée entre joueurs :
  // c'est le cas où le validateur est un autre joueur désigné par son pseudo.
  const catalogue = (await missionsService.findAll({ modeInteraction: 'solo' } as never)).filter(
    (mission) => !mission.businessId,
  );
  if (catalogue.length > 0) {
    const choisie = catalogue[0];
    const demande = await essayer(
      journal,
      `Raphaël accomplit « ${choisie.titre} » (mission du catalogue)`,
      () =>
        validations.requestValidation(joueurs[1].id, choisie.id, {
          choix: 'don',
          validatorPseudo: 'Inès',
        }),
    );
    if (demande) {
      await essayer(journal, 'Inès valide la mission de Raphaël', () =>
        validations.resolve(demande.id, 'validee', joueurs[2].id),
      );
    }
  }

  // --- 5. Des amitiés ------------------------------------------------------

  const amities: [number, number][] = [
    [0, 2],
    [1, 5],
    [0, 4],
  ];
  for (const [a, b] of amities) {
    const demande = await essayer(
      journal,
      `${JOUEURS[a].pseudo} envoie une demande d'ami à ${JOUEURS[b].pseudo}`,
      () => friends.sendRequest(joueurs[a].id, { pseudo: JOUEURS[b].pseudo }),
    );
    if (demande) {
      await essayer(journal, `${JOUEURS[b].pseudo} accepte`, () =>
        friends.resolve(demande.id, 'acceptee', joueurs[b].id),
      );
    }
  }

  // --- 6. Un duo ----------------------------------------------------------

  const duo = await essayer(journal, 'Camille cherche un binôme', () =>
    duos.proposer(joueurs[0].id, { typeMatching: 'affinite_naturelle' }),
  );
  if (duo) {
    // L'appariement choisit lui-même le partenaire, et son identité reste
    // cachée : on le retrouve comme le ferait son application, en cherchant
    // à qui ce duo apparaît comme une invitation à accepter.
    let invite: { id: string; pseudo: string } | undefined;
    for (const candidat of joueurs.slice(1)) {
      const sesDuos = await duos.listerPourJoueur(candidat.id);
      if (sesDuos.some((d) => d.id === duo.id && d.monStatut === 'invite')) {
        invite = candidat;
        break;
      }
    }

    if (invite) {
      await essayer(journal, `${invite.pseudo} accepte le duo avec Camille`, () =>
        duos.repondre(duo.id, invite.id, true),
      );
    }
  }

  // --- 7. Des événements et des campagnes de ciblage -----------------------

  for (const evenement of EVENEMENTS) {
    const date = new Date();
    date.setDate(date.getDate() + evenement.dansNJours);
    date.setHours(20, 0, 0, 0);

    const cree = await essayer(
      journal,
      `${LIEUX[evenement.lieu].nom} publie « ${evenement.titre} »`,
      () =>
        events.create(lieux[evenement.lieu].id, {
          titre: evenement.titre,
          description: evenement.description,
          dateDebut: date.toISOString(),
        }),
    );

    if (cree) {
      await essayer(
        journal,
        `${LIEUX[evenement.lieu].nom} invite les profils sociables`,
        () =>
          campaigns.create(lieux[evenement.lieu].id, {
            type: 'invitation',
            eventId: cree.id,
            message:
              'On vous garde une place : venez avec quelqu’un, c’est plus drôle. Première consommation offerte pour les deux.',
            montantParCible: 2,
            minSocialisateur: 55,
          } as never),
      );
    }
  }

  await essayer(journal, 'Bistrot du Marais lance une publicité large', () =>
    campaigns.create(lieux[1].id, {
      type: 'publicite',
      message:
        'Notre plat hors carte change chaque soir. Passez voir l’ardoise, il n’y en a jamais plus de dix.',
      montantParCible: 1.5,
    } as never),
  );

  // --- 8. Des jetons dépensés chez les partenaires -------------------------

  const depenses: [number, number, number][] = [
    [0, 0, 2],
    [2, 3, 3],
    [1, 1, 1.5],
  ];
  for (const [joueur, lieu, montant] of depenses) {
    await essayer(
      journal,
      `${JOUEURS[joueur].pseudo} règle ${montant} jetons au ${LIEUX[lieu].nom}`,
      () => jetons.payerChezPartenaire(joueurs[joueur].id, lieux[lieu].id, montant),
    );
  }

  // --- Bilan ---------------------------------------------------------------

  const coherence = await ledger.verifierCoherence();

  console.log('Ce qui s’est passé :');
  journal.faits.forEach((fait) => console.log(`  · ${fait}`));

  if (journal.refus.length > 0) {
    console.log('\nCe que les règles ont refusé (c’est normal, et c’est le but) :');
    journal.refus.forEach((refus) => console.log(`  · ${refus}`));
  }

  console.log('\n── Comptes de démonstration ─────────────────────────────────');
  console.log('\nCommerçants (espace commerçant) :');
  LIEUX.forEach((lieu) => console.log(`  ${lieu.nom.padEnd(22)} ${lieu.email.padEnd(32)} ${lieu.motDePasse}`));
  console.log('\nJoueurs :');
  JOUEURS.forEach((joueur) =>
    console.log(`  ${joueur.pseudo.padEnd(22)} ${joueur.email.padEnd(32)} ${joueur.motDePasse}`),
  );

  console.log(
    `\nRegistre de jetons : ${coherence.coherent ? 'cohérent ✓' : `INCOHÉRENT (${coherence.ecarts.length} écart(s))`}`,
  );
  console.log('\n→ Lancez `npm start`, puis ouvrez http://localhost:3000\n');

  await app.close();
}

main().catch((erreur) => {
  console.error('La simulation a échoué :', erreur);
  process.exit(1);
});
