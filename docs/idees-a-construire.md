# Idées validées, à construire

Ce fichier existe pour qu'une idée décidée en cours de route ne se perde pas
entre deux séances. Chaque entrée dit **ce qu'on veut**, **pourquoi**, et
**ce que ça implique techniquement**. Rien ici n'est encore construit.

---

## 1. Le QR code du commerçant : débloquer un lieu en se présentant

**Décidé le :** 14 septembre 2026.
**CONSTRUIT le :** 15 septembre 2026 (brique 32). Ce qui reste à faire est
listé en bas de cette section.

### Ce qu'on veut

Le particulier ouvre l'application chez le commerçant et montre **son QR code**
au commerçant, qui le **scanne** depuis son espace pro. Ce scan vaut preuve de
présence : il débloque le lieu sur la carte du joueur et l'inscrit dans la
liste des clients du commerçant.

### Pourquoi c'est la bonne mécanique

- **Ça oblige à entrer dans le commerce.** Le GPS se triche depuis le trottoir
  d'en face ; un QR code présenté à quelqu'un, non. C'est la preuve de présence
  la plus solide qu'on puisse obtenir sans matériel.
- **Ça donne au commerçant une raison d'ouvrir l'application tous les jours.**
  Jusqu'ici il n'y touchait que pour valider une mission. Là, il s'en sert à
  chaque client.
- **Ça remplace une carte de fidélité, sans inscription.** Le commerçant se
  constitue une liste de clients réels, à qui il peut ensuite envoyer ses
  offres, sans que le client ait eu à créer un compte chez lui.
- **C'est cohérent avec la règle anti-fraude déjà en place sur les offres**
  (brique 29) : une offre n'est payée que si le joueur a une visite vérifiée de
  moins de 30 jours. Le QR code devient la manière naturelle de produire cette
  visite vérifiée.

### Ce que ça implique

- Un QR code **côté joueur**, affiché dans l'application, qui encode un jeton
  à usage unique et à durée de vie courte (quelques minutes). Pas l'identifiant
  du joueur en clair : une capture d'écran ne doit pas être réutilisable.
- Un **scanner côté commerçant** (caméra, dans l'espace pro et dans
  l'application), qui envoie le jeton au serveur.
- Côté serveur : vérifier le jeton, le consommer, enregistrer la visite,
  débloquer la zone de carte correspondante, et rattacher le joueur à la
  **liste des clients du commerce**.
- Un **écran « Mes clients »** côté commerçant : qui est venu, quand, combien
  de fois — et le ciblage des offres à partir de cette liste.
- Ce que le joueur accepte doit être dit clairement : se faire scanner, c'est
  entrer dans la liste de contacts du commerce. Il doit pouvoir en sortir.

### Décisions prises

- **Le pointage GPS disparaît.** Décidé le 15 septembre : « il n'y a qu'en
  physique que les commerçants pourront flasher le QR code ». Le GPS ne sert
  plus qu'à trier les lieux du plus proche au plus loin.
- **Le scan rapporte ce que rapportait le pointage** : l'XP de visite, le
  quartier levé sur la carte, le droit de laisser un avis, et la visite
  vérifiée dont les offres ont besoin. Rien n'a été ajouté par-dessus.

### Ce qui a été construit depuis

- Le **ciblage des offres sur la liste des clients** (brique 33) : un bouton
  par offre, avec trois garde-fous — une seule annonce par offre, un délai
  entre deux annonces d'un même commerce, rien vers une liste vide.
- Le **droit de sortir de la liste** d'un commerce (brique 33), sur le site
  comme dans l'application, sans perdre ses venues.
- L'**espace commerçant dans l'application** (brique 34) : un commerçant qui
  se connecte arrive sur le scanner, avec la liste de ses clients à côté.

### Ce qu'il reste à faire sur ce sujet

- **Essayer le scan caméra sur un vrai téléphone.** Le code est écrit des deux
  côtés — `expo-camera` dans l'application, `BarcodeDetector` sur le site —
  mais aucune caméra n'existe dans l'environnement de développement, donc ce
  chemin n'a jamais été exercé. La saisie des huit caractères, elle, est
  vérifiée partout et sert de recours (`BarcodeDetector` est absent de Safari
  et de Firefox).
- ~~Le reste de l'espace commerçant sur téléphone~~ — fait (brique 37) pour
  ce qui se fait debout : le comptoir (missions à valider, bons à encaisser),
  les offres et les jetons. Restent sur le site, parce qu'ils se font assis :
  les événements, le ciblage, et la carte de la concurrence.
- **Choisir l'image d'une offre depuis le téléphone.** L'écran renvoie encore
  au site. Les pièces jointes (brique 38) montrent que le sélecteur de
  fichiers fonctionne dans l'application : la même mécanique conviendrait à
  l'image d'une offre.

---

## 2. La carte sur le téléphone : un plan, pas une carte

**Décidé le :** 15 septembre 2026. **CONSTRUIT** dans la foulée (brique 36).

### Ce qui a été fait

L'onglet « Quartier » de l'application ne montre ni rues ni bâtiments : le
joueur au centre, les commerces les plus proches posés à leur vraie direction
et à leur vraie distance, et les quartiers levés en violet. Les commerces
encore voilés apparaissent en gris, sans nom ni missions — savoir qu'il y a
quelque chose là-bas est exactement ce qui donne envie d'y aller.

### Pourquoi pas une vraie carte

Une carte avec les rues demande une bibliothèque native. Conséquences :
l'application ne se teste plus avec Expo Go (il faut fabriquer une version
d'essai à chaque fois), et Android réclame une clé Google Maps. Le plan ne
demande rien, et répond déjà aux deux questions qu'on se pose devant une
carte : qu'est-ce qu'il y a autour de moi, et où suis-je allé ?

### Si on veut la vraie carte un jour

Le travail serait limité à l'écran `app/(onglets)/carte.tsx` : les données
arrivent déjà en un seul appel (`GET /map`), quartiers levés compris. C'est
le dessin qui changerait, pas la plomberie.

---

## 3. Les pièces jointes d'un commerce

**Décidé et construit le :** 15 septembre 2026 (brique 38).

Un commerçant dépose sa carte, ses tarifs, une affiche — en photo ou en PDF.
Les joueurs les retrouvent sur sa fiche, sur le site comme dans
l'application. Dix documents par commerce (réglable), 2 Mo par image, 5 Mo
par PDF.

### Les trois dangers, et ce qu'on en a fait

1. **Un fichier qui ment sur ce qu'il est.** On lit ses premiers octets,
   jamais ce qu'il prétend être. Un PDF renommé en `.png` est refusé.
2. **Un fichier qui remplit la base.** Un plafond par type, et un nombre
   maximum de documents par commerce.
3. **Un nom de fichier hostile.** C'est le plus vicieux : le nom repart dans
   un en-tête HTTP au téléchargement, et un retour à la ligne glissé dedans
   permettrait d'inventer des en-têtes. Le nom est nettoyé, pas seulement
   raccourci.

Le SVG reste refusé (c'est un document qui peut contenir du script). Le PDF
est accepté mais servi en TÉLÉCHARGEMENT, jamais affiché dans la page : un
PDF peut embarquer du script et le lecteur intégré du navigateur l'exécute ;
en téléchargement, il s'ouvre dans le lecteur du système, hors de notre
domaine.

### Ce qu'il reste à vérifier

Sur un vrai téléphone, choisir un fichier rend un chemin `file://` que
l'application convertit avant de l'envoyer. Ce chemin-là n'a pas pu être
exercé ici — seule la version web du sélecteur l'a été, et elle rend
directement le fichier encodé.

---

## 4. L'économie du jeu : ce qui a été tranché

**Décidé le :** 4 octobre 2026, après relecture du document de concept et
confrontation avec le code existant. **Rien de cette section n'est encore
construit.**

### Le basculement

L'application récompensait en **jetons**, c'est-à-dire en argent à dépenser
chez le commerçant. Le concept, lui, place les **pouvoirs** au centre : des
fonctions de l'application débloquées temporairement. Décision : on bascule
vers les pouvoirs, sans supprimer le jeton.

| | Ce que c'est | Où ça se gagne | Où ça se dépense |
| --- | --- | --- | --- |
| **Jeton** | de l'argent | offres ouvertes puis visitées, récompense exceptionnelle et aléatoire | **uniquement chez un commerçant** |
| **XP** | de la progression | toute action, y compris lire une offre | débloque niveaux, missions, fonctionnalités |
| **Pouvoir** | une fonction de l'app, temporaire | récompense de mission, récompense de niveau | dans le jeu, dehors |

### Les décisions, une par une

1. **Le jeton ne disparaît pas**, mais il n'a plus qu'un usage : se dépenser
   chez un commerçant. Il peut aussi tomber comme récompense exceptionnelle et
   aléatoire.
2. **Une offre lue rapporte de l'XP, toujours. Elle ne rapporte un jeton que
   si le joueur vient réellement chez CE commerçant.** Aujourd'hui le jeton
   tombe à la lecture, à la seule condition d'une venue récente chez
   *n'importe quel* partenaire (`eligibilite.ts`). C'est l'argent du
   commerçant qu'on déplace vers un résultat — ce que le concept appelle le
   « paiement à la visite validée ».
3. **Le ciblage coûtera moins de 30 centimes au commerçant**, et l'écart entre
   ce qu'il paie et ce qui part au joueur devient la marge. Le montant exact
   reste à fixer : il appartient au catalogue de réglages du back-office, donc
   il se changera sans code.
4. **Les commerçants ne délivrent pas de pouvoirs.** Les pouvoirs viennent de
   la progression dans les missions et des paliers de niveau, ces derniers
   variant selon le profil du joueur. *Conséquence à traiter : le concept
   prévoyait un « passe-partout offert » par le commerçant, « un pouvoir rare
   au lieu d'une réduction ». Il faudra lui trouver un remplaçant — une
   mission exclusive, une invitation, un objet de collection sans pouvoir.*

### Le QG

5. **Le QG est attaché au domicile**, par géolocalisation. *À construire avec
   précaution : le concept impose une zone approximative stockée sur
   l'appareil, jamais partagée. Enregistrer une adresse d'habitation exacte
   serait une donnée personnelle sensible de plus à protéger, pour aucun gain
   de jeu — une zone arrondie suffit à savoir qu'on est « chez soi ».*
6. **Une seule matière de construction** au départ. On diversifiera plus tard.
7. **Le QG est un menu de fonctions**, et ce qu'on y construit donne des
   capacités, pas de la décoration : décoder plus vite, recharger deux
   pouvoirs à la fois, stocker davantage.
8. **Le QG de poche** existe en deux versions : un objet rare à nombre
   d'utilisations limité, et un objet très rare sans limite. *Point de
   vigilance : un QG de poche illimité supprime définitivement, pour ce
   joueur, la raison de rentrer — c'est-à-dire un tiers de la boucle. Piste
   pour le garder vivant : qu'il ne s'ouvre que dans un commerce partenaire.*

### Les balises physiques

9. **QR code pour commencer, partout.** Le NFC est gardé pour plus tard.

   > **À ÉVOQUER** quand Benjamin demandera ce qu'il reste à faire : passer
   > les balises au NFC. Raison du report — le NFC ne se lit pas depuis un
   > site web sur iPhone (Web NFC n'existe que sur Android/Chrome), et dans
   > l'application il demande un module natif, ce qui met fin aux essais avec
   > Expo Go : il faudrait fabriquer une version de l'application à chaque
   > test. Coût pour le fondateur, pas pour le code.

10. **Deux supports par commerce**, parce que les deux usages s'opposent : un
    QR **visible** en vitrine, qui recrute ceux qui n'ont pas l'application,
    et une balise **cachée** à l'intérieur, qui est l'objet de jeu.
11. **Le terrain, c'est le centre de Nantes**, tous types de commerces de
    proximité. Les supports doivent être peu chers mais soignés — un
    accessoire en carton posé dans le commerce, que les joueurs auront envie
    de chercher, pas une affiche sur une vitre. *Conséquence immédiate : le
    quartier de démonstration est encore à Paris (Marais, Oberkampf) dans
    `backend/src/demo/donnees-demo.ts`. Il doit passer à Nantes.*

### Les compétiteurs

12. **On construit a) et b) :** classements et records, puis duels consentis
    entre deux joueurs présents dans le même lieu.

    > **À ÉVOQUER** quand Benjamin demandera ce qu'il reste à faire : c) les
    > territoires pris et repris entre équipes. Reporté parce qu'un territoire
    > n'a de sens qu'avec de la densité de joueurs, et parce qu'il fabrique
    > des perdants — or un perdant s'en va.

13. **Les joueurs forment leurs équipes eux-mêmes**, comme des maisons. **La
    mixité des profils paie** : certaines missions ne s'ouvrent qu'à une
    équipe aux archétypes variés, et les récompenses y sont plus élevées.
    C'est ce qui donne enfin un rôle au moteur de Bartle au-delà du profil
    individuel.

### L'arbre de missions

14. **L'arbre reste, et son mystère avec.** Le contenu d'une mission doit être
    simple à comprendre ; l'arbre, non — on le comprend en jouant. Un mot
    d'accueil le dira : c'est normal de ne pas tout saisir, des choses
    apparaissent au fil du jeu, et selon ses choix on ne débloque pas les
    mêmes fonctionnalités que son voisin.

    **Règle à ne pas franchir :** le mystère ne doit jamais devenir du
    blocage. On cache ce qui vient après, mais il y a toujours au moins deux
    ou trois missions faisables tout de suite.

### Le consentement au ciblage

15. À construire. Le ciblage par personnalité tourne déjà dans le prototype
    sans que personne n'ait rien accepté ; c'est du profilage publicitaire au
    sens du RGPD, et le concept exige un consentement explicite et
    désactivable.

### Mis de côté, avec les raisons

**Crypto-monnaie et NFT.** L'idée d'une monnaie calibrée sur le total des
jetons émis, et d'objets de jeu convertis en NFT échangeables, est écartée
pour l'instant — pas rejetée.

- Une monnaie dont la valeur est calibrée sur autre chose entre, en Europe,
  dans les catégories les plus encadrées du règlement MiCA (applicable depuis
  fin 2024), celles qui demandent un agrément. Ce n'est pas une fonctionnalité
  à côté d'un jeu, c'est un métier régulé. **À faire confirmer par un juriste
  avant toute décision.**
- Un objet qui donne une fonctionnalité ET s'achète en jetons rend les jetons
  convertibles en pouvoir. Or le concept interdit explicitement le
  pay-to-win, et les commerçants rechargent déjà leur compte en euros
  (`rechargement.entity.ts`) : il existerait donc un chemin de l'euro vers le
  pouvoir.
- La fonctionnalité serait de toute façon accordée par le serveur, pas par la
  chaîne. Le NFT serait un reçu ; l'autorité resterait la base de données.
- Et le public visé — quelqu'un qui veut découvrir une boulangerie à Nantes —
  devrait tenir un portefeuille crypto pour posséder son objet.

**Ce qu'on garde de l'idée, sans la chaîne :** les objets et pouvoirs
**s'échangent entre joueurs**, mais uniquement **en personne, chez un
commerçant**, comme le prévoit le concept. L'échange devient une raison de se
croiser. Zéro contrainte réglementaire, et ça sert la vision.

**L'argent réel pour les meilleurs joueurs** reste possible, mais par la porte
propre : rémunérer des **ambassadeurs** pour un travail d'animation et de
promotion, avec un contrat. C'est une relation commerciale ordinaire, pas une
sortie de jeu convertie en espèces.
