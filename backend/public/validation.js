const noAccountWarning = document.getElementById('no-account-warning');
const playerSection = document.getElementById('player-section');
const playerRequestsEl = document.getElementById('player-requests');
const playerRequestsEmpty = document.getElementById('player-requests-empty');
const businessSection = document.getElementById('business-section');
const businessRequestsEl = document.getElementById('business-requests');
const businessRequestsEmpty = document.getElementById('business-requests-empty');

const playerId = localStorage.getItem('playerId');
const businessId = localStorage.getItem('businessId');

const CHOIX_LABELS = {
  depense: 'dépenser',
  don: 'donner',
  accumulation: 'accumuler',
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

function openValidationPopup(request, onResolved) {
  const overlay = document.createElement('div');
  overlay.className = 'popup-overlay';
  overlay.innerHTML = `
    <div class="popup-card">
      <h3>${escapeHtml(request.missionTitre)}</h3>
      <p><strong>${escapeHtml(request.requesterPseudo)}</strong> affirme avoir accompli cette mission et choisit de <strong>${CHOIX_LABELS[request.choix] || request.choix}</strong> les ${request.missionRecompense} crédit${request.missionRecompense > 1 ? 's' : ''} gagnés.</p>
      <p class="hint">Confirme uniquement si tu as toi-même constaté que la mission a bien été réalisée.</p>
      <p class="popup-error error" hidden></p>
      <div class="popup-actions">
        <button type="button" class="popup-refuser">Refuser</button>
        <button type="button" class="popup-valider">✓ Valider</button>
      </div>
    </div>
  `;
  document.body.appendChild(overlay);

  const errorEl = overlay.querySelector('.popup-error');

  const resolve = async (statut) => {
    errorEl.hidden = true;
    try {
      await apiCall('POST', `/validations/${request.id}/${statut === 'validee' ? 'valider' : 'refuser'}`);
      overlay.remove();
      onResolved();
    } catch (error) {
      errorEl.textContent = error.message;
      errorEl.hidden = false;
    }
  };

  overlay.querySelector('.popup-valider').addEventListener('click', () => resolve('validee'));
  overlay.querySelector('.popup-refuser').addEventListener('click', () => resolve('refusee'));
  overlay.addEventListener('click', (event) => {
    if (event.target === overlay) overlay.remove();
  });
}

function renderRequestRow(request, onResolved) {
  const row = document.createElement('article');
  row.className = 'card validation-row';
  row.innerHTML = `
    <div class="mission-card-header">
      <h3>${escapeHtml(request.missionTitre)}</h3>
      <span class="reward">+${request.missionRecompense} crédit${request.missionRecompense > 1 ? 's' : ''}</span>
    </div>
    <p class="hint">Demandé par <strong>${escapeHtml(request.requesterPseudo)}</strong></p>
    <button type="button" class="examine-btn">Examiner la demande</button>
  `;
  row.querySelector('.examine-btn').addEventListener('click', () => {
    openValidationPopup(request, onResolved);
  });
  return row;
}

async function loadPlayerRequests() {
  const requests = await apiCall('GET', `/players/${playerId}/validations/to-validate`);
  playerRequestsEl.innerHTML = '';
  playerRequestsEmpty.hidden = requests.length > 0;
  requests.forEach((request) => {
    playerRequestsEl.appendChild(renderRequestRow(request, loadPlayerRequests));
  });
}

async function loadBusinessRequests() {
  const requests = await apiCall('GET', `/businesses/${businessId}/validations`);
  businessRequestsEl.innerHTML = '';
  businessRequestsEmpty.hidden = requests.length > 0;
  requests.forEach((request) => {
    businessRequestsEl.appendChild(renderRequestRow(request, loadBusinessRequests));
  });
}

noAccountWarning.hidden = Boolean(playerId || businessId);

if (playerId) {
  playerSection.hidden = false;
  loadPlayerRequests();
}

if (businessId) {
  businessSection.hidden = false;
  loadBusinessRequests();
}
