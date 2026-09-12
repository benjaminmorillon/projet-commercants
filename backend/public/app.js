const stepAccount = document.getElementById('step-account');
const stepQuestionnaire = document.getElementById('step-questionnaire');
const stepResult = document.getElementById('step-result');

const accountForm = document.getElementById('account-form');
const accountError = document.getElementById('account-error');
const questionnaireForm = document.getElementById('questionnaire-form');
const questionnaireError = document.getElementById('questionnaire-error');
const scoresEl = document.getElementById('scores');
const restartButton = document.getElementById('restart');
const walletSection = document.getElementById('wallet-section');
const walletSoldeEl = document.getElementById('wallet-solde');
const walletHistoryEl = document.getElementById('wallet-history');
const walletHistoryEmpty = document.getElementById('wallet-history-empty');

const ARCHETYPE_LABELS = {
  scoreExplorateur: 'Explorateur',
  scoreAccomplisseur: 'Accomplisseur',
  scoreCompetiteur: 'Compétiteur',
  scoreSocialisateur: 'Socialisateur',
};

const TRANSACTION_LABELS = {
  gagne: 'Gagné',
  depense: 'Dépensé',
  don: 'Donné',
};

let playerId = localStorage.getItem('playerId');

function showStep(step) {
  stepAccount.hidden = step !== 'account';
  stepQuestionnaire.hidden = step !== 'questionnaire';
  stepResult.hidden = step !== 'result';
}

async function apiPost(path, body) {
  const response = await fetch(path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
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

async function apiGet(path) {
  const response = await fetch(path);
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.message || 'Une erreur est survenue.');
  }
  return data;
}

const DIMENSIONS = [
  ['deltaExplorateur', 'Explorateur'],
  ['deltaAccomplisseur', 'Accomplisseur'],
  ['deltaCompetiteur', 'Compétiteur'],
  ['deltaSocialisateur', 'Socialisateur'],
];

// Le profil évolue à chaque action : on affiche les scores à jour et ce qui
// les a récemment déplacés.
async function loadProfilVivant() {
  if (!playerId) return;

  const [profile, events] = await Promise.all([
    apiGet(`/players/${playerId}/profile`).catch(() => null),
    apiGet(`/players/${playerId}/events`).catch(() => []),
  ]);
  if (!profile) return;

  document.getElementById('profil-vivant').hidden = false;
  renderScoresInto(document.getElementById('profil-scores'), profile);

  const container = document.getElementById('profil-events');
  document.getElementById('profil-events-empty').hidden = events.length > 0;

  container.innerHTML = events
    .map((event) => {
      const effets = DIMENSIONS.filter(([champ]) => Math.abs(event[champ]) >= 0.1)
        .map(([champ, label]) => {
          const valeur = event[champ];
          const signe = valeur > 0 ? '+' : '';
          return `<span class="${valeur > 0 ? 'positive' : 'negative'}">${signe}${valeur} ${label}</span>`;
        })
        .join(' ');

      return `
        <div class="event-row">
          <span>${escapeHtml(event.libelle)} <span class="hint">(${new Date(event.createdAt).toLocaleDateString('fr-FR')})</span></span>
          <span class="event-effets">${effets || '<span class="hint">tracé, sans effet sur les 4 profils</span>'}</span>
        </div>
      `;
    })
    .join('');
}

async function loadWallet() {
  if (!playerId) return;

  const wallet = await apiGet(`/players/${playerId}/wallet`);
  walletSection.hidden = false;
  walletSoldeEl.textContent = `Solde actuel : ${wallet.solde} crédit${wallet.solde > 1 ? 's' : ''}`;
  walletHistoryEmpty.hidden = wallet.transactions.length > 0;

  walletHistoryEl.innerHTML = wallet.transactions
    .map((t) => {
      const label = TRANSACTION_LABELS[t.type] || t.type;
      const sign = t.montant > 0 ? '+' : '';
      const date = new Date(t.createdAt).toLocaleDateString('fr-FR');
      return `
        <div class="transaction-row">
          <span>${escapeHtml(label)} — ${escapeHtml(t.libelle || 'Mission')} <span class="hint">(${date})</span></span>
          <span class="${t.montant > 0 ? 'positive' : 'negative'}">${sign}${t.montant} crédit${Math.abs(t.montant) > 1 ? 's' : ''}</span>
        </div>
      `;
    })
    .join('');
}

accountForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  accountError.hidden = true;

  const pseudo = document.getElementById('pseudo').value.trim();
  const email = document.getElementById('email').value.trim();

  try {
    const player = await apiPost('/players', { pseudo, email });
    playerId = player.id;
    localStorage.setItem('playerId', playerId);
    showStep('questionnaire');
    loadWallet();
  } catch (error) {
    accountError.textContent = error.message;
    accountError.hidden = false;
  }
});

questionnaireForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  questionnaireError.hidden = true;

  const sliders = {
    decouverteHabitude: Number(document.getElementById('decouverteHabitude').value),
    competitionCooperation: Number(document.getElementById('competitionCooperation').value),
    seulGroupe: Number(document.getElementById('seulGroupe').value),
    objectifImprovisation: Number(document.getElementById('objectifImprovisation').value),
  };

  try {
    const profile = await apiPost(`/players/${playerId}/questionnaire`, sliders);
    renderScores(profile);
    showStep('result');
    loadProfilVivant();
  } catch (error) {
    questionnaireError.textContent = error.message;
    questionnaireError.hidden = false;
  }
});

function renderScoresInto(container, profile) {
  container.innerHTML = '';

  Object.entries(ARCHETYPE_LABELS)
    .map(([key, label]) => ({ label, value: profile[key] }))
    .sort((a, b) => b.value - a.value)
    .forEach(({ label, value }) => {
      const row = document.createElement('div');
      row.className = 'score-row';
      row.innerHTML = `
        <div class="label"><span>${label}</span><span>${value}%</span></div>
        <div class="score-bar-track">
          <div class="score-bar-fill" style="width: ${value}%"></div>
        </div>
      `;
      container.appendChild(row);
    });
}

function renderScores(profile) {
  renderScoresInto(scoresEl, profile);
}

restartButton.addEventListener('click', () => {
  localStorage.removeItem('playerId');
  playerId = null;
  accountForm.reset();
  questionnaireForm.reset();
  walletSection.hidden = true;
  document.getElementById('profil-vivant').hidden = true;
  showStep('account');
});

// Si un joueur a déjà un compte (localStorage), on saute directement au questionnaire.
if (playerId) {
  showStep('questionnaire');
  loadProfilVivant();
  loadWallet();
} else {
  showStep('account');
}
