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

async function apiPut(path, body) {
  const response = await fetch(path, {
    method: 'PUT',
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

// XP, niveau et badges (section 2.9 des specs).
async function loadProgression() {
  if (!playerId) return;

  const progression = await apiGet(`/players/${playerId}/progression`).catch(() => null);
  if (!progression) return;

  document.getElementById('progression-section').hidden = false;
  document.getElementById('niveau-actuel').textContent = `Niveau ${progression.niveau}`;
  document.getElementById('xp-total').textContent = `${progression.xpTotal} XP`;
  document.getElementById('xp-bar').style.width = `${progression.progressionVersNiveauSuivant}%`;
  document.getElementById('xp-detail').textContent =
    `${progression.xpNiveauActuel} / ${progression.xpProchainNiveau} XP vers le niveau ${progression.niveau + 1}`;

  const carte = (badge, obtenu) => `
    <div class="badge-card${obtenu ? '' : ' verrouille'}">
      <span class="badge-icone">${badge.icone}</span>
      <strong>${escapeHtml(badge.nom)}</strong>
      <span class="hint">${escapeHtml(badge.description)}</span>
    </div>
  `;

  document.getElementById('badges-obtenus-empty').hidden = progression.badgesObtenus.length > 0;
  document.getElementById('badges-obtenus').innerHTML = progression.badgesObtenus
    .map((b) => carte(b, true))
    .join('');
  document.getElementById('badges-a-debloquer').innerHTML = progression.badgesADebloquer
    .map((b) => carte(b, false))
    .join('');
}

// Titres et objets de collection : la partie « ce que tu as vécu » de la
// progression (section 2.9).
async function loadCollection() {
  if (!playerId) return;

  const collection = await apiGet(`/players/${playerId}/collection`).catch(() => null);
  if (!collection) return;

  document.getElementById('collection-section').hidden = false;

  document.getElementById('titres-liste').innerHTML = collection.titres
    .map((titre) => {
      const actif = collection.titreEquipe?.id === titre.id;
      if (!titre.obtenu) {
        return `
          <div class="titre verrouille">
            <strong>🔒 ${escapeHtml(titre.libelle)}</strong>
            <span class="hint">${escapeHtml(titre.condition)}</span>
          </div>
        `;
      }
      return `
        <button type="button" class="titre${actif ? ' actif' : ''}" data-titre="${escapeHtml(titre.id)}">
          <strong>${escapeHtml(titre.libelle)}</strong>
          <span class="hint">${actif ? 'Affiché sur ton profil' : 'Cliquer pour l’afficher'}</span>
        </button>
      `;
    })
    .join('');

  document.querySelectorAll('#titres-liste .titre[data-titre]').forEach((btn) => {
    btn.addEventListener('click', async () => {
      // Recliquer sur le titre affiché le retire.
      const actuel = collection.titreEquipe?.id;
      const choisi = btn.dataset.titre === actuel ? null : btn.dataset.titre;
      await apiPut(`/players/${playerId}/titre`, { titreId: choisi ?? undefined });
      loadCollection();
    });
  });

  document.getElementById('series-collection').innerHTML = collection.series
    .map(
      (serie) => `
        <div class="serie">
          <div class="serie-titre">
            <strong>${escapeHtml(serie.nom)}</strong>
            <span class="hint">${serie.obtenus} / ${serie.total}${serie.complete ? ' — complète !' : ''}</span>
          </div>
          <p class="hint">${escapeHtml(serie.description)}</p>
          <div class="objets">
            ${serie.items
              .map(
                (item) => `
                  <div class="objet${item.obtenu ? '' : ' verrouille'}" title="${escapeHtml(item.obtenuPar)}">
                    <span class="objet-icone">${item.obtenu ? item.icone : '·'}</span>
                    <span>${item.obtenu ? escapeHtml(item.nom) : '???'}</span>
                  </div>
                `,
              )
              .join('')}
          </div>
        </div>
      `,
    )
    .join('');
}

// Déblocage progressif : où en est le joueur dans son tutoriel, ce qui lui
// est encore fermé et pourquoi.
async function loadParcours() {
  if (!playerId) return;

  const deblocage = await apiGet(`/players/${playerId}/deblocage`).catch(() => null);
  if (!deblocage) return;

  document.getElementById('parcours-section').hidden = false;

  const restantes = deblocage.tutoriel.etapes.filter((e) => !e.faite).length;
  document.getElementById('parcours-intro').textContent = deblocage.tutoriel.termine
    ? 'Tutoriel terminé : le mode libre est ouvert.'
    : `Encore ${restantes} étape${restantes > 1 ? 's' : ''} avant le mode libre.`;

  document.getElementById('tutoriel-etapes').innerHTML = deblocage.tutoriel.etapes
    .map(
      (etape) => `
        <li class="etape${etape.faite ? ' faite' : ''}">
          <span class="etape-puce">${etape.faite ? '✓' : '○'}</span>
          <div>
            <strong>${escapeHtml(etape.titre)}</strong>
            <span class="hint">${escapeHtml(etape.consigne)}</span>
            ${etape.faite ? '' : `<a href="${escapeHtml(etape.lien)}">Y aller</a>`}
          </div>
        </li>
      `,
    )
    .join('');

  document.getElementById('fonctionnalites').innerHTML = deblocage.fonctionnalites
    .map(
      (f) => `
        <div class="deblocage${f.ouverte ? ' ouvert' : ''}">
          <span>${f.ouverte ? '🔓' : '🔒'}</span>
          <div>
            <strong>${escapeHtml(f.nom)}</strong>
            ${f.ouverte ? '' : `<span class="hint">${escapeHtml(f.condition)}</span>`}
          </div>
        </div>
      `,
    )
    .join('');

  const jour = deblocage.missionsDuJour;
  document.getElementById('missions-du-jour').textContent =
    `Missions aujourd'hui : ${jour.utilisees} / ${jour.limite} lancées, ${jour.restantes} restante${jour.restantes > 1 ? 's' : ''}. La limite monte d'une mission à chaque niveau.`;

  document.getElementById('zones-decouvertes').textContent =
    deblocage.zonesDecouvertes === 0
      ? "Carte : aucun quartier levé pour l'instant — un check-in chez un partenaire lève tout son quartier d'un coup."
      : `Carte : ${deblocage.zonesDecouvertes} quartier${deblocage.zonesDecouvertes > 1 ? 's' : ''} levé${deblocage.zonesDecouvertes > 1 ? 's' : ''}.`;
}

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
    loadParcours();
    loadProgression();
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
  document.getElementById('progression-section').hidden = true;
  document.getElementById('parcours-section').hidden = true;
  document.getElementById('collection-section').hidden = true;
  showStep('account');
});

// Si un joueur a déjà un compte (localStorage), on saute directement au questionnaire.
if (playerId) {
  showStep('questionnaire');
  loadParcours();
  loadProgression();
  loadCollection();
  loadProfilVivant();
  loadWallet();
} else {
  showStep('account');
}
