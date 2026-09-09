# Projet Commerçant — Spécifications fonctionnelles et modèle de données

## 1. Vision du projet

Une application mobile qui connecte des **particuliers** et des **commerçants locaux** (bars, hôtels, restaurants) via un escape game urbain géolocalisé.

Les particuliers reçoivent des missions à accomplir dans différents lieux partenaires (résoudre des énigmes, obtenir des indices, accomplir des défis). L'objectif n'est pas seulement ludique : il s'agit de faire bouger les gens dans la ville, de leur faire découvrir des lieux, et surtout de créer des rencontres entre joueurs.

Les commerçants paient pour cibler des profils de joueurs précis (par comportement et par personnalité), animent leur établissement, et gagnent en visibilité et en fréquentation.

Un principe central traverse tout le système : **rééquilibrer la fréquentation** en poussant les joueurs vers les lieux qualitatifs mais sous-fréquentés, plutôt que de renforcer artificiellement les lieux déjà populaires.

---

## 2. Côté particulier (joueur)

### 2.1 Profil joueur et archétypes

Le profil de chaque joueur est basé sur les 4 archétypes de Bartle, adaptés au contexte :

- **Explorateur** — aime découvrir des lieux, des secrets
- **Accomplisseur** — aime compléter des objectifs, progresser
- **Compétiteur** — aime les classements, les défis chronométrés
- **Socialisateur** — aime rencontrer, interagir, jouer en groupe

Le profil n'est pas figé sur un seul type : c'est un **score sur les 4 dimensions** (ex : 62% explorateur, 54% socialisateur, 31% accomplisseur, 18% compétiteur), qui évolue en continu.

**Constitution initiale** : questionnaire court à l'inscription, sous forme de **sliders par paires opposées** pour forcer des arbitrages :
- Découverte ⟷ Habitude
- Compétition ⟷ Coopération
- Seul ⟷ En groupe
- Objectif clair ⟷ Improvisation

**Évolution du score** : recalculé **en temps réel**, à chaque action du joueur (moteur d'événements). Chaque type d'action a un poids prédéfini par dimension. Le score utilise une moyenne mobile pondérée pour éviter qu'un seul événement fasse trop bouger le profil.

Exemples de poids :
| Événement | Impact |
|---|---|
| Mission solo terminée sans interaction | +accomplisseur |
| Lieu jamais visité choisi | +explorateur |
| Défi avec classement/timer rejoint | +compétiteur |
| Discussion initiée, mission collective rejointe | +socialisateur |

### 2.2 Missions

Deux types :
- **Missions push** — personnalisées, proposées par l'IA (maître du jeu) selon le profil du joueur
- **Missions standards** — disponibles librement, à faire quand le joueur veut

**Missions duo/groupe** (dimension sociale avancée) :
- **Affinité naturelle** — deux profils qui fonctionnent bien ensemble historiquement, mission fluide
- **Défi de complémentarité** — deux profils a priori peu compatibles, mission présentée comme un défi rare avec récompense unique à la clé

L'IA peut **provoquer la rencontre** en amont : elle propose à deux joueurs qui ne se connaissent pas encore de se rendre au même lieu, dans une même fenêtre horaire, sans nécessairement révéler tout de suite qu'il y a un duo derrière (`statut_révélation` : caché jusqu'à l'arrivée, ou annoncé dès le départ — à tester).

L'IA privilégie, quand c'est pertinent, les lieux sous-fréquentés comme point de rendez-vous pour ces missions.

### 2.3 Visibilité sociale

Les profils des autres joueurs présents dans un lieu sont visibles mais **partiellement masqués**, pour créer du suspense et donner envie d'aller explorer.

### 2.4 Avis et check-in

Pour laisser un avis sur un lieu, le joueur doit avoir **physiquement check-iné** sur place (géolocalisation vérifiée). Cela garantit la fiabilité des avis et renforce l'incitation à se déplacer réellement.

Les avis, croisés avec le profil archétype du joueur qui les laisse, permettent de calculer une **affinité lieu × archétype** : quel type de profil apprécie quel type de lieu. Cette donnée alimente les recommandations et le ciblage commerçant.

### 2.5 Portefeuille et récompenses

Le joueur gagne du crédit en accomplissant des missions. À chaque gain, il choisit librement comment l'utiliser :
1. **Dépense directe** chez un commerçant partenaire
2. **Don à une cause** (locale, à impact)
3. **Accumulation** vers un objectif plus important

Les dons collectifs à une cause, une fois un seuil atteint, **débloquent une mission spéciale** liée à cette cause (ex : collecte pour un nettoyage de parc → mission "participe à l'événement, récompense doublée"). Ce choix (dépense / don / accumulation) est lui-même tracké comme un événement comportemental, pouvant enrichir le profil du joueur sur un futur axe "impact/générosité".

### 2.6 Missions réseaux sociaux

Un type de mission dédié : poster une photo/story d'une expérience vécue dans l'app (mission accomplie, rencontre duo, lieu découvert). Correspond particulièrement aux socialisateurs, mais touche aussi explorateurs (partager une découverte) et accomplisseurs (afficher une réussite). Récompense en crédit, avec bonus possible si le post tague le lieu ou l'application — ce qui crée un canal de promotion organique de la plateforme elle-même.

**Important** : le joueur doit donner un consentement explicite avant qu'un commerçant puisse réutiliser publiquement une photo/vidéo issue d'une mission.

### 2.7 Principe central des missions à plusieurs : franchir la barrière sociale

Toute mission impliquant plusieurs joueurs part du postulat que **les joueurs ne se connaissent pas** et qu'il existe une vraie barrière sociale à franchir avant toute chose. Les missions ne sont pas une fin en soi : elles sont **le prétexte** qui permet cette rencontre.

Une mission duo/groupe bien conçue suit idéalement une progression en trois phases :

1. **Brise-glace** — contact initial à très bas risque social (ex : trinquer avec un inconnu, deviner une expression sans la dire). L'objectif unique de cette phase est de faire tomber la barrière du premier contact.
2. **Construction** — une fois le contact établi, la mission peut demander un vrai échange ou un effort commun.
3. **Partage** — création de quelque chose ensemble : un contenu, un souvenir, une réussite commune, qui laisse une trace au-delà du moment.

Une mission peut n'être qu'une seule de ces phases (une mission "brise-glace" pure, courte, sans suite), ou **enchaîner les trois** dans un même parcours, une fois le contact établi la première mission débloque la suivante.

Ce principe doit guider toute future création de mission, manuelle ou générée par l'IA du "maître du jeu" : avant de se demander quel archétype ou quel thème, se demander d'abord à quelle phase de la relation sociale la mission s'adresse.

### 2.9 Système de récompenses et de progression

Au-delà du crédit monétaire, le joueur progresse dans un système de récompenses inspiré des standards du jeu vidéo, pour renforcer l'engagement et donner du sens à la progression :

- **XP et niveaux** — progression globale débloquant des paliers de fonctionnalités
- **Badges** — reconnaissance ponctuelle d'un accomplissement (ex : premier duo réussi, 5 lieux différents visités)
- **Déblocage progressif de la carte** — les zones non explorées apparaissent voilées ; les découvrir donne un bonus XP, avec un bonus renforcé pour les zones sous-fréquentées (cohérence avec la section 4)
- **Titres** — étiquette de profil gagnée par la progression ou le comportement (ex : "Habitué du quartier")
- **Objets de collection** — série à compléter, un item symbolique par lieu ou type de mission
- **Fonctionnalités débloquées progressivement** — voir les contraintes de démarrage ci-dessous

**Contraintes au démarrage (déverrouillées progressivement)** :
- Carte partiellement voilée (zones proches/visitées uniquement visibles au départ)
- Missions limitées en nombre par jour au début
- Missions duo/groupe accessibles seulement après un profil minimum établi (questionnaire complété + quelques missions solo)
- Visibilité des profils d'autres joueurs déverrouillée après la première mission
- Don à une cause déverrouillé après un premier niveau (limite les abus dès l'inscription)
- Tutoriel obligatoire (1 à 3 missions guidées) avant l'accès au mode libre

### 2.10 Bibliothèque de missions

Les missions sont classées selon 4 dimensions, qui permettent à la fois de guider leur création et d'alimenter le moteur de recommandation :

1. **Archétype dominant visé** — explorateur / accomplisseur / compétiteur / socialisateur / mixte (missions duo)
2. **Durée** — courte (<15 min), moyenne (15-45 min), longue (45 min+)
3. **Thème/passion** — culture, gastronomie, musique, art, humour/insolite, sport, jeux d'esprit
4. **Mode d'interaction** — solo, duo affinité naturelle, duo défi complémentarité, groupe

Un premier catalogue de missions types, structuré selon cette taxonomie et prêt à être importé comme données de départ du prototype, est fourni séparément (`missions-catalogue.json`).

---

## 3. Côté commerçant

### 3.1 Interface

Un tableau de bord simple (3 écrans maximum), pensé pour des professionnels sans besoin de formation :
- Vue sur l'affluence par profil de joueur, en temps réel ou récent
- Suggestions d'événements à organiser, basées sur les données de la ville
- Lancement de campagnes de ciblage

### 3.2 Ciblage

Le commerçant peut cibler les joueurs selon :
- Leur profil archétype (personnalité)
- Leur comportement observé
- La localisation

### 3.3 Communication digitale guidée

Le commerçant reçoit des suggestions de contenu prêtes à l'emploi pour ses réseaux sociaux, générées à partir de l'activité réelle du jeu chez lui (mission réussie, rencontre duo marquante, moment capturé par un joueur consentant). Il valide et publie en un clic depuis son tableau de bord — cohérent avec l'exigence de simplicité pour des professionnels qui n'ont pas le temps de gérer une stratégie de communication.

### 3.4 Modèle économique

- Le commerçant paie pour cibler un joueur (base : environ 0,30 € par ciblage)
- Une partie repart vers le joueur ciblé sous forme de crédit à dépenser (base : environ 0,25 €)
- Le reste constitue la marge de l'entreprise porteuse du projet
- **Le tarif de ciblage est ajusté par le même multiplicateur que les récompenses** (voir section 4) : un commerçant sous-fréquenté paie moins cher pour cibler, renforçant le rééquilibrage.

---

## 4. Rééquilibrage dynamique de la fréquentation

### 4.1 Principe

Les récompenses de mission (et le tarif de ciblage commerçant) sont ajustées par un **multiplicateur dynamique**, calculé automatiquement, qui favorise les lieux qualitatifs mais sous-fréquentés — sans jamais avantager un lieu simplement parce qu'il est peu qualitatif.

### 4.2 Calcul

**Taux d'occupation** = nombre de visites récentes (fenêtre glissante, ex : 14 jours) / capacité estimée du lieu

**Score qualité** = note du lieu normalisée sur une échelle 0–1 (basée sur note Google, puis avis internes une fois qu'il y en a suffisamment)

**Écart** = score_qualité − taux_occupation

**Multiplicateur** = 100% + (écart × 60%), plafonné entre 70% et 110%

Effets :
- Lieu excellent mais peu visité (hidden gem) → fort bonus
- Lieu excellent et déjà bien fréquenté → 100%, pas de bonus artificiel
- Lieu moyen et peu visité → bonus faible ou nul
- Lieu peu qualitatif mais très fréquenté → léger malus

### 4.3 Affichage

Sur la carte, les lieux boostés affichent un badge (ex : "+10% ici"), ce qui devient aussi un argument ludique pour le joueur.

---

## 5. Modèle de données (entités principales)

| Entité | Rôle | Champs clés |
|---|---|---|
| **User** | Compte utilisateur | id, email, mot de passe, type (particulier / commerçant) |
| **PlayerProfile** | Profil archétype du joueur | user_id, score_explorateur, score_accomplisseur, score_compétiteur, score_socialisateur |
| **PlayerEvent** | Trace des actions du joueur | player_id, type_event, poids par dimension, timestamp, lieu_id |
| **Business** | Fiche commerçant | user_id, nom, adresse, coordonnées GPS, type, capacité_estimée, note_google |
| **Mission** | Mission à accomplir | titre, description, type (standard/push/réseaux_sociaux), lieu_id, récompense_base, récompense_finale, cause_origine_id, plateforme_ciblée, tag_requis |
| **ContentSuggestion** | Contenu suggéré au commerçant | business_id, source (mission_id/group_mission_id), média, texte_suggéré, statut |
| **GroupMission** | Mission duo/groupe | mission_id, joueurs_impliqués, type_matching, statut, statut_révélation, créneau_horaire_cible, lieu_id |
| **PairingOutcome** | Données sur les duos | group_mission_id, combinaison_archétypes, résultat, feedback |
| **Targeting** | Campagne de ciblage commerçant | business_id, profil_ciblé, budget, coût_par_ciblage, statut |
| **PlaceActivity** | Fréquentation et multiplicateur d'un lieu | lieu_id, nombre_visites_periode, taux_occupation, multiplicateur_actuel |
| **CheckIn** | Preuve de présence physique | player_id, lieu_id, timestamp, coordonnées GPS vérifiées |
| **Review** | Avis d'un joueur sur un lieu | player_id, lieu_id, checkin_id, note, commentaire |
| **PlaceAffinity** | Affinité calculée lieu × archétype | lieu_id, score par archétype |
| **PlayerProgression** | Niveau et XP du joueur | player_id, xp_total, niveau_actuel, zones_débloquées |
| **Badge** | Récompense ponctuelle | id, nom, condition_obtention, icône |
| **PlayerBadge** | Badges obtenus par un joueur | player_id, badge_id, date_obtention |
| **UnlockableFeature** | Fonctionnalité déverrouillable | id, nom, niveau_requis, condition_alternative |
| **Wallet** | Portefeuille du joueur | player_id, solde_disponible |
| **Transaction** | Mouvement d'argent | wallet_id, montant, type (gagné/dépensé/don/accumulé), référence, date |
| **Cause** | Cause à financer collectivement | nom, description, objectif_montant, montant_collecté_actuel, mission_débloquée_id, statut |

---

## 6. Stack technique proposée (profil : développeur solo)

- **Mobile** : React Native (un seul code iOS/Android)
- **Backend** : Node.js + NestJS (même langage que le mobile, cohérence pour un solo)
- **Base de données** : PostgreSQL + extension PostGIS (géolocalisation)
- **Temps réel** : Redis, à ajouter plus tard si besoin (pas nécessaire dès le MVP)
- **Hébergement de départ** : Railway ou Render (simple, pas cher, pour démarrer)

---

## 7. Ordre de construction recommandé (MVP)

1. **Profil joueur** — questionnaire à sliders + 4 scores d'archétypes + stockage de base
2. **Missions standards** — création et consultation, sans logique IA complexe au départ
3. **Interface commerçant basique** — poster une mission/offre, voir les infos essentielles
4. **Check-in et avis** — brique nécessaire à la fois pour les missions et pour la fiabilité des données
5. **Système de paiement et ciblage** — plus complexe, à construire une fois le squelette validé
6. **Multiplicateur de rééquilibrage** — une fois qu'il y a assez de données de fréquentation pour être pertinent
7. **IA de matching et missions duo** — la brique la plus avancée, à construire en dernier

---

*Document généré à partir des échanges de conception du projet. À utiliser comme base de travail avec Claude Code pour démarrer le développement.*
