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
- ✅ **Brique 13 : la carte 3D** — une carte plein écran qu'on parcourt comme un plan Google (on incline, on tourne, on zoome), où les partenaires apparaissent avec leur étiquette et leurs missions en éventail (solo ou duo), et où un clic ouvre la fiche du partenaire avec ses missions, ses avis et le check-in.
- ✅ **Brique 14 : déblocage progressif** — tutoriel obligatoire en 3 étapes, carte voilée qu'on lève quartier par quartier en allant sur place, nombre de missions limité par jour, et fonctionnalités (profils des autres, duos, don) qui s'ouvrent au fil de la progression.
- ✅ **Brique 15 : titres et objets de collection** — une étiquette gagnée par le comportement, que le joueur choisit d'afficher sur son profil, et deux séries d'objets souvenirs à compléter (un par type de lieu poussé, un par thème de mission mené jusqu'au bout).
- ✅ **Brique 20 : prêt pour la mise en ligne** — mot de passe oublié, limitation des tentatives de connexion, en-têtes de sécurité et redirection HTTPS.
- ✅ **Brique 19 : l'économie de jetons** — un vrai registre à double entrée : le commerçant recharge son compte, paie ses campagnes avec, les joueurs touchent leur part et la dépensent chez les partenaires. Circuit fermé, aucune sortie de fonds.
- ✅ **Brique 18 : notifications** — une cloche avec le nombre de choses en attente, un centre de notifications dans l'appli, et des notifications push pour être prévenu même quand l'appli est fermée.
- ✅ **Brique 17 : comptes, mots de passe et sessions** — une vraie connexion, et surtout un serveur qui vérifie à chaque requête que vous n'agissez que pour votre propre compte.
- ✅ **Brique 16 : l'habillage visuel** — un système de design minimaliste appliqué à toutes les pages : une seule couleur d'accent, beaucoup de blanc, la typographie Inter embarquée, et une vraie coquille d'application (barre du haut, barre d'onglets en bas).

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

### 3 bis. (Recommandé) Remplir le site avec un quartier de démonstration

Pour juger le produit, mieux vaut ne pas partir d'une page vide. Une commande crée un quartier complet — cinq établissements du Marais et d'Oberkampf, huit joueurs, leurs visites, leurs avis, leurs missions accomplies, des amitiés, un duo, deux événements, trois campagnes de ciblage et des jetons qui circulent :

```bash
cd backend
npm run demo
```

Elle affiche à la fin **la liste des comptes et de leurs mots de passe**, pour que vous puissiez vous connecter en tant que n'importe qui — un joueur, ou un commerçant.

> **Ce qui rend cette simulation honnête** : tout passe par les mêmes services que l'application réelle. Les mêmes règles s'appliquent — limite de missions par jour, fonctionnalités verrouillées, check-in à moins de 150 m, solde de jetons suffisant. Si une action est refusée, la commande le dit et continue. Rien n'est écrit « en douce » dans la base.

> **Pour repartir de zéro** : supprimez `backend/data/app.sqlite` avant de relancer la commande.

### 4. Ouvrir la page dans votre navigateur

Ouvrez [http://localhost:3000](http://localhost:3000) dans votre navigateur. Vous devriez voir la page "Ton profil de joueur" avec le formulaire de création de compte : pseudo, email, mot de passe. Créez votre compte, répondez au questionnaire, et vérifiez que vos 4 scores s'affichent bien à la fin. Vous restez connecté pendant 30 jours ; le bouton "Se déconnecter" se trouve en bas de la page "Mon profil".

La navigation se fait par la **barre d'onglets en bas de l'écran** — Profil, Missions, Carte, Duos — le bouton "Plus" ouvrant le reste (Lieux, Validation, Invitations, Amis) et l'espace commerçant étant accessible en haut à droite.

L'onglet "Missions" mène au catalogue de missions (35 missions importées automatiquement depuis `docs/missions-catalogue.json` au premier démarrage), avec des filtres par archétype, durée, thème et mode d'interaction.

L'espace commerçant permet à un établissement de créer son compte (email + mot de passe, puis les informations du lieu dans le même formulaire), de poster ses propres missions (elles apparaissent alors aussi dans le catalogue consulté par les joueurs), et de voir la liste de ce qu'il a publié.

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

### La carte

L'onglet **"Carte"** ouvre un plan en plein écran qu'on manipule comme Google Maps :

| Geste | Effet |
| --- | --- |
| Glisser | se déplacer sur le plan |
| Molette / pincer à deux doigts | zoomer |
| Clic droit + glisser (ou deux doigts qui pivotent) | tourner et incliner la vue |
| Bouton **3D / 2D** | basculer entre la vue inclinée et la vue à plat |
| Bouton **⌃** | remettre le nord en haut |
| Bouton **◎** | se centrer sur sa position (le navigateur demande l'accès au GPS) |
| Bouton **🏢** | afficher les bâtiments du quartier en volume (voir la note plus bas) |
| Bouton **⤢** | recadrer sur tous les partenaires |

Sur le plan, chaque partenaire apparaît sous forme d'**étiquette** : une icône selon le type d'établissement (☕ café, 🍽️ restaurant, 🍺 bar, 📚 librairie, 🛏️ hôtel…), son nom, le nombre de missions disponibles chez lui, et le badge vert **"+10 %"** s'il fait partie des lieux boostés par le rééquilibrage. Une **colonne verticale verte** plantée sur le lieu donne la même information en volume : plus elle est haute, plus le lieu rapporte. Le grand cercle violet autour du lieu est la **zone de 150 m** dans laquelle le check-in est accepté.

Dès qu'on se rapproche suffisamment, les **missions du lieu apparaissent en éventail** juste en dessous de son étiquette, une goutte par mission :

- **contour violet** = mission solo, **contour cyan** = mission duo ;
- l'icône dit quel archétype la mission met en avant (🧭 explorateur, 🏆 accomplisseur, ⚔️ compétiteur, 💬 socialisateur) ;
- **⏳ orange** = vous avez déjà demandé la validation, **✓ vert** = mission accomplie.

Les pastilles en haut de l'écran filtrent ce qui est affiché : **Solo**, **Duo**, **À faire** (ce qu'il vous reste à accomplir) ou **Bonus** (uniquement les lieux qui rapportent plus).

Un clic sur une étiquette de lieu — ou directement sur une mission — ouvre la **fiche du partenaire**, un panneau qui remonte depuis le bas de l'écran. On y trouve :

- l'adresse et le type d'établissement ;
- quatre chiffres clés : note moyenne, nombre de visites, taux de fréquentation, bonus en cours ;
- les boutons **Check-in ici** (même vérification GPS que sur la page "Lieux") et **Voir les avis** ;
- la liste des **missions solo** puis des **missions duo** proposées là, avec pour chacune la récompense déjà multipliée par le bonus du lieu, et qui la validera ;
- pour chaque mission, le bouton **"J'ai terminé"** (qui lance la même demande de validation que sur la page Missions) et, pour une mission duo, **"Chercher un binôme"** qui crée le duo **sur cette mission précise, dans ce lieu précis** — on le retrouve ensuite dans l'onglet "Duos".

Chaque lieu propose ses propres missions (postées par le commerçant, validées par lui, check-in obligatoire) **et trois "missions types" piochées dans le catalogue commun** (validées par un autre joueur dont on tape le pseudo). Le tirage est stable : un même lieu propose toujours les mêmes missions types, sans qu'on ait besoin de les stocker en base.

> **Note sur les bâtiments en 3D** : le fond de plan vient d'OpenStreetMap sous forme d'images, qui ne contiennent pas la hauteur des immeubles. Le bouton 🏢 va donc chercher les contours et les hauteurs réelles des bâtiments visibles auprès d'un service public d'OpenStreetMap (Overpass), puis les dresse en volume. C'est volontairement sur demande : la requête peut prendre quelques secondes et ce service est parfois saturé. Si ça échoue, la carte reste utilisable et un message le dit — rien n'est cassé. Une carte avec les bâtiments déjà en 3D d'origine existe (fonds vectoriels type MapTiler) mais demande une clé d'API payante au-delà d'un certain volume : à rediscuter quand le projet passera en production.

### Ce qu'il fallait avant une mise en ligne

Trois manques bloquaient une mise en ligne, même auprès d'une poignée de testeurs. Ils sont comblés.

**Mot de passe oublié.** Un lien arrive par email, valable **une heure** et utilisable **une seule fois**. Ce qui est stocké en base n'est pas le lien mais son empreinte : quelqu'un qui lirait la base ne pourrait pas s'en servir pour prendre un compte. Le formulaire répond toujours la même chose, que l'adresse existe ou non — sinon il dirait à un inconnu quelles adresses ont un compte. Et changer de mot de passe **coupe les sessions ouvertes ailleurs** : si quelqu'un d'autre était connecté, il est éjecté.

L'envoi passe par une interface d'expéditeur dont la seule implémentation écrit l'email **dans la console du serveur** — même principe que le prestataire de paiement. Le parcours se déroule donc entièrement sans compte chez un fournisseur ; brancher un vrai service (Brevo, Postmark, SES…) tiendra en une seconde implémentation et une ligne à changer.

**Limitation des tentatives de connexion.** Le hachage scrypt rend déjà chaque essai lent, mais un attaquant patient finirait par passer. Au-delà de **5 échecs en 15 minutes** sur la même adresse, la porte se ferme 15 minutes, avec un message qui le dit. Trois précisions qui comptent : les échecs trop anciens sont oubliés (quatre hier plus un aujourd'hui ne font pas cinq), un blocage purgé repart de zéro, et une connexion réussie efface l'ardoise. Le compteur vit en mémoire — suffisant pour un serveur unique, à remplacer par un stockage partagé le jour où il y en aura plusieurs.

**HTTPS et en-têtes de sécurité.** En production, toute requête arrivant en clair est redirigée vers HTTPS, et le navigateur reçoit l'instruction de ne plus jamais revenir en clair sur ce domaine. Cinq en-têtes sont posés sur chaque réponse, dont une **politique de contenu** qui n'autorise que ce que le site charge vraiment : son propre code, ses propres polices, et — pour la carte — les tuiles OpenStreetMap et Overpass. Rien d'autre ne peut s'exécuter dans la page, ce qui referme la porte aux scripts injectés. Le tout est écrit à la main plutôt qu'avec une bibliothèque : quelques lignes, et on voit exactement ce qu'on envoie.

> **Pour déployer** : servez le site derrière un proxy qui termine le HTTPS (Nginx, Caddy, ou l'hébergeur lui-même), et lancez le serveur avec `NODE_ENV=production`. C'est ce qui active la redirection, l'en-tête HSTS et le cookie de session « HTTPS uniquement ».

### L'économie de jetons

Jusqu'ici, l'argent était une illusion : les campagnes de ciblage ne coûtaient **rien** au commerçant, les récompenses apparaissaient de nulle part, et « dépenser » son crédit le faisait simplement disparaître. Tout est maintenant un vrai circuit fermé.

**Le principe : un jeton ne se crée ni ne se perd par accident.** Chaque mouvement part d'un compte et arrive dans un autre, écrit une fois pour toutes dans un journal qui fait foi ; les soldes n'en sont qu'un résumé. Joueurs, commerçants, plateforme et causes ont chacun leur compte, pour que tout mouvement ait bien deux extrémités identifiables.

**Le circuit :**

| Étape | Ce qui bouge |
| --- | --- |
| Le commerçant recharge son compte | Des jetons entrent dans le circuit, en échange d'un paiement |
| Il lance une campagne de ciblage | Son compte est **débité** ; chaque joueur ciblé reçoit sa part, la plateforme garde sa commission |
| Un joueur accomplit une mission | La plateforme émet la récompense (c'est elle qui finance le jeu) |
| Le joueur règle chez un partenaire | Ses jetons passent **directement** au compte du commerçant |
| Le joueur donne à une cause | Ses jetons partent vers le compte de la cause |

Rien ne sort du circuit : les jetons d'un commerçant reviennent dans ses campagnes, ceux d'un joueur reviennent chez les commerçants. **Aucune sortie de fonds réelle.**

**Deux conséquences immédiates**, qui étaient des trous avant :

- **Une campagne trop chère est refusée**, avec le montant manquant. L'aperçu de ciblage prévient même avant de cliquer : « Solde insuffisant : il te reste 93 jetons ».
- **Payer chez un partenaire exige d'y être passé** (check-in) — sinon n'importe qui transférerait ses jetons à n'importe quel commerçant depuis son canapé.

**Le paiement du rechargement passe par un prestataire simulé.** Tout le code ne connaît qu'une interface : le jour où un vrai prestataire arrivera, il n'y aura qu'à écrire une seconde implémentation et changer **une ligne** — aucune règle métier à réécrire. La simulation sait aussi échouer (un montant de 13 est refusé), pour qu'on puisse voir le parcours d'erreur sans attendre un vrai incident. L'espace commerçant l'affiche en clair : « Paiement en mode démonstration : aucune somme réelle n'est prélevée ».

**Un filet de sécurité** : au démarrage, le serveur recalcule tous les soldes depuis le journal et les compare à ceux stockés. S'ils divergent un jour, on l'apprendra dans les logs au lancement, pas dans un litige avec un commerçant.

> **Changement de vocabulaire** : on parle désormais de **jetons** partout, plus de « crédits » ni d'euros. C'est plus juste — ce sont des jetons qui circulent en circuit fermé, pas de la monnaie.

> **Changement de comportement à connaître** : le choix fait en accomplissant une mission ne détruit plus les jetons. « Dépenser » veut maintenant dire que vous les garderez pour un partenaire (la dépense se fait sur place, depuis la fiche du lieu) ; « donner » les transfère réellement à une cause ; « accumuler » les laisse dormir. Avant, « dépenser » les faisait disparaître sans que rien ne soit dépensé nulle part.

> **Ce qui resterait à faire pour de vrais paiements** : brancher un prestataire (Stripe ou autre), ce qui suppose un statut juridique, des vérifications d'identité, et la conservation des justificatifs. La mécanique, elle, est prête à l'accueillir.

### Les notifications

Jusqu'ici, si quelqu'un attendait votre validation, **personne ne le savait** tant qu'il n'ouvrait pas l'onglet. Tout le jeu repose sur des allers-retours entre joueurs — une validation, un duo, une invitation — et rien ne prévenait que c'était à vous de jouer.

**La cloche, en haut à droite**, porte une pastille verte avec le nombre de choses non lues. Un clic ouvre le centre de notifications : chaque ligne dit qui, quoi, et quand ; les non-lues ont un point de couleur ; cliquer dessus emmène directement au bon endroit et marque la notification comme lue. Un bouton « Tout marquer comme lu » vide la pastille d'un coup.

**Douze moments déclenchent une notification** :

| Ce qui se passe | Qui est prévenu |
| --- | --- |
| Quelqu'un demande la validation d'une mission | Le validateur désigné (joueur ou commerçant) |
| La mission est validée / refusée | Le joueur qui l'avait demandée, avec le montant gagné |
| Une demande d'ami arrive / est acceptée | Le destinataire, puis l'expéditeur |
| Un duo est proposé | Le binôme — **sans révéler qui c'est**, la surprise fait partie du jeu |
| Le binôme accepte / confirme la mission faite | L'autre participant |
| Un commerçant cible un joueur | Le joueur, avec le crédit déjà versé |
| Le joueur répond à l'invitation | Le commerçant — **sans le pseudo** : le ciblage est anonyme, la réponse n'a pas à lever cet anonymat |
| Le joueur monte d'un niveau / décroche un badge | Le joueur |

Le texte de chaque notification est écrit **une seule fois**, dans `notification-rules.ts` : le titre, la phrase et la page vers laquelle elle emmène. Et il est figé au moment où la notification naît — elle raconte ce qui s'est passé ce jour-là, même si la mission est renommée depuis.

**Les notifications push**, pour être prévenu quand l'appli est fermée, s'activent depuis « Ton compte » sur la page profil. Techniquement : le serveur génère une paire de clés VAPID au premier démarrage, le navigateur s'abonne et envoie son adresse, et un petit programme (un *service worker*) reste en veille pour afficher les messages reçus — même téléphone verrouillé. Un même compte peut avoir plusieurs navigateurs abonnés (téléphone **et** ordinateur) ; un abonnement qui ne répond plus est nettoyé automatiquement.

Point important : **une notification arrive toujours dans l'appli, même si le push échoue**. Les deux sont indépendants — un téléphone hors ligne ne fait pas disparaître la notification, elle attend simplement dans la cloche.

> **Pour les essayer** : sur `localhost`, les notifications push fonctionnent directement. En ligne, elles exigent **HTTPS** (c'est une règle des navigateurs, pas un choix du projet). Sur iPhone, il faut d'abord ajouter le site à l'écran d'accueil — Safari ne les autorise pas autrement. Si le navigateur ne sait pas faire ou si vous avez refusé, la page vous le dit en clair au lieu d'afficher un bouton qui ne marche pas.

> **Ce qui reste à faire côté envoi** : un rappel par email pour ceux qui n'activent pas le push, et un regroupement des notifications (« 3 validations t'attendent » plutôt que trois lignes) si le volume le justifie un jour.

### Les comptes et la sécurité

Jusqu'ici il n'y avait ni mot de passe ni session : la page retenait un identifiant de joueur, et **n'importe qui pouvait agir au nom de n'importe qui** en changeant cet identifiant dans l'URL. C'était le blocage n°1 avant toute mise en ligne.

**Créer un compte et se connecter.** L'écran d'accueil propose maintenant « Créer un compte » ou « Se connecter » : pseudo, email, mot de passe (8 caractères minimum). Même chose côté commerçant, où la création du compte et celle de l'établissement s'enchaînent en un seul formulaire.

**Le mot de passe n'est jamais stocké.** Le serveur n'en garde qu'une empreinte calculée avec **scrypt**, une fonction volontairement lente (~100 ms) conçue pour rendre les attaques par force brute coûteuses. Chaque mot de passe reçoit un « sel » tiré au hasard : deux personnes ayant choisi le même mot de passe n'ont pas la même empreinte, et on ne peut pas le repérer en comparant. La vérification se fait en temps constant, pour que la durée de la réponse ne laisse rien deviner. C'est la fonction fournie par Node lui-même — aucune bibliothèque supplémentaire à faire confiance.

**La connexion tient dans un cookie que la page ne peut pas lire.** Le navigateur reçoit un jeton de 256 bits tiré au hasard, dans un cookie `httpOnly` : même un script malveillant injecté dans la page ne pourrait pas le voler. C'est le serveur qui sait à qui ce jeton correspond ; se déconnecter supprime la ligne, donc la session est coupée immédiatement — ce qu'un jeton auto-porté (type JWT) ne permet pas.

**Deux vérifications appliquées à toutes les routes d'un coup**, plutôt qu'une par une :

1. **être connecté** — sauf pour ce qui est volontairement public : le catalogue de missions, la liste des lieux partenaires et leurs avis ;
2. **n'agir que pour soi** — dès qu'une requête porte un identifiant de joueur, il doit être celui de la personne connectée. C'est ce qui ferme définitivement le trou décrit plus haut.

Ce garde est branché **globalement** : une route qu'on ajouterait demain en oubliant d'y penser est protégée par défaut, jamais l'inverse.

**Et les cas qu'une règle générale ne couvre pas** ont chacun leur vérification explicite :

| Situation | Ce qui est vérifié |
| --- | --- |
| Poster une mission, lancer une campagne, lire ses demandes de validation | L'établissement visé appartient bien au compte connecté |
| Valider ou refuser une mission | La demande vous est réellement adressée — **on ne peut plus valider ses propres missions** |
| Accepter une demande d'ami | La demande vous est adressée (l'expéditeur ne peut pas s'auto-accepter) |
| Répondre à une invitation commerçant | L'invitation vous est adressée |
| Ouvrir la carte | Le joueur est celui de la session : impossible de voir les découvertes de quelqu'un d'autre |

**Deux détails qui comptent** : l'email est normalisé (majuscules et espaces ignorés), et un échec de connexion renvoie **le même message et le même temps de réponse** que l'email existe ou non — on ne révèle pas à un inconnu quelles adresses ont un compte. Enfin, le **pseudo est désormais unique** (à la casse près) : c'est lui qui sert à désigner quelqu'un comme validateur ou à envoyer une demande d'ami, il ne pouvait pas rester ambigu.

> **Si vous aviez déjà lancé le projet** : les comptes créés avant cette brique n'ont pas de mot de passe et ne peuvent donc pas se connecter. Supprimez `backend/data/app.sqlite` et relancez le serveur pour repartir d'une base propre.

> **Ces trois manques sont comblés** depuis : voir « Ce qu'il fallait avant une mise en ligne » plus haut.

### L'habillage visuel

L'interface a été reprise entièrement pour ressembler à un produit fini plutôt qu'à un prototype. Le parti pris : **peu de couleur, beaucoup de blanc, une typographie qui porte la hiérarchie**. La couleur vient du contenu — la carte, les objets de collection, les icônes des lieux — pas de l'habillage.

Concrètement :

- **Une seule couleur d'accent** dans toute l'application (un vert profond), réservée aux liens, aux états actifs, aux barres de progression et au bonus des lieux. Les boutons principaux sont noir encre, les secondaires en contour fin. Le rouge et l'orange ne servent qu'à ce qui l'exige vraiment (erreur, verrou, attente).
- **La typographie Inter**, embarquée avec le projet comme les bibliothèques de carte — aucune requête vers un service extérieur au chargement. Les titres sont resserrés (interlettrage négatif), le corps de texte aéré.
- **Une coquille d'application** : une barre fine en haut avec le nom du produit et l'accès à l'espace commerçant, et une **barre d'onglets en bas** — Profil, Missions, Carte, Duos, et un bouton « Plus » qui ouvre une feuille avec le reste (Lieux, Validation, Invitations, Amis). C'est ce qui donne la sensation d'une vraie appli plutôt que d'un site. Elle est écrite une seule fois dans `nav.js` et injectée sur chaque page, au lieu d'être recopiée dans les 9 fichiers HTML.
- **Des icônes dessinées** (traits fins, cohérents) pour la navigation, les outils de la carte et les cadenas du déblocage — les emoji ne servent plus que là où ils sont du contenu : le type d'un établissement, un badge, un objet de collection.
- **Des cartes blanches à filet fin**, sans ombres marquées, et des listes séparées par un simple trait plutôt que par des blocs empilés.
- **La carte 3D** a été réalignée sur la même palette : étiquettes blanches à ombre douce, colonnes de bonus dans le vert d'accent, outils regroupés en une seule colonne au lieu de boutons flottants.

Tout tient dans deux fichiers, `public/style.css` (le système commun) et `public/carte.css` (ce qui est propre à la carte) : changer la couleur d'accent ou l'arrondi des cartes se fait en une ligne, en haut de `style.css`.

### Le déblocage progressif

Les specs demandent que l'appli ne s'ouvre pas d'un coup à l'inscription (section 2.9) : au démarrage le joueur n'a accès qu'au strict nécessaire, et tout le reste s'ouvre en jouant. La section **« Ton parcours »** en haut de la page "Mon profil" montre en permanence où il en est.

**Le tutoriel (3 étapes, obligatoire avant le mode libre)** :

| Étape | Ce qu'elle demande |
| --- | --- |
| Dis-nous qui tu es | Répondre aux 4 curseurs du questionnaire |
| Accomplis ta première mission | Faire une mission et obtenir sa validation |
| Pousse la porte d'un partenaire | Faire un premier check-in sur place |

**Ce qui s'ouvre ensuite**, avec la condition affichée en clair tant que c'est fermé :

| Fonctionnalité | Condition |
| --- | --- |
| Mode libre | Terminer les 3 étapes du tutoriel |
| Voir le profil des autres joueurs | Accomplir sa première mission |
| Missions à deux | Questionnaire complété **et** 3 missions solo accomplies |
| Donner son crédit à une cause | Atteindre le niveau 2 |

Ces verrous sont appliqués **côté serveur**, pas seulement masqués dans la page : une tentative directe sur l'API est refusée avec le message qui explique ce qu'il reste à faire. Côté interface, on prévient avant plutôt que de laisser le joueur buter sur un bouton — la page "Duos" affiche un bandeau 🔒 au lieu des boutons, et le choix "Donner" apparaît grisé avec sa condition.

**Missions limitées par jour** : 3 le premier jour, **une de plus à chaque niveau**, plafonnées à 10. Le compteur est affiché en haut de la page "Missions". Une demande refusée par le validateur ne consomme pas le quota.

**La carte voilée** : le monde est découpé en quartiers d'environ 550 m de côté. Au départ, tous les partenaires apparaissent comme des pastilles sombres **❓ "Zone à découvrir"** — sans nom, sans missions, sans statistiques. Deux façons de lever le voile :

- **le check-in** chez un partenaire lève **tout son quartier définitivement** (les autres partenaires du même quartier apparaissent du même coup) et rapporte de l'XP : 40 XP, **multipliés par le bonus du lieu** — découvrir un quartier sous-fréquenté rapporte donc davantage, exactement comme le demandent les specs ;
- **le bouton « me localiser » ◎** révèle temporairement le quartier où l'on se trouve et les 8 qui l'entourent : on voit autour de soi, même sans y être encore entré.

> **Note** : si vous ouvrez la carte sans profil joueur (pas encore de compte), tout s'affiche — il n'y a personne dont on puisse connaître les découvertes. Le voile ne s'applique qu'à un joueur identifié.

### Les titres et la collection

La dernière partie du système de récompenses (section 2.9) : ce qui ne sert à rien mécaniquement, mais qui raconte ce que le joueur a vécu. Tout est dans la section **« Titres et collection »** de la page "Mon profil".

**Les titres** sont des étiquettes gagnées par le comportement. Le joueur en choisit **une** à afficher à côté de son pseudo — ses amis la voient sur son profil. Les titres pas encore gagnés restent visibles, avec leur condition en clair, pour donner un objectif :

| Titre | Condition |
| --- | --- |
| Nouveau venu | Offert dès l'inscription |
| Habitué du quartier | Revenir 5 fois dans **le même** établissement |
| Arpenteur | Lever 5 quartiers sur la carte |
| Curieux des rues | Visiter 10 établissements différents |
| Bon public | Publier 5 avis |
| Âme du duo | Accomplir 3 missions à deux |
| Main tendue | Donner 3 fois son crédit à une cause |
| Figure locale | Atteindre le niveau 5 |

Un clic sur un titre gagné l'affiche, un second clic le retire. Le serveur refuse d'équiper un titre non gagné, même en appelant l'API directement.

**Les objets de collection** sont deux séries à compléter, affichées comme une vitrine où les cases non gagnées restent en `???` :

- **Souvenirs de comptoir** (8 objets) — un objet par *type* d'endroit où le joueur a fait un check-in : le sous-bock 🍺 pour un bar, la tasse ébréchée ☕ pour un café, le marque-page 📚 pour une librairie, la clé de chambre 🛏️ pour un hôtel… Le type d'établissement étant saisi en texte libre par le commerçant, la reconnaissance accepte les variantes (« Bar à vin », « restaurant italien », « Café » tombent bien dans les bonnes cases).
- **Carnet de missions** (7 objets) — un objet par thème de la taxonomie des missions mené jusqu'à validation : le carnet de notes 📜 pour la culture, la fourchette tordue 🍴 pour la gastronomie, la pièce du puzzle 🧩 pour les jeux d'esprit…

Comme pour les badges, rien n'est stocké en double : titres et objets sont recalculés à partir des check-ins, des missions validées et du journal d'actions du joueur. Seul le titre *choisi* est enregistré.

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

Tout doit passer en vert (`107 passed`).

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
    │   ├── campaigns/             Ciblage : campagnes, cibles et retours
    │   │   ├── campaign.entity.ts / campaign-target.entity.ts
    │   │   ├── campaigns.service.ts       ← matching des profils, aperçu du coût, crédit à l'acceptation
    │   │   ├── business-campaigns.controller.ts   ← aperçu, envoi, résultats
    │   │   └── invitations.controller.ts  ← boîte de réception du joueur, accepter / refuser
    │   ├── map/                   Données de la carte
    │   │   ├── missions-types.ts / .spec.ts       ← les 3 missions types proposées par chaque lieu
    │   │   ├── map.service.ts             ← lieux + missions + bonus + avancement du joueur, en un appel
    │   │   └── map.controller.ts          ← GET /map
    │   ├── unlocking/            Déblocage progressif
    │   │   ├── unlock-rules.ts / .spec.ts         ← tutoriel, conditions d'ouverture, quota du jour, quadrillage de la carte
    │   │   ├── zone-decouverte.entity.ts          ← les quartiers qu'un joueur a levés
    │   │   └── unlocking.service.ts       ← état du joueur, verrous côté serveur, découverte d'un quartier
    │   ├── collection/           Titres et objets de collection
    │   │   ├── collection-rules.ts / .spec.ts     ← catalogue des titres et des deux séries d'objets
    │   │   └── collection.service.ts      ← recalcule tout depuis les actions du joueur, équipe un titre
    │   ├── securite.ts           En-têtes de sécurité et redirection HTTPS
    │   ├── auth/                 Comptes, mots de passe et sessions
    │       ├── password.ts / .spec.ts             ← empreinte scrypt et jetons de session
    │       ├── cookies.ts / .spec.ts              ← lecture du cookie de session
    │       ├── session.entity.ts                  ← les connexions ouvertes
    │       ├── auth.service.ts            ← inscription, connexion, déconnexion
    │   │   ├── rate-limit.ts / .spec.ts           ← limitation des tentatives de connexion
    │   │   ├── reinitialisation.entity.ts         ← les liens de mot de passe oublié
    │   │   ├── expediteur-email.ts        ← le contrat qu'un vrai service d'emails devra remplir
    │   │   ├── auth.guard.ts              ← être connecté, et n'agir que pour soi
    │   │   └── business-owner.guard.ts    ← l'établissement visé est bien le sien
    │   ├── notifications/        Cloche, centre de notifications et push
    │       ├── notification-rules.ts / .spec.ts   ← le texte de chaque notification
    │       ├── notification.entity.ts / push-subscription.entity.ts
    │   │   ├── notifications.service.ts   ← prévenir quelqu'un, lister, marquer lu
    │   │   └── push.service.ts            ← clés VAPID et envoi vers les navigateurs
    │   └── ledger/               L'économie de jetons
    │       ├── ledger-rules.ts / .spec.ts         ← arrondi au centime, répartition, vérifications
    │       ├── compte.entity.ts / mouvement.entity.ts ← les comptes et le journal
    │       ├── ledger.service.ts          ← déplacer des jetons, historique, contrôle de cohérence
    │       ├── jetons.service.ts          ← recharger, payer chez un partenaire, donner
    │       ├── prestataire-paiement.ts    ← le contrat qu'un vrai prestataire devra remplir
    │       └── prestataire-simule.ts      ← l'implémentation de démonstration
    ├── photos/                    Les photos de profil
    │   ├── photo-rules.ts             ← lire une image envoyée, et refuser le reste
    │   ├── photo-rules.spec.ts        ← ses tests
    │   ├── photo.entity.ts            ← la table à part, et pourquoi
    │   └── photos.controller.ts       ← déposer, retirer, servir
    ├── admin/                     L'espace administrateur
    │   ├── catalogue-reglages.ts      ← LA liste des réglages : libellés, bornes, valeurs d'origine
    │   ├── catalogue-reglages.spec.ts ← ses tests
    │   ├── reglages.service.ts        ← lecture en mémoire, écriture en base
    │   ├── contenus.service.ts        ← commerces, missions, événements
    │   ├── geocodage/                 ← trouver un point à partir d'une adresse
    │   ├── comptes.service.ts         ← joueurs, commerçants, droits d'administration
    │   ├── registre.service.ts        ← état des jetons et corrections
    │   ├── diff.ts / diff.spec.ts     ← ce qui a changé, et comment le raconter
    │   ├── admin.guard.ts             ← le droit d'administrer
    │   ├── journal-admin.entity.ts    ← le journal des modifications
    │   └── creer-admin.ts             ← npm run admin : donner le droit à un compte
    ├── demo/                      Le quartier de démonstration
    │   ├── donnees-demo.ts            ← les lieux, missions, joueurs et avis
    │   └── seed-demo.ts               ← la simulation, qui passe par les vrais services
    └── public/                    La page web (HTML/CSS/JS) servie au joueur
        ├── style.css                      ← le système de design (couleurs, typographie, composants)
        ├── nav.js                         ← la coquille : barre du haut, onglets et cloche
        ├── push.js / sw.js                ← activation du push et affichage hors de l'appli
        ├── utils.js                       ← échappement du texte affiché (sécurité)
        ├── index.html / app.js            ← profil joueur + portefeuille
        ├── missions.html / missions.js    ← consultation des missions, demande de validation
        ├── validation.html / validation.js ← pop-up de validation (joueur et/ou commerçant)
        ├── amis.html / amis.js            ← demandes d'ami, liste, profil d'un ami
        ├── invitations.html / invitations.js ← invitations reçues, accepter/refuser + réaction
        ├── commercant.html / commercant.js ← espace commerçant (activité / ciblage / concurrence)
        ├── lieux.html / lieux.js          ← check-in, avis, mini carte des lieux
        ├── carte.html / carte.js / carte.css ← la carte 3D plein écran et la fiche partenaire
        ├── admin.html / admin.js / admin.css ← le back-office (réglages, journal)
        ├── vendor/inter/                  ← la police Inter (embarquée, pas de CDN)
        ├── vendor/leaflet/                ← mini carte de la page Lieux (embarquée, pas de CDN)
        └── vendor/maplibre/               ← carte 3D (embarquée, pas de CDN)
```

## L'espace administrateur

Jusqu'ici, changer une règle du jeu — le rayon dans lequel un joueur peut valider
sa présence, ce que rapporte une mission, la part reversée au joueur ciblé —
demandait d'ouvrir un fichier de code, de le modifier et de redémarrer le site.
C'est exactement ce qu'un back-office doit supprimer.

### Créer votre compte administrateur

Le droit d'administrer ne s'accorde **jamais** depuis une page web. Si c'était le
cas, n'importe qui pourrait se l'accorder en s'inscrivant. Il s'accorde en ligne
de commande, sur la machine qui héberge le site :

```bash
cd backend

# si vous avez déjà un compte sur le site
npm run admin -- votre.email@exemple.fr

# si vous n'en avez pas encore
npm run admin -- votre.email@exemple.fr "un-mot-de-passe-solide"
```

Puis ouvrez **http://localhost:3000/admin.html** et connectez-vous avec cette
adresse. C'est la connexion habituelle : il n'y a pas de « mot de passe
administrateur » séparé, seulement un compte ordinaire à qui on a donné un droit
en plus.

Un compte qui n'a pas ce droit et qui tente d'entrer reçoit un refus clair
(« Cet espace est réservé à l'administration »), pas une page blanche.

### Les réglages du jeu

24 valeurs sont modifiables, rangées en six familles :

| Famille | Ce qu'on y règle |
| --- | --- |
| Le terrain | Rayon de validation de présence, taille d'un quartier de la carte, missions affichées par commerce |
| Le rythme de jeu | Missions par jour au niveau 1, et le plafond |
| Les points d'expérience | Ce que rapporte chacune des 10 actions du jeu |
| Le rééquilibrage des lieux | Fenêtre de comptage, capacité supposée, sensibilité et bornes du coup de pouce |
| Les jetons | Montant minimum d'un mouvement, part reversée au joueur ciblé |
| La sécurité des comptes | Essais de connexion avant blocage, durée du blocage |

Chaque réglage est accompagné de son explication en français : non pas ce que
fait le code, mais **ce que ça change pour les joueurs**, et ce qui se passe si
vous poussez trop loin dans un sens ou dans l'autre.

Trois choses à savoir :

- **Une modification s'applique tout de suite**, sans redémarrer le site. Vous
  changez le rayon à 50 m, le check-in suivant est jugé avec 50 m.
- **Rien n'est cassable.** Chaque valeur a un minimum et un maximum ; une saisie
  hors bornes est refusée avec le message qui dit quoi corriger. Une valeur qui
  deviendrait invalide plus tard (si on resserre les bornes) est ignorée au
  démarrage et remplacée par la valeur d'origine — le site démarre toujours.
- **Tout est réversible.** Un réglage que vous n'avez jamais touché n'existe même
  pas en base : il prend sa valeur d'origine, celle écrite dans le code. Le lien
  « remettre » supprime simplement la ligne. Une pastille « modifié » vous
  montre d'un coup d'œil ce que vous avez changé.

### Les contenus : commerces, missions, événements

Trois pages de plus, qui partagent le même geste : une fiche repliée montre
l'essentiel, un clic la déplie en formulaire.

**Commerces.** Nom, adresse, type, capacité, note Google, et la position.

**La position ne se saisit jamais en chiffres.** Personne ne sait ce qu'est une
longitude, et personne ne devrait avoir à l'apprendre pour corriger une fiche.
Deux façons de placer le point, qui couvrent tous les cas :

1. **écrire l'adresse et cliquer sur « Chercher »** — le site interroge le
   service d'adresses d'OpenStreetMap et propose ce qu'il a trouvé, en clair
   (« 12, Rue de Turenne — 75003 Paris ») ; on clique sur la bonne, le point se
   place ;
2. **déplacer le point à la main sur la carte** — pour l'entrée de service au
   fond de la cour, que le service d'adresses ne connaît pas.

Le site dit ensuite ce qu'il a compris, en français : « Point déplacé sur
l'adresse choisie, à 1145 m de l'ancien. Enregistrez pour valider. » Et le
journal écrit « position : déplacée de 100 m », pas « latitude : 48,8531 →
48,8540 » — le journal est lu par la même personne que l'interface.

Les coordonnées existent toujours en base : c'est ce qui fait marcher la
vérification de présence. Elles ne sont simplement jamais montrées comme des
nombres à comprendre.

Côté commerçant, rien à faire : la page d'inscription demandait déjà la
position au navigateur, le commerçant étant par définition sur place quand il
crée sa fiche.

Un commerce ne se supprime pas depuis cet écran, et l'interface le dit au lieu
de proposer un bouton qui échouerait : ses visites, ses missions, ses
événements et ses mouvements de jetons y renvoient tous.

**Missions.** Le catalogue complet et les missions créées par les commerçants,
avec une recherche par titre, identifiant ou thème. Vous pouvez en créer de
nouvelles : une mission de catalogue n'est rattachée à aucun commerce, elle est
proposée partout sur la carte aux lieux qui n'ont pas créé les leurs. Elle
reçoit un identifiant lisible du type `ADM-001`, dans la continuité du
catalogue de référence (`EXP-001`).

**Une mission déjà jouée ne peut plus être supprimée.** Le refus est explicite
et dit combien de fois elle a servi. Ce n'est pas une limitation technique :
les validations, l'XP et les jetons des joueurs y renvoient, et la supprimer
laisserait des trous dans leurs profils sans rien nettoyer. Elle reste
entièrement modifiable — et si vous voulez qu'elle cesse d'être proposée,
baissez sa récompense.

**Événements.** Titre, description, date et heure. Un événement auquel une
campagne d'invitation renvoie ne peut pas être supprimé non plus : des joueurs
ont déjà été crédités pour lui, et la ligne est passée dans le registre de
jetons. On ne supprime pas ce à quoi de l'argent renvoie.

Chaque modification passe au journal, mais **seulement ce qui a réellement
changé** : « Le Café des Arts — capacité estimée : 50 → 120 ». Réenregistrer un
formulaire sans y toucher est le geste le plus courant du monde et n'écrit
rien. Les champs que le formulaire ne propose pas (un identifiant, une date de
création, le propriétaire d'un commerce) sont ignorés même s'ils arrivent dans
la requête.

### Les comptes

Tous les inscrits, joueurs et commerçants, avec une recherche par pseudo ou par
email et un filtre. Chaque fiche s'ouvre sur ce qu'on veut réellement savoir
quand quelqu'un écrit pour signaler un problème : son profil de joueur (les
quatre barres), sa progression, son activité, son solde et **l'historique
complet de ses jetons**.

C'est aussi d'ici qu'on nomme un administrateur. Deux verrous empêchent la même
catastrophe — se retrouver devant un back-office dont plus personne n'a la
clé :

- vous ne pouvez pas retirer vos propres droits (vous seriez aussitôt mis
  dehors) ;
- on ne peut pas retirer les droits du dernier administrateur.

### Les jetons

Où sont les jetons, en cinq chiffres : chez les joueurs, chez les commerçants,
à la plateforme, reversés aux causes, et le total en circulation. Sous les
chiffres, une phrase dit si le registre est cohérent — c'est-à-dire si chaque
solde correspond exactement à la somme de ses mouvements. Tant qu'elle est
verte, la comptabilité tient.

Chaque compte s'ouvre sur son historique et sur un formulaire de correction.

**Une correction n'est jamais une retouche de solde.** C'est un mouvement, avec
ses deux extrémités, son montant et sa raison écrite — exactement comme une
récompense de mission ou un paiement au comptoir. C'est ce qui permet de
toujours recalculer chaque solde à partir de l'historique : une retouche
directe ferait diverger le contrôle de cohérence dès la seconde suivante.

Créditer, c'est la plateforme qui émet les jetons qu'elle aurait dû verser.
Retirer, c'est les faire revenir vers le compte de la plateforme — et c'est
refusé si le compte ne les a pas, parce qu'on ne peut pas reprendre ce qui
n'est plus là.

Trois refus, avec le message qui dit quoi corriger :

| Ce qu'on tente | Ce que le site répond |
| --- | --- |
| Une correction sans raison écrite | « Écrivez la raison de la correction : elle restera au journal. » |
| Un montant nul ou négatif | « Indiquez un montant positif, et choisissez le sens. » |
| Retirer plus que le solde | « Solde insuffisant : 15,6 jeton(s) disponible(s) pour 9999. » |

La correction est tracée deux fois : dans le registre (le mouvement, qui fait
foi) et dans le journal d'administration (qui l'a décidée, et pourquoi).

### Le journal des modifications

Chaque changement laisse une trace : qui, quand, quoi, et la valeur d'avant.

C'est indispensable dès maintenant, pas plus tard : un back-office permet de
changer des règles qui touchent à l'argent et aux comptes des gens. Le jour où
un chiffre paraît anormal, la seule question utile est « qui a changé quoi, et
quand ». Sans journal, la réponse est perdue.

Rien n'est effaçable depuis l'interface. Un réglage réenregistré sans être
modifié n'écrit pas de ligne, pour que le journal reste lisible.

### Comment c'est fait, en deux mots

Il n'y a **qu'une seule liste** de réglages, déclarée dans
`backend/src/admin/catalogue-reglages.ts`. C'est elle qui fournit à la fois le
formulaire de la page, les contrôles de saisie et les valeurs d'origine. Ajouter
un réglage, c'est ajouter une ligne dans cette liste : la page s'adapte toute
seule, il n'y a ni HTML ni base de données à toucher.

Les fonctions de calcul du jeu restent **pures** : elles reçoivent la valeur en
paramètre, avec l'ancienne constante en valeur par défaut. C'est ce qui permet de
les tester sans base de données — et 10 tests vérifient justement qu'un réglage
modifié change bien le résultat, ce qui est la seule preuve qui compte.

Même principe côté contenus : ce qui décide de la phrase du journal (« quels
champs ont changé, et comment l'écrire ») est une fonction pure, testée à part,
avec ses 14 tests. C'est elle qui sait que « 50 » saisi au clavier et 50 lu en
base sont la même chose, et qu'une date écrite `2026-12-24T20:00` doit
s'afficher comme celle d'à côté.

Enfin, le vocabulaire des missions (archétypes, durées, thèmes, modes) vit
maintenant dans un seul fichier, `backend/src/missions/vocabulaire.ts`. Il sert
à la fois à valider ce qu'un commerçant envoie et à remplir les listes
déroulantes du back-office : les deux ne peuvent plus diverger.

## Les photos de profil

Un joueur peut mettre son portrait, un commerçant la photo de son
établissement. Les deux se déposent au même endroit : sur « Mon profil » pour
un joueur, dans « Ma vitrine » de l'espace commerçant pour un lieu.

Elles apparaissent ensuite partout où on parle de quelqu'un : la liste d'amis,
les demandes reçues, la liste des lieux, la fiche partenaire sur la carte (en
bandeau) et le back-office.

### Quand il n'y a pas de photo

La plupart des gens n'en mettront jamais. Une pastille vide ferait une liste
triste et illisible, donc **le site affiche les initiales sur un fond coloré**,
et la couleur est calculée à partir du nom : toujours la même pour la même
personne. On reconnaît donc les têtes d'une page à l'autre même quand personne
n'a mis de photo.

### Pourquoi une table à part

Les images d'événements sont stockées directement sur la fiche de
l'événement. Les photos de profil, non : elles ont leur propre table.

La raison est concrète. Le site liste des joueurs et des commerces en
permanence — la carte, les amis, les duos, le back-office — et ces listes
n'affichent que des noms. Si la photo était une colonne de la fiche, chacune
de ces listes traînerait toutes les images avec elle sans jamais les montrer.

Ici, une liste ne charge jamais une image : elle sait seulement **qui** a une
photo et **de quand** elle date. L'image part au navigateur par une adresse à
elle (`/photos/joueur/<identifiant>`), servie comme une vraie image, que le
navigateur met en cache une semaine. La date sert de numéro de version dans
l'adresse : quelqu'un qui change sa photo la voit changer tout de suite, sans
quoi le cache continuerait d'afficher l'ancienne.

### Ce que le site refuse, et pourquoi

L'image arrive encodée en texte dans du JSON. C'est donc du texte fourni par
l'extérieur, qu'il faut vérifier avant d'en faire quoi que ce soit :

| Ce qu'on envoie | Ce que le site répond |
| --- | --- |
| Un SVG | « Formats acceptés : JPEG, PNG ou WebP. » |
| Un PDF renommé en PNG | « Ce fichier ne ressemble pas à l'image qu'il prétend être. » |
| Une image de 490 Ko | « Image trop lourde (488 Ko, maximum 400 Ko). » |
| Du texte quelconque | « Ce fichier n'est pas une image que le site sait lire. » |

Le refus du **SVG** n'est pas un caprice : un SVG est un document qui peut
contenir du script. Le servir depuis notre propre domaine reviendrait à
laisser n'importe qui déposer du code sur le site.

Le contrôle de **l'en-tête du fichier** non plus : sans lui, il suffirait
d'écrire « data:image/png » devant n'importe quoi pour le faire servir comme
une image par notre domaine.

Côté accès : on ne peut changer que sa propre photo (le garde global s'en
charge) ou celle de son propre établissement (le garde de propriété). La photo
d'un commerce est publique — c'est une devanture, faite pour être vue. Le
visage d'un joueur demande d'être connecté.

### Ce qui se passe dans le navigateur

Une photo de téléphone pèse plusieurs mégaoctets, pour finir dans une pastille
de 42 pixels. La page la réduit avant de l'envoyer : recadrage au carré centré
(une pastille ronde sur une photo en longueur couperait les visages n'importe
où), 512 pixels de côté pour un joueur, 720 pour un commerce dont la photo
s'affiche aussi en bandeau. L'envoi est instantané et la base reste légère.

## L'habillage visuel

Le parti pris tient en un mot : **la nuit**.

Le jeu se joue le soir, dehors, en ville. L'interface prend le même parti : un
fond bleu-nuit très sombre, des surfaces à peine plus claires posées dessus, et
**une seule couleur vive** — un violet — réservée à ce sur quoi on agit.

Trois règles tiennent tout l'ensemble :

1. **La couleur vive ne sert qu'à l'action.** Un bouton, un onglet actif, une
   pastille sélectionnée. Si tout est violet, plus rien ne ressort.
2. **La hiérarchie se fait par la lumière, pas par le trait.** Plus un élément
   est proche de l'utilisateur, plus sa surface est claire. Un champ à remplir
   est *creusé* (plus sombre que la carte) ; un bouton est *posé* (plus clair,
   avec une lueur violette). On comprend au premier coup d'œil ce qui se
   remplit et ce qui se clique, sans avoir à lire.
3. **Le vert, le rouge et l'orange sont réservés au sens** — réussi, refusé,
   attention. Jamais pour décorer.

Tout passe par une trentaine de variables déclarées en haut de
`backend/public/style.css`. Changer la couleur d'accent du site, c'est changer
une ligne.

### Les cartes

OpenStreetMap ne fournit que des fonds de carte clairs, et un rectangle blanc
au milieu d'une interface de nuit est aveuglant. La carte 3D les assombrit
nativement (MapLibre sait le faire sur une couche d'images), les petites cartes
passent par un filtre appliqué **aux seules tuiles** — les repères et les
étiquettes posés par-dessus gardent leurs couleurs.

Le résultat : les rues se devinent en gris violacé sur le noir, et ce sont les
lieux et les missions qui ressortent. C'est ce qu'on veut regarder sur une
carte de jeu.

### Ce qu'un changement de palette révèle

Passer du clair au sombre ne se résume pas à inverser des couleurs : certaines
règles qui semblaient anodines deviennent fausses.

`background: var(--ink)` voulait dire « le fond fort, en noir ». En sombre,
l'encre est presque blanche : les étapes franchies du parcours sont devenues
des disques blancs avec une coche blanche dessus — invisible. Partout où ce
motif servait à marquer l'état fort, il prend maintenant le violet ; et une
étape franchie, qui est un *état* et non une action, prend le vert.

Même piège avec la lueur du bouton principal : donnée à `button`, elle a été
héritée par la cloche et par les onglets, qui n'ont pas de fond violet pour la
porter. Elle est maintenant retirée explicitement sur chaque variante — une
lueur appartient au fond qui la justifie.

## Et après ?

Les grandes briques fonctionnelles des specs sont implémentées, et le site se
pilote entièrement depuis l'espace d'administration, sans toucher au code. Ce
qui reste, c'est le passage du prototype à un vrai produit :

- **L'appli mobile** (React Native) — toute la logique est déjà côté serveur et réutilisable telle quelle ; il reste à refaire l'interface.
- **Les vrais paiements** — la mécanique des jetons est prête et attend un prestataire ; le brancher suppose un statut juridique, des vérifications d'identité et la conservation des justificatifs.
