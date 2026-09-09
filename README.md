# Projet Commerçant

Application (escape game urbain géolocalisé connectant joueurs et commerçants locaux). Voir `docs/` pour les spécifications complètes du projet.

Ce dépôt contient, brique par brique, l'implémentation du projet.

- ✅ **Brique 1 : le profil joueur** — questionnaire à sliders et calcul des 4 scores d'archétypes de Bartle.
- ✅ **Brique 2 : les missions standards** — catalogue de missions consultable avec filtres (archétype, durée, thème, mode d'interaction).
- ✅ **Brique 3 : l'interface commerçant basique** — un commerçant crée son compte établissement, poste ses propres missions, et voit la liste de ce qu'il a publié.
- ✅ **Brique 4 : check-in et avis** — un joueur doit être physiquement sur place (position GPS vérifiée) pour pouvoir laisser un avis sur un lieu.
- ✅ **Brique 5 : accomplir une mission et portefeuille de crédits** — un joueur marque une mission comme accomplie, gagne du crédit, et choisit de le dépenser, le donner, ou l'accumuler.
- ⚠️ Le visuel des pages est volontairement basique pour l'instant (fonctionnel avant tout) — à retravailler plus tard.

---

## C'est quoi, concrètement, ce qui a été construit ?

Un petit site web (pas encore l'appli mobile finale — voir "Pourquoi le web d'abord ?" plus bas) où un joueur :
1. Crée un compte (pseudo + email)
2. Répond à 4 curseurs représentant des choix de personnalité opposés
3. Voit immédiatement son profil calculé sur 4 dimensions : **Explorateur**, **Accomplisseur**, **Compétiteur**, **Socialisateur**

Tout est dans le dossier `backend/` : c'est à la fois le serveur (l'API qui fait les calculs et stocke les données) et le site web lui-même (dossier `backend/public/`).

## Pourquoi le web d'abord ?

Les spécifications visent une vraie appli mobile (React Native) à terme. Mais pour tester rapidement une brique comme celle-ci sans avoir besoin d'installer Android Studio / Xcode, on démarre par une version web : même logique, même calcul, juste accessible depuis un navigateur. On migrera l'interface vers React Native une fois les briques de logique validées.

## Pourquoi SQLite et pas PostgreSQL ?

PostgreSQL (prévu dans les specs, pour plus tard) demande d'installer et de faire tourner un serveur de base de données séparé. SQLite, c'est juste un fichier (`backend/data/app.sqlite`), créé automatiquement, zéro configuration. La vérification de check-in (brique 4) ne demande pas encore PostGIS : la distance entre deux points GPS est calculée directement dans le code (formule de Haversine), pas par une requête géospatiale en base. On basculera vers PostgreSQL/PostGIS quand ça deviendra nécessaire (ex: "trouve tous les lieux à moins de 500m de moi" en une requête, section 4 des specs).

---

## Comment lancer le projet sur votre machine

### 1. Installer Node.js

Si ce n'est pas déjà fait : téléchargez et installez la version "LTS" depuis [nodejs.org](https://nodejs.org/). Vérifiez ensuite dans un terminal :

```bash
node -v
```

Vous devriez voir quelque chose comme `v20.x.x` ou plus récent.

### 2. Installer les dépendances du projet

Dans un terminal, placez-vous dans le dossier `backend/` du projet puis lancez :

```bash
cd backend
npm install
```

Cette commande télécharge tout ce dont le projet a besoin pour fonctionner. Elle peut prendre une minute ou deux.

### 3. Démarrer le serveur

Toujours dans le dossier `backend/` :

```bash
npm run start:dev
```

Vous devriez voir s'afficher `Serveur démarré sur http://localhost:3000`.

### 4. Ouvrir la page dans votre navigateur

Ouvrez [http://localhost:3000](http://localhost:3000) dans votre navigateur. Vous devriez voir la page "Ton profil de joueur". Créez un compte, répondez au questionnaire, et vérifiez que vos 4 scores s'affichent bien à la fin.

Un lien "Missions" en haut de la page mène au catalogue de missions (35 missions importées automatiquement depuis `docs/missions-catalogue.json` au premier démarrage), avec des filtres par archétype, durée, thème et mode d'interaction.

Un lien "Espace commerçant" permet à un établissement de créer son compte, de poster ses propres missions (elles apparaissent alors aussi dans le catalogue consulté par les joueurs), et de voir la liste de ce qu'il a publié.

Un lien "Lieux" liste les établissements partenaires sur une petite carte (avec un cercle indiquant la zone de 150m où le check-in est accepté) et en dessous sous forme de fiches. Un joueur peut s'y "check-in" (le navigateur demande l'accès à la position GPS) : le check-in n'est validé que si vous êtes à moins de 150m des coordonnées enregistrées par le commerçant. Une fois check-iné, un formulaire d'avis (note + commentaire) apparaît.

> **Pour tester ça vous-même en local** : créez d'abord un compte "Espace commerçant" (le navigateur enregistre votre position réelle comme coordonnées du lieu), puis allez sur "Lieux" et faites "Check-in" sur ce même lieu — comme vous êtes physiquement au même endroit, ça doit fonctionner. Sur un ordinateur de bureau (sans GPS), la position est parfois approximative (basée sur le wifi/l'IP) : si le check-in échoue en indiquant une distance de plusieurs centaines de mètres alors que vous êtes bien sur place, c'est une limite de précision de votre ordinateur, pas un bug — ça sera beaucoup plus fiable sur un téléphone avec un vrai GPS (futur usage prévu avec l'appli mobile).

Sur la page "Missions", chaque mission a un bouton **"J'ai terminé cette mission"** (visible une fois que vous avez un profil joueur). En cliquant, on vous demande ce que vous faites du crédit gagné : le **dépenser**, le **donner**, ou l'**accumuler** — seule l'accumulation garde le crédit dans votre solde disponible, les deux autres choix le "consomment" immédiatement (ce sont pour l'instant des actions symboliques, tracées comme un comportement, sans vraie transaction bancaire). Une mission postée par un commerçant (donc liée à un lieu) ne peut être marquée accomplie qu'après un check-in validé sur ce lieu. Votre solde et l'historique de vos gains/dépenses sont visibles sur la page "Mon profil".

### 5. Arrêter le serveur

Dans le terminal où il tourne, faites `Ctrl+C`.

> **Note** : les données créées (comptes, profils) sont stockées dans `backend/data/app.sqlite`, un simple fichier local. Si vous voulez repartir de zéro, supprimez ce fichier puis relancez le serveur.

---

## Comment vérifier que tout fonctionne correctement (tests automatiques)

Le calcul des scores d'archétypes et la formule de distance GPS sont couverts par des tests automatiques. Pour les lancer :

```bash
cd backend
npm test
```

Tout doit passer en vert (`6 passed`).

---

## Structure du projet

```
projet-commercants/
├── docs/                          Spécifications du projet (référence)
└── backend/
    ├── src/
    │   ├── users/                 Compte utilisateur (User)
    │   ├── players/               Profil joueur, questionnaire, calcul des scores
    │   │   ├── archetype-scoring.ts       ← la formule de calcul des 4 scores
    │   │   ├── archetype-scoring.spec.ts  ← ses tests
    │   │   ├── players.controller.ts      ← les routes de l'API
    │   │   └── players.service.ts         ← la logique métier
    │   ├── missions/              Catalogue de missions et consultation
    │   │   ├── mission.entity.ts
    │   │   ├── missions.service.ts        ← import du catalogue + filtres + création par un commerçant
    │   │   └── missions.controller.ts     ← les routes de consultation publique
    │   ├── businesses/            Compte et missions d'un commerçant
    │   │   ├── business.entity.ts
    │   │   ├── businesses.service.ts
    │   │   └── businesses.controller.ts   ← créer un compte, poster/lister ses missions, lister les lieux
    │   ├── checkins/              Check-in et avis
    │   │   ├── geo.ts / geo.spec.ts       ← distance GPS (Haversine) + seuil de validation
    │   │   ├── checkin.entity.ts / review.entity.ts
    │   │   ├── checkins.service.ts        ← vérifie la distance, exige un check-in pour un avis
    │   │   └── checkins.controller.ts     ← les routes de l'API
    │   └── wallet/                Accomplissement de mission et portefeuille
    │       ├── wallet.entity.ts / transaction.entity.ts
    │       ├── wallet.service.ts          ← crédite le joueur, exige un check-in si la mission a un lieu
    │       └── wallet.controller.ts       ← les routes de l'API
    └── public/                    La page web (HTML/CSS/JS) servie au joueur
        ├── utils.js                       ← échappement du texte affiché (sécurité)
        ├── index.html / app.js            ← profil joueur
        ├── missions.html / missions.js    ← consultation des missions
        ├── commercant.html / commercant.js ← espace commerçant
        ├── lieux.html / lieux.js          ← check-in, avis, carte des lieux
        └── vendor/leaflet/                ← bibliothèque de carte (embarquée, pas de CDN)
```

## Et après ?

D'après l'ordre de construction recommandé dans les specs (`docs/projet-commercant-specs.md`, section 7), la prochaine brique est : **le système de paiement et de ciblage** (plus complexe — à construire maintenant que le squelette des briques précédentes est validé).
