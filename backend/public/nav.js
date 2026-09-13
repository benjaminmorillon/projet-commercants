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
  commercant: '<path d="M4 9.5 5.4 4.6h13.2L20 9.5a2.7 2.7 0 0 1-5.3.6 2.7 2.7 0 0 1-5.4 0 2.7 2.7 0 0 1-5.3-.6Z"/><path d="M5.4 11.6v7.8h13.2v-7.8"/>',
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
    <a class="appbar-link${courante === 'commercant.html' ? ' active' : ''}" href="commercant.html">Espace commerçant</a>
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

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', construireCoquille);
} else {
  construireCoquille();
}
