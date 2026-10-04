# Ouvrir le prototype sur ton ordinateur

Ce guide part du principe que tu n'as jamais fait ça. Il n'y a **rien à
installer d'autre que Node.js**, et aucune ligne de code à écrire : tu vas
recopier quatre commandes, et le site s'ouvrira dans ton navigateur.

Compte **dix minutes** la première fois, dont huit d'attente.

---

## Ce que tu vas obtenir

Le site tournera **sur ton ordinateur**, pas sur Internet. Personne d'autre
que toi ne peut y accéder, et rien n'est publié. Tu pourras cliquer partout,
casser ce que tu veux, et repartir de zéro en supprimant un fichier.

---

## Étape 1 — Installer Node.js

Node.js, c'est le moteur qui fait tourner le serveur. Une seule installation,
une fois pour toutes.

1. Va sur **[nodejs.org](https://nodejs.org/)**
2. Clique sur le gros bouton de gauche, celui marqué **LTS** (c'est la
   version stable ; l'autre est la version d'essai, ne la prends pas)
3. Ouvre le fichier téléchargé et suis l'installation, en laissant toutes les
   options par défaut

C'est tout. Il n'y a rien à configurer.

> **Rien d'autre à installer.** En particulier, **ni Python, ni Visual
> Studio**. Si une commande te réclame l'un des deux, ce n'est pas normal :
> va voir « npm install s'arrête sur une erreur Python » dans la section
> « Si ça coince », plus bas.

---

## Étape 2 — Récupérer le code

⚠️ **C'est l'étape où l'on se trompe le plus souvent.** Le travail dont on
vient de parler n'est pas sur la version principale du projet : il est sur une
**branche** à part, appelée `claude/new-session-o0tgsj`. Si tu télécharges la
branche principale, tu verras l'ancien design et tu croiras que rien n'a
changé.

1. Ouvre la page du projet sur GitHub :
   **https://github.com/benjaminmorillon/projet-commercants**
2. En haut à gauche de la liste des fichiers, il y a un **bouton avec un nom
   de branche** (probablement `main`). Clique dessus.
3. Dans la liste qui s'ouvre, choisis **`claude/new-session-o0tgsj`**
4. Vérifie que le bouton affiche bien ce nom, puis clique sur le bouton vert
   **`Code`**, et sur **`Download ZIP`**
5. Décompresse le fichier téléchargé (double-clic sur Mac, clic droit →
   « Extraire tout » sur Windows)

Tu obtiens un dossier nommé
`projet-commercants-claude-new-session-o0tgsj`. Range-le où tu veux — sur le
Bureau, par exemple. **Retiens où il est**, tu en auras besoin à l'étape
suivante.

> À l'intérieur, tu dois voir quatre éléments : `README.md`, `backend`,
> `docs`, `mobile`. Si tu ne vois qu'un seul dossier qui contient tout ça,
> descends d'un cran : c'est celui du dessous qui compte.

---

## Étape 3 — Ouvrir un terminal dans ce dossier

Le terminal, c'est la fenêtre noire où l'on tape des commandes. Il n'y a rien
d'effrayant : tu vas y coller quatre lignes.

**Sur Mac**

1. Ouvre l'application **Terminal** (⌘ + Espace, tape « Terminal », Entrée)
2. Tape `cd ` — avec **un espace après** `cd`, c'est important
3. **Fais glisser le dossier** du projet depuis le Finder dans la fenêtre du
   Terminal : le chemin s'écrit tout seul
4. Appuie sur Entrée

**Sur Windows**

1. Ouvre le dossier du projet dans l'Explorateur de fichiers
2. Clique dans la **barre d'adresse** en haut (là où s'affiche le chemin)
3. Efface ce qu'il y a, tape `cmd`, et appuie sur Entrée

Dans les deux cas, une fenêtre s'ouvre et affiche le chemin de ton dossier.
C'est bon signe.

---

## Étape 4 — Les quatre commandes

Recopie-les **une par une**, en appuyant sur Entrée après chacune et en
**attendant que la précédente soit terminée**.

### 1. Entrer dans le dossier du serveur

```bash
cd backend
```

Ne renvoie rien. C'est normal.

### 2. Installer ce dont le projet a besoin

```bash
npm install
```

**C'est la commande la plus longue : cinq à huit minutes.** Elle télécharge
les briques toutes faites que le projet utilise. Des avertissements jaunes
(`warn`) peuvent défiler : **c'est normal, ce ne sont pas des erreurs.** Tu
n'auras à la lancer qu'une seule fois.

### 3. Remplir le site avec un quartier de démonstration

```bash
npm run demo
```

Sans ça, le site serait vide et il n'y aurait rien à regarder. Cette commande
crée dix commerces du centre de Nantes, huit joueurs, leurs visites,
leurs avis, leurs missions accomplies, des amitiés, un duo, des offres et des
jetons qui circulent.

Elle affiche à la fin **la liste des comptes et de leurs mots de passe**.
Laisse la fenêtre ouverte, tu vas t'en servir — ou reprends-les plus bas dans
ce guide.

> Tu verras aussi passer des lignes « refusé : ... ». **C'est voulu, et c'est
> même bon signe** : la simulation passe par les mêmes règles que le vrai
> site, et quand une action n'est pas permise (solde insuffisant, mission pas
> encore ouverte), elle est refusée exactement comme elle le serait pour un
> vrai joueur.

### 4. Démarrer le serveur

```bash
npm start
```

Au bout d'une trentaine de secondes, tu dois voir :

```
Serveur démarré sur http://localhost:3000
```

**Laisse cette fenêtre ouverte.** Tant qu'elle tourne, le site est en ligne
sur ton ordinateur. Si tu la fermes, le site s'éteint.

---

## Étape 5 — Ouvrir le site

Dans ton navigateur (Chrome, Safari, Firefox, Edge — peu importe), va à :

**http://localhost:3000**

Puis connecte-toi avec un de ces comptes :

**Pour voir le jeu, côté joueur**

| Email | Mot de passe |
|---|---|
| `camille@exemple.fr` | `demo-camille` |
| `raphael@exemple.fr` | `demo-raphael` |
| `ines@exemple.fr` | `demo-ines` |

Sur la page d'accueil, clique d'abord sur l'onglet **« Se connecter »** (par
défaut, le formulaire propose de créer un compte).

**Pour voir l'espace commerçant**

| Email | Mot de passe |
|---|---|
| `contact@cafedesarts.fr` | `demo-cafe-des-arts` |
| `bonjour@bistrotdumarais.fr` | `demo-bistrot-marais` |

Déconnecte-toi d'abord (en bas de la page Profil), puis reconnecte-toi avec un
compte commerçant, et va dans **« Espace commerçant »** en haut à droite.

---

## Ce qu'il faut regarder

Voici, dans l'ordre, les six choses qui ont changé. Cinq minutes suffisent.

**1. Le site utilise enfin la largeur de l'écran**
Ouvre la fenêtre en grand. La navigation est une **colonne à gauche**, et le
contenu s'étale sur toute la largeur.

**2. Le téléphone n'a pas bougé**
Rétrécis la fenêtre du navigateur en largeur, jusqu'à ce qu'elle fasse celle
d'un téléphone. La colonne de gauche **redescend en barre d'onglets en bas**,
et tout se range en une seule colonne. C'est exactement ce que voit un
téléphone.

**3. Chaque page a sa couleur**
Passe de **Profil** → **Missions** → **Carte** → **Mon code**. Regarde trois
choses : le **petit trait au-dessus du titre**, l'**onglet allumé** à gauche,
et le **halo très pâle en haut** de l'écran. Violet, cyan, vert d'eau, ambre.
Les boutons, eux, restent violets partout — c'est volontaire.

**4. L'espace commerçant change de matière**
Va dans **Espace commerçant**. Le bleu-violet du jeu laisse place à un **gris
de pierre, légèrement chaud**. On sent qu'on a changé d'outil avant d'avoir lu
le titre.

**5. Les listes ne sont plus des rubans sans fin**
Va dans **Lieux partenaires** (colonne de gauche). Les fiches sont rangées en
grille. Avant, cette page faisait 21 000 pixels de haut ; elle en fait
maintenant 8 400.

**6. La carte se comporte comme une vraie carte**
Va dans **Carte**, et clique sur un commerce. Sa fiche se range **à gauche**,
contre la navigation, et la carte reste visible et manipulable à côté.

> Sur la carte, le fond peut rester noir si ta connexion bloque les images
> d'OpenStreetMap. Les pastilles des commerces, elles, s'affichent quand même.

---

## Arrêter, redémarrer, repartir de zéro

**Arrêter le site** : reviens dans la fenêtre du terminal et appuie sur
**Ctrl + C** (les deux touches ensemble, y compris sur Mac).

**Le redémarrer plus tard** : rouvre un terminal dans le dossier (étape 3),
puis :

```bash
cd backend
npm start
```

Les étapes 2 et 3 (`npm install`, `npm run demo`) ne sont **pas** à refaire.

**Repartir d'un site totalement vide** : arrête le serveur, supprime le
fichier `backend/data/app.sqlite`, puis relance `npm run demo` et `npm start`.
Toutes les données de démonstration sont recréées.

---

## Si ça coince

**« npm : commande introuvable » / « npm n'est pas reconnu »**
Node.js n'est pas installé, ou le terminal a été ouvert avant l'installation.
Ferme la fenêtre du terminal, rouvres-en une, et réessaie.

**« Error: listen EADDRINUSE ... :3000 »**
Un serveur tourne déjà sur ton ordinateur. Cherche une autre fenêtre de
terminal ouverte et fais-y Ctrl + C, ou redémarre l'ordinateur.

**Le site s'ouvre mais je vois l'ancien design**
Deux causes possibles. Soit tu as téléchargé la mauvaise branche (reprends
l'étape 2 : le bouton doit afficher `claude/new-session-o0tgsj`). Soit c'est
ton navigateur qui garde l'ancienne version en mémoire : fais
**Ctrl + Maj + R** (Windows) ou **⌘ + Maj + R** (Mac) pour forcer le
rechargement.

**La page reste blanche**
Vérifie que la fenêtre du terminal affiche toujours `Serveur démarré`. Si elle
affiche autre chose, ou si elle est revenue à la ligne de commande, le serveur
s'est arrêté : relance `npm start`.

**`npm install` s'arrête sur une erreur Python / node-gyp**

Le message contient `gyp ERR! find Python`, `Could not find any Python
installation to use`, et un peu plus haut `No prebuilt binaries found`.

**N'installe surtout pas Python.** Ce que ça veut dire, c'est que le projet
demandait une version d'une brique (`better-sqlite3`) qui n'était pas
fournie toute prête pour ta version de Node, et qui essayait donc de se
fabriquer sur place — ce qui, sur Windows, réclame Python et Visual Studio.

**C'est corrigé dans le projet depuis le 30 septembre 2026.** Deux solutions :

- **Le plus simple** : re-télécharge le ZIP (étape 2), et recommence. La
  bonne version est maintenant demandée d'emblée.
- **Sans re-télécharger** : dans le dossier `backend/`, ferme tout ce qui
  pourrait ouvrir des fichiers du projet (éditeur, explorateur), puis :

```bash
rmdir /s /q node_modules          ← sur Windows
rm -rf node_modules               ← sur Mac
npm install better-sqlite3@^12.11.1
```

  Cette seule commande réinstalle tout et corrige la version au passage.
  Reprends ensuite à `npm run demo`.

**Après une erreur, les commandes suivantes échouent en cascade**

Si `npm install` a échoué, `npm run demo` répondra `'ts-node' n'est pas
reconnu` et `npm start` répondra `'nest' n'est pas reconnu`. Ce ne sont pas
de nouveaux problèmes : ces outils font partie de ce que `npm install`
devait installer. Répare l'installation, et les deux suivantes marcheront.

> Et si tu colles par erreur une ligne de résultat attendu (par exemple
> `Serveur démarré sur http://localhost:3000`), le terminal répondra
> `'Serveur' n'est pas reconnu`. C'est sans conséquence : il essayait
> simplement d'exécuter cette phrase comme une commande.

**« Cannot find module » au démarrage**
L'installation s'est interrompue. Relance `npm install` dans `backend/` et
attends qu'elle aille au bout.

---

## Facultatif — voir l'application sur ton vrai téléphone

À faire seulement si tu veux juger l'application mobile. C'est un peu plus
technique, et **ton téléphone et ton ordinateur doivent être sur le même
réseau Wi-Fi**.

1. Installe **Expo Go** sur ton téléphone (App Store ou Google Play)
2. Laisse le serveur tourner dans son terminal (étape 4)
3. Ouvre un **deuxième** terminal dans le dossier du projet, puis :

```bash
cd mobile
npm install
npx expo start
```

4. Un QR code s'affiche dans le terminal. Scanne-le avec l'appareil photo
   (iPhone) ou depuis l'application Expo Go (Android)
5. Connecte-toi avec les mêmes comptes que sur le site

L'application trouve toute seule l'adresse de ton ordinateur ; il n'y a rien à
configurer.

> Si l'application affiche une erreur de connexion, c'est en général le
> pare-feu de l'ordinateur qui bloque le port 3000, ou le téléphone qui est
> sur un autre réseau (4G au lieu du Wi-Fi).

---

## Et après

Une fois que tu as regardé, dis-moi ce qui te plaît et ce qui ne va pas. Rien
de ce qui a été fait n'est figé : les couleurs, la largeur des colonnes, la
place de chaque chose se changent en quelques minutes.
