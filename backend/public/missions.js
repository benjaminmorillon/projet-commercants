// ---------------------------------------------------------------------------
// La page Missions : l'arbre.
//
// Le serveur envoie l'arbre déjà calculé (voies, paliers, état de chaque
// nœud, récompense réelle). Cette page ne recalcule rien : elle dessine ce
// qu'on lui donne, et renvoie les demandes de validation. Si une règle de
// déblocage change dans le back-office, la page suit sans être retouchée.
// ---------------------------------------------------------------------------

const filtersForm = document.getElementById('filters-form');
const filterArchetype = document.getElementById('filter-archetype');
const filterDuree = document.getElementById('filter-duree');
const filterTheme = document.getElementById('filter-theme');
const filterMode = document.getElementById('filter-mode');
const missionsList = document.getElementById('missions-list');
const missionsCount = document.getElementById('missions-count');
const missionsEmpty = document.getElementById('missions-empty');
const walletBanner = document.getElementById('wallet-banner');

const arbreSection = document.getElementById('arbre');
const arbreConnexion = document.getElementById('arbre-connexion');
const arbreResume = document.getElementById('arbre-resume');
const voiesEl = document.getElementById('voies');
const paliersEl = document.getElementById('paliers');
const detailEl = document.getElementById('noeud-detail');

const playerId = localStorage.getItem('playerId');

// Ce qui est ouvert au joueur aujourd'hui (déblocage progressif, section 2.9).
let deblocage = null;
// L'arbre reçu du serveur, la voie ouverte à l'écran, le nœud sélectionné.
let arbre = null;
let voieAffichee = null;
let noeudAffiche = null;
// L'état des demandes de validation en cours, par mission.
let statusByMission = new Map();

const ARCHETYPE_LABELS = {
  explorateur: 'Explorateur',
  accomplisseur: 'Accomplisseur',
  competiteur: 'Compétiteur',
  socialisateur: 'Socialisateur',
  mixte: 'Mixte',
};

const DUREE_LABELS = {
  courte: 'Courte',
  moyenne: 'Moyenne',
  longue: 'Longue',
};

const THEME_LABELS = {
  culture: 'Culture',
  gastronomie: 'Gastronomie',
  musique: 'Musique',
  art: 'Art',
  humour_insolite: 'Humour / insolite',
  sport: 'Sport',
  jeux_esprit: "Jeux d'esprit",
};

const MODE_LABELS = {
  solo: 'Solo',
  duo_affinite_naturelle: 'Duo — affinité naturelle',
  duo_defi_complementarite: 'Duo — défi complémentarité',
  groupe: 'Groupe',
};

const PHASE_LABELS = {
  brise_glace: 'Brise-glace',
  construction: 'Construction',
  partage: 'Partage',
};

async function apiCall(method, path, body) {
  const response = await fetch(path, {
    method,
    headers: body ? { 'Content-Type': 'application/json' } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const message = Array.isArray(data.message)
      ? data.message.join(', ')
      : data.message || 'Une erreur est survenue.';
    throw new Error(message);
  }
  return data;
}

function jetons(montant) {
  return `${montant} jeton${montant > 1 ? 's' : ''}`;
}

function renderWalletBanner(solde) {
  if (!walletBanner) return;
  if (!playerId) {
    walletBanner.innerHTML = `<a href="index.html">Crée ton profil joueur</a> pour pouvoir accomplir des missions et gagner des jetons.`;
    return;
  }
  walletBanner.innerHTML = `Ton solde : <strong>${jetons(solde)}</strong>`;
}

// Pour chaque mission, ne garde que la demande de validation la plus récente
// (une mission refusée peut être re-demandée, donc il peut y en avoir plusieurs).
function latestStatusByMission(validationRequests) {
  const latest = new Map();
  validationRequests.forEach((req) => {
    const current = latest.get(req.missionId);
    if (!current || new Date(req.createdAt) > new Date(current.createdAt)) {
      latest.set(req.missionId, req);
    }
  });
  return latest;
}

// ---------------------------------------------------------------------------
// Chargement
// ---------------------------------------------------------------------------

async function loadTout() {
  if (!playerId) {
    arbreConnexion.hidden = false;
    arbreSection.hidden = true;
    renderWalletBanner(0);
    return loadCatalogue();
  }

  const [wallet, requested, etat, nouvelArbre] = await Promise.all([
    apiCall('GET', `/players/${playerId}/wallet`),
    apiCall('GET', `/players/${playerId}/validations/requested`),
    apiCall('GET', `/players/${playerId}/deblocage`).catch(() => null),
    apiCall('GET', '/missions/arbre').catch(() => null),
  ]);

  statusByMission = latestStatusByMission(requested);
  deblocage = etat;
  arbre = nouvelArbre;

  renderWalletBanner(wallet.solde);
  renderQuotaBanner();
  renderArbre();
  return loadCatalogue();
}

// Au début, le nombre de missions par jour est volontairement limité : le
// joueur doit savoir où il en est avant de choisir sa mission.
function renderQuotaBanner() {
  const banner = document.getElementById('quota-banner');
  if (!banner) return;
  if (!deblocage) {
    banner.hidden = true;
    return;
  }
  const { limite, utilisees, restantes } = deblocage.missionsDuJour;
  banner.hidden = false;
  banner.className = restantes > 0 ? 'hint' : 'verrou';
  banner.textContent =
    restantes > 0
      ? `Il te reste ${restantes} mission${restantes > 1 ? 's' : ''} à lancer aujourd'hui (${utilisees} / ${limite}). La limite augmente d'une mission à chaque niveau.`
      : `Tu as lancé tes ${limite} missions du jour. Reviens demain — ou monte d'un niveau pour en débloquer une de plus.`;
}

function donEstOuvert() {
  const don = deblocage?.fonctionnalites.find((f) => f.id === 'don');
  return !don || don.ouverte;
}

function conditionDon() {
  return deblocage?.fonctionnalites.find((f) => f.id === 'don')?.condition ?? '';
}

// ---------------------------------------------------------------------------
// L'arbre
// ---------------------------------------------------------------------------

function renderArbre() {
  if (!arbre) {
    arbreSection.hidden = true;
    arbreConnexion.hidden = false;
    return;
  }

  arbreConnexion.hidden = true;
  arbreSection.hidden = false;

  arbreResume.textContent =
    `Niveau ${arbre.niveau} — ${arbre.accomplies} mission${arbre.accomplies > 1 ? 's' : ''} accomplie${arbre.accomplies > 1 ? 's' : ''} sur ${arbre.total}. ` +
    `Chaque palier franchi rapporte un peu plus que le précédent.`;

  // À la première ouverture on montre la voie du joueur : celle qui lui
  // correspond le mieux et qui contient encore quelque chose à faire.
  if (!voieAffichee || !arbre.voies.some((v) => v.id === voieAffichee)) {
    const aJouer = arbre.voies.find(
      (v) => v.ouverte && v.accomplies < v.total && v.rang === 1,
    );
    voieAffichee = (aJouer ?? arbre.voies[0]).id;
  }

  renderVoies();
  renderPaliers();
}

function renderVoies() {
  voiesEl.innerHTML = '';

  arbre.voies.forEach((voie) => {
    const chip = document.createElement('button');
    chip.type = 'button';
    chip.className = 'voie-chip';
    chip.style.setProperty('--voie', voie.couleur);
    if (voie.id === voieAffichee) chip.classList.add('active');
    if (!voie.ouverte) chip.classList.add('fermee');

    chip.innerHTML = `
      <span class="voie-nom">${escapeHtml(voie.nom)}</span>
      <span class="voie-compte">${voie.ouverte ? `${voie.accomplies} / ${voie.total}` : '🔒 niveau ' + voie.niveauRequis}</span>
      <span class="voie-jauge"><span style="width:${voie.total ? Math.round((voie.accomplies / voie.total) * 100) : 0}%"></span></span>
    `;
    chip.addEventListener('click', () => {
      voieAffichee = voie.id;
      noeudAffiche = null;
      renderVoies();
      renderPaliers();
    });

    voiesEl.appendChild(chip);
  });
}

function voieCourante() {
  return arbre.voies.find((v) => v.id === voieAffichee);
}

function renderPaliers() {
  const voie = voieCourante();
  paliersEl.innerHTML = '';
  paliersEl.style.setProperty('--voie', voie.couleur);

  const devise = document.createElement('p');
  devise.className = 'voie-devise';
  devise.textContent = voie.devise;
  paliersEl.appendChild(devise);

  if (!voie.ouverte) {
    const verrou = document.createElement('p');
    verrou.className = 'verrou';
    verrou.textContent = voie.condition;
    paliersEl.appendChild(verrou);
  }

  voie.paliers.forEach((palier) => {
    const bloc = document.createElement('section');
    bloc.className = 'palier';
    if (!palier.ouvert) bloc.classList.add('ferme');

    const prime =
      palier.multiplicateur > 1
        ? `<span class="palier-prime">+${Math.round((palier.multiplicateur - 1) * 100)} % de récompense</span>`
        : '';

    bloc.innerHTML = `
      <header class="palier-entete">
        <span class="palier-nom">${palier.numero}. ${escapeHtml(palier.nom)}</span>
        <span class="palier-compte">${palier.accomplies} / ${palier.total}</span>
        ${prime}
      </header>
      ${palier.condition ? `<p class="palier-condition">${escapeHtml(palier.condition)}</p>` : ''}
      <div class="noeuds"></div>
    `;

    const noeuds = bloc.querySelector('.noeuds');
    palier.noeuds.forEach((noeud) => noeuds.appendChild(renderNoeud(noeud, voie)));
    paliersEl.appendChild(bloc);
  });

  renderDetail();
}

const ICONE_ETAT = {
  accomplie: '✓',
  ouverte: '',
  a_venir: '',
  verrouillee: '🔒',
};

function renderNoeud(noeud, voie) {
  const statut = statusByMission.get(noeud.missionId);
  const enAttente = statut?.statut === 'en_attente';

  const bouton = document.createElement('button');
  bouton.type = 'button';
  bouton.className = `noeud noeud-${noeud.etat}`;
  if (enAttente) bouton.classList.add('noeud-attente');
  if (noeudAffiche === noeud.missionId) bouton.classList.add('selectionne');
  bouton.style.setProperty('--voie', voie.couleur);

  bouton.innerHTML = `
    <span class="noeud-pastille" aria-hidden="true">${enAttente ? '⏳' : ICONE_ETAT[noeud.etat]}</span>
    <span class="noeud-texte">
      <span class="noeud-titre">${escapeHtml(noeud.titre)}</span>
      <span class="noeud-meta">${DUREE_LABELS[noeud.duree] ?? noeud.duree} · ${MODE_LABELS[noeud.modeInteraction] ?? noeud.modeInteraction} · +${noeud.recompense}</span>
    </span>
  `;

  bouton.addEventListener('click', () => {
    noeudAffiche = noeud.missionId;
    renderPaliers();
    detailEl.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  });

  return bouton;
}

function noeudSelectionne() {
  if (!noeudAffiche) return null;
  for (const voie of arbre.voies) {
    for (const palier of voie.paliers) {
      const trouve = palier.noeuds.find((n) => n.missionId === noeudAffiche);
      if (trouve) return { noeud: trouve, palier, voie };
    }
  }
  return null;
}

function renderDetail() {
  const choix = noeudSelectionne();

  if (!choix) {
    detailEl.innerHTML = `
      <p class="hint">Choisis une mission dans l'arbre pour voir ce qu'elle demande et ce qu'elle rapporte.</p>
    `;
    return;
  }

  const { noeud, palier, voie } = choix;
  const statut = statusByMission.get(noeud.missionId);

  const badges = [
    DUREE_LABELS[noeud.duree],
    THEME_LABELS[noeud.theme],
    MODE_LABELS[noeud.modeInteraction],
  ]
    .filter(Boolean)
    .map((label) => `<span class="badge">${label}</span>`)
    .join('');

  const prime =
    palier.multiplicateur > 1
      ? `<p class="hint">Récompense de base ${jetons(noeud.recompenseBase)}, plus ${Math.round((palier.multiplicateur - 1) * 100)} % parce que cette mission est au palier « ${escapeHtml(palier.nom)} ».</p>`
      : '';

  detailEl.style.setProperty('--voie', voie.couleur);
  detailEl.innerHTML = `
    <p class="detail-voie">${escapeHtml(voie.nom)} · palier ${palier.numero}</p>
    <h3>${escapeHtml(noeud.titre)}</h3>
    <p class="detail-recompense">+${jetons(noeud.recompense)}</p>
    <p>${escapeHtml(noeud.description)}</p>
    <div class="badges">${badges}</div>
    ${prime}
    <div class="detail-action"></div>
  `;

  const action = detailEl.querySelector('.detail-action');
  action.innerHTML = renderCompletionArea(noeud, statut);
  if (noeud.etat === 'ouverte' && (!statut || statut.statut === 'refusee')) {
    wireCompletionArea(action, noeud);
  }
}

function renderCompletionArea(noeud, status) {
  if (status?.statut === 'validee' || noeud.etat === 'accomplie') {
    return `<p class="mission-done">✓ Mission accomplie</p>`;
  }
  if (status?.statut === 'en_attente') {
    return `<p class="mission-pending">⏳ En attente de validation${status.validatorType === 'commercant' ? ' par le commerçant' : ''}</p>`;
  }
  if (noeud.etat !== 'ouverte') {
    return `<p class="verrou">${escapeHtml(noeud.condition ?? "Cette mission n'est pas encore ouverte : termine d'abord celles qui la précèdent.")}</p>`;
  }

  const refusedNote =
    status?.statut === 'refusee'
      ? `<p class="hint">Ta demande précédente a été refusée — tu peux réessayer.</p>`
      : '';

  const validatorField = noeud.businessId
    ? ''
    : `
      <label>
        Pseudo du joueur qui doit valider
        <input type="text" class="validator-pseudo" placeholder="Ex : Bob" />
      </label>
    `;

  return `
    ${refusedNote}
    <button type="button" class="complete-btn">J'ai terminé cette mission</button>
    <div class="choix-credit" hidden>
      ${validatorField}
      <p class="hint">Que fais-tu des jetons gagnés (une fois la mission validée) ?</p>
      <div class="choix-buttons">
        <button type="button" data-choix="depense">Dépenser</button>
        <button type="button" data-choix="don"${donEstOuvert() ? '' : ` disabled title="${escapeHtml(conditionDon())}"`}>Donner${donEstOuvert() ? '' : ' 🔒'}</button>
        <button type="button" data-choix="accumulation">Accumuler</button>
      </div>
      ${donEstOuvert() ? '' : `<p class="hint">Le don s'ouvrira plus tard : ${escapeHtml(conditionDon())}</p>`}
    </div>
    <p class="complete-error error" hidden></p>
  `;
}

function wireCompletionArea(racine, noeud) {
  const completeBtn = racine.querySelector('.complete-btn');
  const choixEl = racine.querySelector('.choix-credit');
  const errorEl = racine.querySelector('.complete-error');
  const validatorInput = racine.querySelector('.validator-pseudo');
  if (!completeBtn) return;

  completeBtn.addEventListener('click', () => {
    completeBtn.hidden = true;
    choixEl.hidden = false;
  });

  choixEl.querySelectorAll('button[data-choix]').forEach((btn) => {
    btn.addEventListener('click', async () => {
      errorEl.hidden = true;

      const dto = { choix: btn.dataset.choix };
      if (validatorInput) {
        dto.validatorPseudo = validatorInput.value.trim();
      }

      try {
        await apiCall(
          'POST',
          `/players/${playerId}/missions/${noeud.missionId}/request-validation`,
          dto,
        );
        loadTout();
      } catch (error) {
        errorEl.textContent = error.message;
        errorEl.hidden = false;
      }
    });
  });
}

// ---------------------------------------------------------------------------
// Le catalogue complet, replié sous l'arbre.
// ---------------------------------------------------------------------------

async function loadCatalogue() {
  const params = new URLSearchParams();
  if (filterArchetype.value) params.set('archetype', filterArchetype.value);
  if (filterDuree.value) params.set('duree', filterDuree.value);
  if (filterTheme.value) params.set('theme', filterTheme.value);
  if (filterMode.value) params.set('modeInteraction', filterMode.value);

  const missions = await apiCall('GET', `/missions?${params.toString()}`);

  missionsList.innerHTML = '';
  missionsCount.textContent = `Missions (${missions.length})`;
  missionsEmpty.hidden = missions.length > 0;

  missions.forEach((mission) => {
    const card = document.createElement('article');
    card.className = 'mission-card';

    const badges = [
      ARCHETYPE_LABELS[mission.archetypeDominant],
      DUREE_LABELS[mission.duree],
      THEME_LABELS[mission.theme],
      MODE_LABELS[mission.modeInteraction],
      mission.phaseRelationnelle ? PHASE_LABELS[mission.phaseRelationnelle] : null,
    ]
      .filter(Boolean)
      .map((label) => `<span class="badge">${label}</span>`)
      .join('');

    card.innerHTML = `
      <div class="mission-card-header">
        <h3>${escapeHtml(mission.titre)}</h3>
        <span class="reward">+${jetons(mission.recompenseBase)}</span>
      </div>
      <p>${escapeHtml(mission.description)}</p>
      <div class="badges">${badges}</div>
    `;

    missionsList.appendChild(card);
  });
}

filtersForm.addEventListener('change', loadCatalogue);

loadTout();
