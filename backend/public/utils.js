// ---------------------------------------------------------------------------
// Note sur `localStorage.playerId` / `localStorage.businessId`
//
// Ce n'est PAS ce qui prouve qui on est. L'identité tient dans le cookie de
// session, que le JavaScript de la page ne peut même pas lire, et le serveur
// refuse toute requête qui agirait au nom de quelqu'un d'autre. Ces deux
// valeurs ne servent qu'à une chose : éviter à la page de redemander « et moi,
// je suis qui ? » à chaque chargement. Les effacer ou les bricoler ne donne
// accès à rien.
// ---------------------------------------------------------------------------

// Échappe du texte avant de l'insérer dans du HTML (innerHTML), pour éviter
// qu'un titre/commentaire saisi par un commerçant ou un joueur ne soit
// interprété comme du code (injection XSS).
function escapeHtml(value) {
  if (value === null || value === undefined) {
    return '';
  }
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// ---------------------------------------------------------------------------
// Les photos de profil.
//
// Une photo n'est jamais transportée dans le JSON : le serveur dit seulement
// QUI en a une et de quand elle date, et la page va chercher l'image à son
// adresse. Le navigateur la met alors en cache comme n'importe quelle image.
//
// Le `?v=` est la date de la dernière photo. Sans lui, quelqu'un qui change
// sa photo continuerait de voir l'ancienne, servie depuis le cache.
// ---------------------------------------------------------------------------

function urlPhoto(sujet, id, version) {
  if (!version || !id) {
    return null;
  }
  return `/photos/${sujet}/${encodeURIComponent(id)}?v=${version}`;
}

/** Les initiales d'un nom : « Le Café des Arts » donne « LC ». */
function initialesDe(nom) {
  const mots = String(nom || '?')
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  if (mots.length === 0) return '?';
  if (mots.length === 1) return mots[0].slice(0, 2).toUpperCase();
  return (mots[0][0] + mots[1][0]).toUpperCase();
}

/**
 * La pastille d'un joueur ou d'un lieu : sa photo, ou ses initiales.
 *
 * Les initiales ne sont pas un pis-aller : la plupart des gens ne mettront
 * jamais de photo, et une pastille vide ferait une liste triste et illisible.
 * Chaque nom reçoit toujours la même couleur, pour qu'on reconnaisse les
 * têtes d'une page à l'autre même sans photo.
 */
function pastilleAvatar(nom, url, taille = 'moyen') {
  const classes = `avatar avatar-${taille}`;

  if (url) {
    // `onerror` : si la photo a été retirée entre-temps, on retombe sur les
    // initiales au lieu d'afficher une image cassée.
    return `<span class="${classes}" data-teinte="${teinteDe(nom)}">
      <img src="${escapeHtml(url)}" alt="" loading="lazy"
           onerror="this.remove()" />
      <span class="avatar-initiales">${escapeHtml(initialesDe(nom))}</span>
    </span>`;
  }

  return `<span class="${classes}" data-teinte="${teinteDe(nom)}">
    <span class="avatar-initiales">${escapeHtml(initialesDe(nom))}</span>
  </span>`;
}

/** Une teinte stable par nom, parmi six. */
function teinteDe(nom) {
  const texte = String(nom || '');
  let somme = 0;
  for (let i = 0; i < texte.length; i += 1) {
    somme = (somme + texte.charCodeAt(i) * (i + 1)) % 997;
  }
  return somme % 6;
}

/**
 * Réduit une image choisie par l'utilisateur avant de l'envoyer.
 *
 * Une photo de téléphone pèse plusieurs mégaoctets, pour être affichée dans
 * une pastille de 40 pixels. On la réduit dans le navigateur : l'envoi est
 * instantané, la base reste légère, et le serveur n'a rien à redimensionner.
 */
function reduireImage(fichier, cote = 512, qualite = 0.72) {
  return new Promise((resoudre, rejeter) => {
    const lecteur = new FileReader();
    lecteur.onerror = () => rejeter(new Error("Impossible de lire ce fichier."));
    lecteur.onload = () => {
      const image = new Image();
      image.onerror = () => rejeter(new Error("Ce fichier n'est pas une image."));
      image.onload = () => {
        // On recadre au carré, centré : une pastille ronde sur une photo en
        // longueur couperait les visages n'importe où.
        const cote0 = Math.min(image.width, image.height);
        const gauche = (image.width - cote0) / 2;
        const haut = (image.height - cote0) / 2;

        const toile = document.createElement('canvas');
        toile.width = cote;
        toile.height = cote;
        toile.getContext('2d').drawImage(image, gauche, haut, cote0, cote0, 0, 0, cote, cote);
        resoudre(toile.toDataURL('image/jpeg', qualite));
      };
      image.src = lecteur.result;
    };
    lecteur.readAsDataURL(fichier);
  });
}
