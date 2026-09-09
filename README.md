# Projet Commerçant

Application (escape game urbain géolocalisé connectant joueurs et commerçants locaux). Voir `docs/` pour les spécifications complètes du projet.

Ce dépôt contient, brique par brique, l'implémentation du projet. **Brique 1 (en cours) : le profil joueur** — questionnaire à sliders et calcul des 4 scores d'archétypes de Bartle.

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

PostgreSQL (prévu dans les specs, pour plus tard) demande d'installer et de faire tourner un serveur de base de données séparé. SQLite, c'est juste un fichier (`backend/data/app.sqlite`), créé automatiquement, zéro configuration. On basculera vers PostgreSQL quand on ajoutera la géolocalisation (section 4 des specs), qui nécessite l'extension PostGIS de Postgres.

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

### 5. Arrêter le serveur

Dans le terminal où il tourne, faites `Ctrl+C`.

> **Note** : les données créées (comptes, profils) sont stockées dans `backend/data/app.sqlite`, un simple fichier local. Si vous voulez repartir de zéro, supprimez ce fichier puis relancez le serveur.

---

## Comment vérifier que tout fonctionne correctement (tests automatiques)

Le calcul des scores d'archétypes est couvert par des tests automatiques. Pour les lancer :

```bash
cd backend
npm test
```

Tout doit passer en vert (`3 passed`).

---

## Structure du projet

```
projet-commercants/
├── docs/                          Spécifications du projet (référence)
└── backend/
    ├── src/
    │   ├── users/                 Compte utilisateur (User)
    │   └── players/               Profil joueur, questionnaire, calcul des scores
    │       ├── archetype-scoring.ts       ← la formule de calcul des 4 scores
    │       ├── archetype-scoring.spec.ts  ← ses tests
    │       ├── players.controller.ts      ← les routes de l'API
    │       └── players.service.ts         ← la logique métier
    └── public/                    La page web (HTML/CSS/JS) servie au joueur
```

## Et après ?

D'après l'ordre de construction recommandé dans les specs (`docs/projet-commercant-specs.md`, section 7), la prochaine brique est : **les missions standards** (création et consultation, sans logique IA). Le catalogue de missions de départ est déjà prêt dans `docs/missions-catalogue.json`.
