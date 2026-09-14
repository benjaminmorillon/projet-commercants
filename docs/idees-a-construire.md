# Idées validées, à construire

Ce fichier existe pour qu'une idée décidée en cours de route ne se perde pas
entre deux séances. Chaque entrée dit **ce qu'on veut**, **pourquoi**, et
**ce que ça implique techniquement**. Rien ici n'est encore construit.

---

## 1. Le QR code du commerçant : débloquer un lieu en se présentant

**Décidé le :** 14 septembre 2026.

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

### Décisions restées ouvertes

- Le check-in GPS actuel disparaît-il, ou les deux coexistent-ils (GPS pour le
  jeu, QR code pour la fidélité et les offres) ?
- Le joueur gagne-t-il quelque chose au scan lui-même (jetons, XP), ou
  seulement l'accès ?
