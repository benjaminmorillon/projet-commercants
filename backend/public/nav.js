// ---------------------------------------------------------------------------
// La coquille de l'application : barre du haut et barre d'onglets du bas,
// identiques sur toutes les pages. Écrite ici une seule fois plutôt que
// recopiée dans chaque fichier HTML.
// ---------------------------------------------------------------------------

const ICONES = {
  profil: '<circle cx="12" cy="8" r="3.6"/><path d="M4.6 20c.6-3.8 3.7-6 7.4-6s6.8 2.2 7.4 6"/>',
  missions: '<path d="M4 21V4.6c3-1.4 5.5.9 8.5-.5 3-1.4 5.5.9 7.5-.1v10c-2 1-4.5-1.3-7.5.1-3 1.4-5.5-.9-8.5.5"/>',
  carte: '<path d="M9 3.6 3.6 6v14.4L9 18l6 2.4 5.4-2.4V3.6L15 6Z"/><path d="M9 3.6V18M15 6v14.4"/>',
  duos: '<circle cx="9" cy="8.4" r="3.2"/><path d="M2.8 19.6c.5-3.3 3.1-5.2 6.2-5.2s5.7 1.9 6.2 5.2"/><path d="M16.4 5.6a3.2 3.2 0 0 1 0 6M17.6 14.9c2.2.6 3.4 2.3 3.7 4.7"/>',
  plus: '<circle cx="5.5" cy="12" r="1.4"/><circle cx="12" cy="12" r="1.4"/><circle cx="18.5" cy="12" r="1.4"/>',
  lieux: '<path d="M12 21c4-4.4 6-7.6 6-10.3A6 6 0 0 0 6 10.7C6 13.4 8 16.6 12 21Z"/><circle cx="12" cy="10.6" r="2.2"/>',
  validation: '<path d="M4.5 12.5 9.5 17.5 19.5 6.5"/>',
  invitations: '<rect x="3" y="5.5" width="18" height="13" rx="2.2"/><path d="m3.8 7 7.1 5.4a2 2 0 0 0 2.2 0L20.2 7"/>',
  amis: '<circle cx="12" cy="8" r="3.4"/><path d="M5 19.4c.6-3.5 3.4-5.6 7-5.6s6.4 2.1 7 5.6"/>',
  offres: '<path d="M12 3.4 3.6 6.2v6c0 4.4 3.4 7.4 8.4 8.4 5-1 8.4-4 8.4-8.4v-6Z"/><path d="m9.4 14.6 5.2-5.2"/><circle cx="9.6" cy="9.8" r="1"/><circle cx="14.4" cy="14.2" r="1"/>',
  commercant: '<path d="M4 9.5 5.4 4.6h13.2L20 9.5a2.7 2.7 0 0 1-5.3.6 2.7 2.7 0 0 1-5.4 0 2.7 2.7 0 0 1-5.3-.6Z"/><path d="M5.4 11.6v7.8h13.2v-7.8"/>',
  cloche: '<path d="M18 9.6a6 6 0 1 0-12 0c0 4.6-1.6 6-1.6 6h15.2S18 14.2 18 9.6Z"/><path d="M13.7 19.4a2 2 0 0 1-3.4 0"/>',
};

function icone(nom) {
  return `<svg viewBox="0 0 24 24" aria-hidden="true">${ICONES[nom]}</svg>`;
}

// Les 4 destinations principales, plus le bouton qui ouvre le reste.
const ONGLETS = [
  { href: 'index.html', label: 'Profil', icone: 'profil' },
  { href: 'missions.html', label: 'Missions', icone: 'missions' },
  { href: 'carte.html', label: 'Carte', icone: 'carte' },
  { href: 'duos.html', label: 'Duos', icone: 'duos' },
];

// Le reste de la navigation, dans la feuille « Plus ».
const SECONDAIRES = [
  { href: 'lieux.html', label: 'Lieux partenaires', icone: 'lieux' },
  { href: 'validation.html', label: 'Validation de missions', icone: 'validation' },
  { href: 'invitations.html', label: 'Invitations', icone: 'invitations' },
  { href: 'amis.html', label: 'Amis', icone: 'amis' },
  { href: 'offres.html', label: 'Offres et bons', icone: 'offres' },
];

function pageCourante() {
  const fichier = window.location.pathname.split('/').pop();
  return fichier === '' ? 'index.html' : fichier;
}

function construireCoquille() {
  const courante = pageCourante();
  const dansLeMenu = SECONDAIRES.some((item) => item.href === courante);

  const appbar = document.createElement('header');
  appbar.className = 'appbar';
  appbar.innerHTML = `
    <a class="wordmark" href="index.html">
      <span class="wordmark-dot"></span>
      Projet Commerçant
    </a>
    <div class="appbar-actions">
      <a class="appbar-link${courante === 'commercant.html' ? ' active' : ''}" href="commercant.html">Espace commerçant</a>
      <button type="button" class="cloche" id="btn-cloche" aria-label="Notifications">
        ${icone('cloche')}
        <span class="cloche-compteur" id="cloche-compteur" hidden></span>
      </button>
    </div>
  `;

  const tabbar = document.createElement('nav');
  tabbar.className = 'tabbar';
  tabbar.setAttribute('aria-label', 'Navigation principale');
  tabbar.innerHTML =
    ONGLETS.map(
      (onglet) => `
        <a class="tab${onglet.href === courante ? ' active' : ''}" href="${onglet.href}">
          ${icone(onglet.icone)}
          <span>${onglet.label}</span>
        </a>
      `,
    ).join('') +
    `<button type="button" class="tab${dansLeMenu ? ' active' : ''}" id="tab-plus">
       ${icone('plus')}
       <span>Plus</span>
     </button>`;

  document.body.prepend(appbar);
  document.body.appendChild(tabbar);

  document.getElementById('tab-plus').addEventListener('click', () => ouvrirMenu(courante));
  document.getElementById('btn-cloche').addEventListener('click', ouvrirNotifications);

  rafraichirCompteur();
}

// ---------------------------------------------------------------------------
// Notifications : la pastille de la cloche, et le panneau qui les liste
// ---------------------------------------------------------------------------

async function rafraichirCompteur() {
  try {
    const reponse = await fetchOriginal('/notifications/non-lues');
    if (!reponse.ok) return;
    const { nonLues } = await reponse.json();
    const pastille = document.getElementById('cloche-compteur');
    pastille.textContent = nonLues > 9 ? '9+' : String(nonLues);
    pastille.hidden = nonLues === 0;
  } catch {
    // Hors ligne ou pas connecté : la cloche reste simplement muette.
  }
}

function dateRelative(iso) {
  const minutes = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
  if (minutes < 1) return "à l'instant";
  if (minutes < 60) return `il y a ${minutes} min`;
  const heures = Math.round(minutes / 60);
  if (heures < 24) return `il y a ${heures} h`;
  const jours = Math.round(heures / 24);
  return jours === 1 ? 'hier' : `il y a ${jours} jours`;
}

async function ouvrirNotifications() {
  if (document.querySelector('.sheet')) {
    return;
  }

  const fond = document.createElement('div');
  fond.className = 'sheet-fond';
  const panneau = document.createElement('section');
  panneau.className = 'sheet sheet-notifications';
  panneau.innerHTML = '<div class="sheet-poignee"></div><p class="hint">Chargement...</p>';

  const fermer = () => {
    fond.remove();
    panneau.remove();
    document.removeEventListener('keydown', surEchap);
    rafraichirCompteur();
  };
  const surEchap = (event) => {
    if (event.key === 'Escape') fermer();
  };
  fond.addEventListener('click', fermer);
  document.addEventListener('keydown', surEchap);

  document.body.appendChild(fond);
  document.body.appendChild(panneau);

  let donnees;
  try {
    const reponse = await fetchOriginal('/notifications');
    if (!reponse.ok) throw new Error('non connecté');
    donnees = await reponse.json();
  } catch {
    panneau.innerHTML =
      '<div class="sheet-poignee"></div><p class="hint">Connecte-toi pour voir tes notifications.</p>';
    return;
  }

  const liste = donnees.notifications;
  panneau.innerHTML = `
    <div class="sheet-poignee"></div>
    <div class="sheet-entete">
      <strong>Notifications</strong>
      ${donnees.nonLues > 0 ? '<button type="button" class="lien-discret" id="tout-lu">Tout marquer comme lu</button>' : ''}
    </div>
    ${
      liste.length === 0
        ? '<p class="hint">Rien de neuf. Les demandes de validation, les duos et les invitations arriveront ici.</p>'
        : liste
            .map(
              (n) => `
                <a class="notif${n.lueLe ? '' : ' non-lue'}" href="${escapeHtml(n.lien)}" data-id="${escapeHtml(n.id)}">
                  <span class="notif-point"></span>
                  <span class="notif-texte">
                    <strong>${escapeHtml(n.titre)}</strong>
                    <span>${escapeHtml(n.corps)}</span>
                    <span class="notif-date">${dateRelative(n.createdAt)}</span>
                  </span>
                </a>
              `,
            )
            .join('')
    }
  `;

  panneau.querySelectorAll('.notif').forEach((lien) => {
    lien.addEventListener('click', () => {
      // Marquer comme lue sans retarder la navigation.
      fetchOriginal(`/notifications/${lien.dataset.id}/lue`, { method: 'POST' }).catch(() => null);
    });
  });

  panneau.querySelector('#tout-lu')?.addEventListener('click', async () => {
    await fetchOriginal('/notifications/tout-lu', { method: 'POST' }).catch(() => null);
    fermer();
  });
}

function ouvrirMenu(courante) {
  if (document.querySelector('.sheet')) {
    return;
  }

  const fond = document.createElement('div');
  fond.className = 'sheet-fond';

  const sheet = document.createElement('nav');
  sheet.className = 'sheet';
  sheet.setAttribute('aria-label', 'Navigation secondaire');
  sheet.innerHTML =
    '<div class="sheet-poignee"></div>' +
    SECONDAIRES.map(
      (item) => `
        <a href="${item.href}"${item.href === courante ? ' class="active"' : ''}>
          ${icone(item.icone)}
          ${item.label}
        </a>
      `,
    ).join('') +
    '<div class="sheet-separateur"></div>' +
    `<a href="commercant.html"${courante === 'commercant.html' ? ' class="active"' : ''}>
       ${icone('commercant')}
       Espace commerçant
     </a>`;

  const fermer = () => {
    fond.remove();
    sheet.remove();
    document.removeEventListener('keydown', surEchap);
  };
  const surEchap = (event) => {
    if (event.key === 'Escape') fermer();
  };

  fond.addEventListener('click', fermer);
  document.addEventListener('keydown', surEchap);

  document.body.appendChild(fond);
  document.body.appendChild(sheet);
}

// ---------------------------------------------------------------------------
// Session expirée : on renvoie vers l'écran de connexion plutôt que de
// laisser la page se remplir d'erreurs.
// ---------------------------------------------------------------------------

const fetchOriginal = window.fetch.bind(window);

window.fetch = async function fetchAvecSession(ressource, options) {
  const reponse = await fetchOriginal(ressource, options);

  // `/auth/moi` sert justement à SAVOIR si on est connecté : un 401 y est une
  // réponse normale, pas une session perdue.
  const url = typeof ressource === 'string' ? ressource : ressource?.url ?? '';
  const sondeAuth = url.includes('/auth/');

  if (reponse.status === 401 && !sondeAuth && pageCourante() !== 'index.html') {
    localStorage.removeItem('playerId');
    localStorage.removeItem('businessId');
    window.location.href = 'index.html';
  }

  return reponse;
};

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', construireCoquille);
} else {
  construireCoquille();
}
