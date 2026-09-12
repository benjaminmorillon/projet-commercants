const noPlayerWarning = document.getElementById('no-player-warning');
const proposerSection = document.getElementById('proposer-section');
const proposerError = document.getElementById('proposer-error');
const duosList = document.getElementById('duos-list');
const duosEmpty = document.getElementById('duos-empty');

const playerId = localStorage.getItem('playerId');

const MODE_LABELS = {
  affinite_naturelle: 'Affinité naturelle',
  defi_complementarite: 'Défi de complémentarité',
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

document.querySelectorAll('.duo-mode').forEach((btn) => {
  btn.addEventListener('click', async () => {
    proposerError.hidden = true;
    try {
      await apiCall('POST', `/players/${playerId}/duos`, { typeMatching: btn.dataset.mode });
      loadDuos();
    } catch (error) {
      proposerError.textContent = error.message;
      proposerError.hidden = false;
    }
  });
});

function renderDuo(duo) {
  const card = document.createElement('article');
  card.className = 'card duo-card';

  const partenaire = duo.partenairePseudo
    ? `<strong>${escapeHtml(duo.partenairePseudo)}</strong>`
    : `<strong class="mystere">Partenaire mystère</strong> <span class="hint">(révélé quand vous aurez tous les deux accepté)</span>`;

  const creneau = new Date(duo.creneauDebut).toLocaleDateString('fr-FR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    hour: '2-digit',
    minute: '2-digit',
  });

  let actions = '';
  if (duo.statut === 'proposee' && duo.monStatut === 'invite') {
    actions = `
      <div class="choix-buttons">
        <button type="button" class="refuser-duo">Refuser</button>
        <button type="button" class="accepter-duo">Accepter</button>
      </div>`;
  } else if (duo.statut === 'proposee') {
    actions = `<p class="mission-pending">⏳ En attente de la réponse de ton binôme</p>`;
  } else if (duo.statut === 'acceptee') {
    actions = duo.jaiConfirme
      ? `<p class="mission-pending">⏳ Tu as confirmé — en attente de ton binôme</p>`
      : `<button type="button" class="confirmer-duo">On l'a fait ✓</button>`;
  } else if (duo.statut === 'accomplie') {
    actions = `<p class="mission-done">✓ Mission accomplie ensemble</p>`;
  } else {
    actions = `<p class="hint">Duo annulé.</p>`;
  }

  card.innerHTML = `
    <div class="mission-card-header">
      <h3>${escapeHtml(duo.mission?.titre ?? 'Mission à deux')}</h3>
      <span class="reward">+${duo.mission?.recompenseBase ?? 0} crédits</span>
    </div>
    <div class="badges">
      <span class="badge">${MODE_LABELS[duo.typeMatching] ?? duo.typeMatching}</span>
      ${duo.mission?.phaseRelationnelle ? `<span class="badge">${PHASE_LABELS[duo.mission.phaseRelationnelle]}</span>` : ''}
      <span class="badge bonus">Affinité ${Math.round(duo.scoreAffinite * 100)}%</span>
    </div>
    <p>${escapeHtml(duo.mission?.description ?? '')}</p>
    <p class="hint">Avec ${partenaire}</p>
    ${duo.lieu ? `<p class="hint">📍 ${escapeHtml(duo.lieu.nom)} — ${escapeHtml(duo.lieu.adresse)}</p>` : ''}
    <p class="hint">🕗 ${creneau}</p>
    ${actions}
    <p class="duo-error error" hidden></p>
  `;

  const erreur = card.querySelector('.duo-error');
  const agir = async (action, body) => {
    erreur.hidden = true;
    try {
      await apiCall('POST', `/duos/${duo.id}/${action}/${playerId}`, body);
      loadDuos();
    } catch (error) {
      erreur.textContent = error.message;
      erreur.hidden = false;
    }
  };

  card.querySelector('.accepter-duo')?.addEventListener('click', () => agir('accepter'));
  card.querySelector('.refuser-duo')?.addEventListener('click', () => agir('refuser'));
  card.querySelector('.confirmer-duo')?.addEventListener('click', () => agir('confirmer', {}));

  return card;
}

async function loadDuos() {
  const duos = await apiCall('GET', `/players/${playerId}/duos`);
  duosList.innerHTML = '';
  duosEmpty.hidden = duos.length > 0;
  duos.forEach((duo) => duosList.appendChild(renderDuo(duo)));
}

// Les duos ne s'ouvrent qu'une fois le profil vraiment établi : on le dit
// avant, plutôt que de laisser le joueur buter sur un bouton qui refuse.
async function verifierDeblocage() {
  const deblocage = await apiCall('GET', `/players/${playerId}/deblocage`).catch(() => null);
  const duos = deblocage?.fonctionnalites.find((f) => f.id === 'duos');
  if (!duos || duos.ouverte) {
    proposerSection.hidden = false;
    return;
  }
  const verrou = document.getElementById('duo-verrou');
  verrou.innerHTML = `🔒 <strong>Missions à deux — pas encore débloqué.</strong> ${escapeHtml(duos.condition)}`;
  verrou.hidden = false;
}

if (playerId) {
  verifierDeblocage();
  loadDuos();
} else {
  noPlayerWarning.hidden = false;
}
