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

async function loadMissions() {
  const params = new URLSearchParams();
  if (filterArchetype.value) params.set('archetype', filterArchetype.value);
  if (filterDuree.value) params.set('duree', filterDuree.value);
  if (filterTheme.value) params.set('theme', filterTheme.value);
  if (filterMode.value) params.set('modeInteraction', filterMode.value);

  const missions = await apiCall('GET', `/missions?${params.toString()}`);

  let statusByMission = new Map();
  let solde = 0;
  if (playerId) {
    const [wallet, requested] = await Promise.all([
      apiCall('GET', `/players/${playerId}/wallet`),
      apiCall('GET', `/players/${playerId}/validations/requested`),
    ]);
    solde = wallet.solde;
    statusByMission = latestStatusByMission(requested);
  }

  renderWalletBanner(solde);
  renderMissions(missions, statusByMission);
}

function renderMissions(missions, statusByMission) {
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

    const status = statusByMission.get(mission.id);

    card.innerHTML = `
      <div class="mission-card-header">
        <h3>${escapeHtml(mission.titre)}</h3>
        <span class="reward">+${mission.recompenseBase} crédit${mission.recompenseBase > 1 ? 's' : ''}</span>
      </div>
      <p>${escapeHtml(mission.description)}</p>
      <div class="badges">${badges}</div>
      ${playerId ? renderCompletionArea(mission, status) : ''}
    `;

    if (playerId && (!status || status.statut === 'refusee')) {
      wireCompletionArea(card, mission);
    }

    missionsList.appendChild(card);
  });
}

function renderCompletionArea(mission, status) {
  if (status?.statut === 'validee') {
    return `<p class="mission-done">✓ Mission accomplie</p>`;
  }
  if (status?.statut === 'en_attente') {
    return `<p class="mission-pending">⏳ En attente de validation${status.validatorType === 'commercant' ? ' par le commerçant' : ''}</p>`;
  }

  const refusedNote =
    status?.statut === 'refusee'
      ? `<p class="hint">Ta demande précédente a été refusée — tu peux réessayer.</p>`
      : '';

  const validatorField = mission.businessId
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
      <p class="hint">Que fais-tu du crédit gagné (une fois validé) ?</p>
      <div class="choix-buttons">
        <button type="button" data-choix="depense">Dépenser</button>
        <button type="button" data-choix="don">Donner</button>
        <button type="button" data-choix="accumulation">Accumuler</button>
      </div>
    </div>
    <p class="complete-error error" hidden></p>
  `;
}

function wireCompletionArea(card, mission) {
  const completeBtn = card.querySelector('.complete-btn');
  const choixEl = card.querySelector('.choix-credit');
  const errorEl = card.querySelector('.complete-error');
  const validatorInput = card.querySelector('.validator-pseudo');

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
          `/players/${playerId}/missions/${mission.id}/request-validation`,
          dto,
        );
        loadMissions();
      } catch (error) {
        errorEl.textContent = error.message;
        errorEl.hidden = false;
      }
    });
  });
}

filtersForm.addEventListener('change', loadMissions);

loadMissions();
