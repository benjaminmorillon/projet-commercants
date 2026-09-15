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
- **Le reste de l'espace commerçant sur téléphone** : offres, événements,
  ciblage et concurrence restent sur le site. À décider s'ils doivent suivre.

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
