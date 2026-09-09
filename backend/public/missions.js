const filtersForm = document.getElementById('filters-form');
const filterArchetype = document.getElementById('filter-archetype');
const filterDuree = document.getElementById('filter-duree');
const filterTheme = document.getElementById('filter-theme');
const filterMode = document.getElementById('filter-mode');
const missionsList = document.getElementById('missions-list');
const missionsCount = document.getElementById('missions-count');
const missionsEmpty = document.getElementById('missions-empty');
const walletBanner = document.getElementById('wallet-banner');

const playerId = localStorage.getItem('playerId');

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

function renderWalletBanner(solde) {
  if (!walletBanner) return;
  if (!playerId) {
    walletBanner.innerHTML = `<a href="index.html">Crée ton profil joueur</a> pour pouvoir accomplir des missions et gagner des crédits.`;
    return;
  }
  walletBanner.innerHTML = `Ton solde : <strong>${solde} crédit${solde > 1 ? 's' : ''}</strong>`;
}

async function loadMissions() {
  const params = new URLSearchParams();
  if (filterArchetype.value) params.set('archetype', filterArchetype.value);
  if (filterDuree.value) params.set('duree', filterDuree.value);
  if (filterTheme.value) params.set('theme', filterTheme.value);
  if (filterMode.value) params.set('modeInteraction', filterMode.value);

  const missions = await apiCall('GET', `/missions?${params.toString()}`);

  let completedMissionIds = new Set();
  let solde = 0;
  if (playerId) {
    const wallet = await apiCall('GET', `/players/${playerId}/wallet`);
    solde = wallet.solde;
    completedMissionIds = new Set(
      wallet.transactions.filter((t) => t.type === 'gagne').map((t) => t.reference),
    );
  }

  renderWalletBanner(solde);
  renderMissions(missions, completedMissionIds);
}

function renderMissions(missions, completedMissionIds) {
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

    const isDone = completedMissionIds.has(mission.id);

    card.innerHTML = `
      <div class="mission-card-header">
        <h3>${escapeHtml(mission.titre)}</h3>
        <span class="reward">+${mission.recompenseBase} crédit${mission.recompenseBase > 1 ? 's' : ''}</span>
      </div>
      <p>${escapeHtml(mission.description)}</p>
      <div class="badges">${badges}</div>
      ${playerId ? renderCompletionArea(isDone) : ''}
    `;

    if (playerId && !isDone) {
      wireCompletionArea(card, mission.id);
    }

    missionsList.appendChild(card);
  });
}

function renderCompletionArea(isDone) {
  if (isDone) {
    return `<p class="mission-done">✓ Mission accomplie</p>`;
  }
  return `
    <button type="button" class="complete-btn">J'ai terminé cette mission</button>
    <div class="choix-credit" hidden>
      <p class="hint">Que fais-tu du crédit gagné ?</p>
      <div class="choix-buttons">
        <button type="button" data-choix="depense">Dépenser</button>
        <button type="button" data-choix="don">Donner</button>
        <button type="button" data-choix="accumulation">Accumuler</button>
      </div>
    </div>
    <p class="complete-error error" hidden></p>
  `;
}

function wireCompletionArea(card, missionId) {
  const completeBtn = card.querySelector('.complete-btn');
  const choixEl = card.querySelector('.choix-credit');
  const errorEl = card.querySelector('.complete-error');

  completeBtn.addEventListener('click', () => {
    completeBtn.hidden = true;
    choixEl.hidden = false;
  });

  choixEl.querySelectorAll('button[data-choix]').forEach((btn) => {
    btn.addEventListener('click', async () => {
      errorEl.hidden = true;
      try {
        await apiCall('POST', `/players/${playerId}/missions/${missionId}/complete`, {
          choix: btn.dataset.choix,
        });
        loadMissions();
      } catch (error) {
        errorEl.textContent = error.message;
        errorEl.hidden = false;
        choixEl.hidden = true;
        completeBtn.hidden = false;
      }
    });
  });
}

filtersForm.addEventListener('change', loadMissions);

loadMissions();
