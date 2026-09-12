# Projet Commerçant

Application (escape game urbain géolocalisé connectant joueurs et commerçants locaux). Voir `docs/` pour les spécifications complètes du projet.

Ce dépôt contient, brique par brique, l'implémentation du projet.

- ✅ **Brique 1 : le profil joueur** — questionnaire à sliders et calcul des 4 scores d'archétypes de Bartle.
- ✅ **Brique 2 : les missions standards** — catalogue de missions consultable avec filtres (archétype, durée, thème, mode d'interaction).
- ✅ **Brique 3 : l'interface commerçant basique** — un commerçant crée son compte établissement, poste ses propres missions, et voit la liste de ce qu'il a publié.
- ✅ **Brique 4 : check-in et avis** — un joueur doit être physiquement sur place (position GPS vérifiée) pour pouvoir laisser un avis sur un lieu.
- ✅ **Brique 5 : accomplir une mission et portefeuille de crédits** — un joueur marque une mission comme accomplie, gagne du crédit, et choisit de le dépenser, le donner, ou l'accumuler.
- ✅ **Brique 6 : validation des missions par un tiers** — une mission n'est créditée qu'une fois confirmée par un tiers (le commerçant si la mission est liée à un lieu, avec check-in GPS obligatoire en plus ; sinon un autre joueur désigné), via un onglet "Validation" avec pop-up de confirmation.
- ✅ **Brique 7 : système d'amis** — ajouter un ami par pseudo, accepter/refuser une demande, et consulter le profil (scores + missions accomplies) d'un ami.
- ✅ **Brique 8 : espace professionnel** — carte de la concurrence avec filtres, création d'événements en quelques clics, ciblage de joueurs (curseurs de profil, missions réussies, somme allouée par personne), message + image envoyés aux cibles, qui acceptent ou refusent et laissent un retour que le commerçant voit.
- ✅ **Brique 9 : rééquilibrage dynamique de la fréquentation** — les lieux de qualité encore peu fréquentés font gagner plus au joueur et paient moins cher leur ciblage ; les lieux saturés au regard de leur note, l'inverse.
- ✅ **Brique 10 : profil vivant** — le profil n'est plus figé après le questionnaire : chaque action (découverte d'un lieu, mission accomplie, ami ajouté, invitation acceptée) le déplace en moyenne mobile, et le joueur voit ce qui l'a fait bouger.
- ✅ **Brique 11 : progression** — XP gagnée à chaque action, niveaux à paliers croissants, et 8 badges qui se débloquent tout seuls.
- ✅ **Brique 12 : missions duo et matching** — l'appli trouve un binôme selon l'affinité ou la complémentarité des profils, propose une mission brise-glace dans un lieu sous-fréquenté, garde le partenaire secret jusqu'à l'accord des deux, et chacun valide l'autre à la fin.
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

Sur la page "Missions", chaque mission a un bouton **"J'ai terminé cette mission"** (visible une fois que vous avez un profil joueur). En cliquant, on vous demande ce que vous ferez du crédit une fois validé : le **dépenser**, le **donner**, ou l'**accumuler** — seule l'accumulation garde le crédit dans votre solde disponible, les deux autres choix le "consomment" immédiatement (ce sont pour l'instant des actions symboliques, tracées comme un comportement, sans vraie transaction bancaire).

**La mission n'est pas créditée tout de suite : elle doit d'abord être validée par un tiers**, différent selon le type de mission :
- **Mission postée par un commerçant** (liée à un lieu) → il faut d'abord être **check-iné** sur ce lieu (page "Lieux", position GPS à moins de 150m), sinon la demande de validation est refusée. Une fois check-iné, c'est le **commerçant** qui valide — aucun champ à remplir, la demande part automatiquement vers son compte. Double vérification donc : le GPS prouve que vous étiez sur place, le commerçant confirme que la mission a bien été faite.
- **Mission du catalogue de départ** (pas liée à un lieu) → vous désignez **un autre joueur** en tapant son pseudo exact, c'est lui qui valide.

Le validateur retrouve les demandes en attente sur l'onglet **"Validation"** : chaque demande s'ouvre dans une pop-up avec les détails de la mission et deux boutons, **Valider** ou **Refuser**. Ce n'est qu'au clic sur "Valider" que le crédit est réellement ajouté au portefeuille du joueur. Une demande refusée peut être retentée. Votre solde et l'historique de vos gains/dépenses sont visibles sur la page "Mon profil".

> **Pour tester ça vous-même en local** : ouvrez deux fenêtres de navigateur différentes (ou une fenêtre normale + une fenêtre de navigation privée, pour avoir deux comptes séparés). Créez un profil joueur dans chacune, notez les deux pseudos, puis dans la première demandez la validation d'une mission catalogue en tapant le pseudo du second profil. Allez sur "Validation" dans la deuxième fenêtre pour valider.

> **Note sur la "pop-up de validation"** : c'est une fenêtre qui s'affiche dans la page dès que vous ouvrez l'onglet "Validation" et cliquez sur une demande — pas une notification push envoyée sur le téléphone en temps réel (ça demanderait une brique technique supplémentaire, à envisager plus tard si besoin).

### L'espace commerçant

L'onglet **"Espace commerçant"** est organisé en trois écrans (conformément aux specs : un tableau de bord utilisable sans formation) :

1. **Mon activité** — créer un événement en trois champs (titre, description, date, plus une affiche optionnelle), poster une mission, et voir ce qui est déjà publié.
2. **Ciblage** — c'est le cœur du modèle économique. Le commerçant choisit :
   - le **type d'envoi** : invitation à un de ses événements, ou publicité (message seul) ;
   - le **message** et une **image** optionnelle ;
   - **qui il veut toucher** : quatre curseurs (un par archétype, chacun étant un score minimum) et un nombre minimum de missions réussies ;
   - la **somme allouée par personne** (ex : 0,30 €).
   
   Un encart se met à jour en direct : *« 3 joueurs ciblés · 0,90 € au total · 0,24 € reversés à chacun »*, avec quelques pseudos en exemple. Il n'y a plus qu'à envoyer. Les joueurs ciblés reçoivent l'invitation et **acceptent ou refusent**, en laissant une réaction ("Ça m'intéresse", "Trop loin"...) et un commentaire libre. Le commerçant retrouve tout ça dans **"Résultats de tes campagnes"** : combien ont accepté, refusé, et ce que chacun en a pensé.
   
   > **Le crédit part dès l'envoi** : être ciblé suffit pour toucher sa part, que le joueur accepte, refuse ou ne réponde jamais. Répondre ne sert qu'à dire au commerçant si ça intéresse. Le partage suit la section 3.4 des specs : 80 % de la somme allouée va au joueur (0,24 € sur 0,30 €), le reste étant la marge de la plateforme. Comme pour le reste du prototype, aucun paiement réel n'est branché : ce sont des montants calculés et tracés, pas des transactions bancaires.
3. **Concurrence** — une carte de tous les établissements partenaires (le sien en violet, les autres en gris), avec des filtres par type, note minimum et nombre de missions proposées. Chaque fiche affiche note, nombre de missions et fréquentation (check-ins), pour se situer par rapport aux autres.

Côté joueur, l'onglet **"Invitations"** liste ce que les établissements proposent, avec l'image, le message et l'événement s'il y en a un. Le crédit est déjà versé à la réception ; les boutons "Ça m'intéresse" / "Pas intéressé" servent uniquement à renvoyer l'information au commerçant.

### Le profil vivant

Le questionnaire ne donne qu'un point de départ. Ensuite, **chaque action déplace le profil** (section 2.1 des specs). Les actions déjà branchées :

| Action | Effet |
|---|---|
| Check-in dans un lieu jamais visité | ++ Explorateur |
| Retour dans un lieu déjà visité | − Explorateur, + Accomplisseur |
| Mission solo accomplie | ++ Accomplisseur, − Socialisateur |
| Mission duo/groupe accomplie | ++ Socialisateur, + Accomplisseur |
| Mission d'archétype compétiteur accomplie | ++ Compétiteur, + Accomplisseur |
| Avis publié | + Explorateur |
| Ami ajouté (des deux côtés) | ++ Socialisateur |
| Invitation d'un commerçant acceptée | ++ Socialisateur, + Explorateur |
| Crédit donné à une cause | tracé, sans effet — il alimentera le futur axe "impact/générosité" (section 2.5) |

Le calcul est une **moyenne mobile** : à chaque événement, un score ne parcourt que 8 % de la distance qui le sépare de son extrême. Un seul événement bouge donc à peine le profil (+4 points), c'est la répétition qui compte — et les pas se réduisent au fur et à mesure (4 → 3,7 → 3,4...), si bien qu'un score ne peut jamais sortir de 0–100. Sur la page **"Mon profil"**, le joueur voit ses scores à jour et la liste de ce qui les a déplacés, action par action.

### Les duos

C'est le cœur du projet : *« le prétexte, c'est la mission — l'important, c'est la rencontre »*. Depuis l'onglet **"Duos"**, un joueur demande un binôme selon deux modes :

- **Affinité naturelle** — quelqu'un avec qui ça devrait couler tout seul ;
- **Défi de complémentarité** — un profil à l'opposé, plus rare, plus fort si ça marche.

L'appariement suit le tableau de `docs/guide-missions-sociales.md` (explorateur + socialisateur et accomplisseur + compétiteur sont "naturelles", compétiteur + socialisateur et accomplisseur + explorateur sont des "défis"), puis départage les candidats sur l'écart de profil — faible en affinité, fort en défi. Trois détails fidèles aux specs :

- **La mission proposée est une brise-glace** quand il en existe une : on ne demande pas un gros effort à deux inconnus dès le premier contact (section 2.7).
- **Le point de rendez-vous est un lieu sous-fréquenté de qualité**, choisi via le multiplicateur de rééquilibrage (section 2.2).
- **Le partenaire reste "Partenaire mystère"** tant que les deux n'ont pas accepté, pour garder le suspense (`statut_révélation` des specs).

À la fin, **chacun confirme de son côté** : c'est la validation entre partenaires pour les missions à plusieurs. Quand les deux ont confirmé, tous les deux sont crédités (récompense × multiplicateur du lieu), leur profil et leur XP bougent, et le résultat est enregistré dans `PairingOutcome`.

> **Le matching apprend.** Ces résultats alimentent un taux de réussite par combinaison d'archétypes, qui départage ensuite les candidats — le "fonctionnent bien ensemble historiquement" des specs. L'historique ne pèse qu'à partir de quelques duos et ne peut jamais sauver ni couler un appariement à lui seul, juste trancher entre candidats proches.

### La progression

Par-dessus le crédit monétaire, chaque action rapporte de l'**XP** (section 2.9 des specs) : 25 pour un lieu inédit, 35 pour une mission à plusieurs, 30 pour un défi compétitif, 20 pour une mission solo ou un ami, 15 pour un don ou une invitation acceptée, 10 pour un avis, 5 pour un retour dans un lieu connu.

Les **niveaux** demandent 100 XP de plus à chaque palier (niveau 2 à 100 XP, niveau 3 à 300, niveau 4 à 600...), donc la montée ralentit naturellement. Huit **badges** se débloquent tout seuls dès que la condition est remplie : première mission, 5 puis 15 lieux différents, 5 missions, première mission à plusieurs, 3 avis, 3 amis, premier don. La page "Mon profil" affiche le niveau, la barre d'XP vers le palier suivant, les badges obtenus et ceux qui restent à débloquer (grisés, avec leur condition).

> Les badges sont recalculés à partir du **journal d'événements** : c'est la même source de vérité que le profil vivant, pas des compteurs tenus en parallèle qui pourraient diverger.

### Le rééquilibrage de la fréquentation

C'est le principe central des specs (section 4) : pousser les joueurs vers les lieux **qualitatifs mais sous-fréquentés**, sans jamais avantager un lieu simplement parce qu'il est vide. Chaque établissement reçoit un **multiplicateur**, recalculé à la volée :

- **taux d'occupation** = check-ins des 14 derniers jours ÷ capacité estimée ;
- **score qualité** = note moyenne des avis internes (à défaut, la note Google), normalisée sur la plage utile 2,5–5 — en dessous de 2,5/5, un lieu n'est pas poussé même s'il est vide ;
- **multiplicateur** = 100 % + (qualité − occupation) × 60 %, borné entre 70 % et 110 %.

Ce qu'il change concrètement, mesuré sur deux lieux de test :

| | La Pépite (5★, 3 visites, capacité 100) | Le Saturé (3★, 12 visites, capacité 10) |
|---|---|---|
| Multiplicateur | **110 %** | **70 %** |
| Mission à 2 crédits de base | le joueur touche **2,20** | le joueur touche **1,40** |
| Ciblage à 0,30 € alloués | le lieu paie **0,27 €** | le lieu paie **0,43 €** |
| Crédit reçu par la cible | 0,24 € | 0,24 € |

Le joueur voit un badge vert **"+10 % ici"** sur la carte et les fiches des lieux boostés. Le commerçant voit son tarif ajusté expliqué en clair dans l'aperçu de ciblage ("Tarif réduit de 9 % : ton lieu est bien noté mais encore peu fréquenté").

> **Choix à valider** : les specs disent que le tarif de ciblage est ajusté "par le même multiplicateur", tout en précisant qu'un commerçant sous-fréquenté doit payer *moins* cher. Pour que les deux soient vrais, le tarif est **divisé** par le multiplicateur (là où les récompenses sont multipliées). La marge de la plateforme reste positive sur toute la plage (0,03 € au minimum, à 110 %).

### Les amis

L'onglet **"Amis"** permet d'ajouter un joueur en tapant son pseudo exact (recherche par pseudo comme pour la validation — un vrai carnet d'adresses/suggestions viendra plus tard). La personne voit la demande arriver dans "Demandes reçues" et clique Accepter ou Refuser. Une fois amis, chacun peut cliquer "Voir le profil" de l'autre pour voir ses 4 scores d'archétype et ses missions récemment accomplies — **réservé aux amis** : un joueur qui n'est pas ami ne peut pas consulter ce profil (testé côté API, retourne une erreur).

### 5. Arrêter le serveur

Dans le terminal où il tourne, faites `Ctrl+C`.

> **Note** : les données créées (comptes, profils) sont stockées dans `backend/data/app.sqlite`, un simple fichier local. Si vous voulez repartir de zéro, supprimez ce fichier puis relancez le serveur.

---

## Comment vérifier que tout fonctionne correctement (tests automatiques)

Le calcul des scores d'archétypes, la formule de distance GPS, le multiplicateur de rééquilibrage, le moteur d'évolution du profil, le barème d'XP/badges et le matching des duos sont couverts par des tests automatiques. Pour les lancer :

```bash
cd backend
npm test
```

Tout doit passer en vert (`39 passed`).

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
    │   ├── wallet/                Portefeuille (crédité uniquement sur validation)
    │   │   ├── wallet.entity.ts / transaction.entity.ts
    │   │   ├── wallet.service.ts          ← applique le gain, appelé par le module validations
    │   │   └── wallet.controller.ts       ← GET du solde + historique
    │   ├── validations/           Validation d'une mission par un tiers
    │   │   ├── mission-validation.entity.ts
    │   │   ├── validations.service.ts     ← détermine le validateur (commerçant ou joueur), résout la demande
    │   │   ├── player-validations.controller.ts   ← demander une validation, ses propres demandes
    │   │   ├── business-validations.controller.ts ← demandes à valider (commerçant)
    │   │   └── validations.controller.ts  ← valider / refuser
    │   ├── friends/                Système d'amis
    │   │   ├── friendship.entity.ts
    │   │   ├── friends.service.ts         ← demande, accepte/refuse, liste, profil d'un ami (réservé aux amis)
    │   │   ├── player-friends.controller.ts
    │   │   └── friend-requests.controller.ts      ← accepter / refuser
    │   ├── events/                Événements organisés par un commerçant
    │   │   ├── event.entity.ts
    │   │   ├── events.service.ts
    │   │   └── events.controller.ts
    │   ├── player-events/        Profil vivant (moteur d'événements)
    │   │   ├── event-weights.ts / .spec.ts        ← poids par action + moyenne mobile
    │   │   ├── player-event.entity.ts
    │   │   └── player-events.service.ts   ← enregistre l'action, recalcule le profil
    │   ├── duos/                 Missions à plusieurs et matching
    │   │   ├── matching.ts / .spec.ts             ← affinité, complémentarité, choix du lieu
    │   │   ├── group-mission.entity.ts / group-mission-participant.entity.ts
    │   │   ├── pairing-outcome.entity.ts          ← ce que le duo a donné, pour apprendre
    │   │   └── duos.service.ts            ← proposer, accepter, valider mutuellement
    │   ├── progression/          XP, niveaux et badges
    │   │   ├── xp-rules.ts / .spec.ts             ← barème, courbe de niveaux, catalogue de badges
    │   │   ├── player-progression.entity.ts / player-badge.entity.ts
    │   │   └── progression.service.ts     ← crédite l'XP et attribue les badges
    │   ├── balancing/            Rééquilibrage de la fréquentation
    │   │   ├── place-multiplier.ts / .spec.ts     ← la formule et ses tests
    │   │   └── balancing.service.ts       ← visites 14 jours, note, multiplicateur par lieu
    │   └── campaigns/             Ciblage : campagnes, cibles et retours
    │       ├── campaign.entity.ts / campaign-target.entity.ts
    │       ├── campaigns.service.ts       ← matching des profils, aperçu du coût, crédit à l'acceptation
    │       ├── business-campaigns.controller.ts   ← aperçu, envoi, résultats
    │       └── invitations.controller.ts  ← boîte de réception du joueur, accepter / refuser
    └── public/                    La page web (HTML/CSS/JS) servie au joueur
        ├── utils.js                       ← échappement du texte affiché (sécurité)
        ├── index.html / app.js            ← profil joueur + portefeuille
        ├── missions.html / missions.js    ← consultation des missions, demande de validation
        ├── validation.html / validation.js ← pop-up de validation (joueur et/ou commerçant)
        ├── amis.html / amis.js            ← demandes d'ami, liste, profil d'un ami
        ├── invitations.html / invitations.js ← invitations reçues, accepter/refuser + réaction
        ├── commercant.html / commercant.js ← espace commerçant (activité / ciblage / concurrence)
        ├── lieux.html / lieux.js          ← check-in, avis, carte des lieux
        └── vendor/leaflet/                ← bibliothèque de carte (embarquée, pas de CDN)
```

## Et après ?

Les grandes briques des specs encore ouvertes :

- **Déblocage progressif** (section 2.9) — carte voilée au départ, fonctionnalités et missions qui s'ouvrent avec le niveau.
- **Titres et objets de collection** (section 2.9) — le reste du système de récompenses.
