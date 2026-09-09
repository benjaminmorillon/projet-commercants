const noPlayerWarning = document.getElementById('no-player-warning');
const mainContent = document.getElementById('main-content');
const addFriendForm = document.getElementById('add-friend-form');
const addFriendError = document.getElementById('add-friend-error');
const addFriendSuccess = document.getElementById('add-friend-success');
const receivedList = document.getElementById('received-list');
const receivedEmpty = document.getElementById('received-empty');
const sentList = document.getElementById('sent-list');
const sentEmpty = document.getElementById('sent-empty');
const friendsList = document.getElementById('friends-list');
const friendsEmpty = document.getElementById('friends-empty');
const friendProfileSection = document.getElementById('friend-profile-section');
const friendProfileTitle = document.getElementById('friend-profile-title');
const friendProfileScores = document.getElementById('friend-profile-scores');
const friendProfileMissions = document.getElementById('friend-profile-missions');
const friendProfileMissionsEmpty = document.getElementById('friend-profile-missions-empty');

const playerId = localStorage.getItem('playerId');

const ARCHETYPE_LABELS = {
  scoreExplorateur: 'Explorateur',
  scoreAccomplisseur: 'Accomplisseur',
  scoreCompetiteur: 'Compétiteur',
  scoreSocialisateur: 'Socialisateur',
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

addFriendForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  addFriendError.hidden = true;
  addFriendSuccess.hidden = true;

  const pseudo = document.getElementById('friend-pseudo').value.trim();

  try {
    await apiCall('POST', `/players/${playerId}/friends/request`, { pseudo });
    addFriendSuccess.textContent = 'Demande envoyée !';
    addFriendSuccess.hidden = false;
    addFriendForm.reset();
    loadAll();
  } catch (error) {
    addFriendError.textContent = error.message;
    addFriendError.hidden = false;
  }
});

function renderReceived(requests) {
  receivedList.innerHTML = '';
  receivedEmpty.hidden = requests.length > 0;

  requests.forEach((req) => {
    const row = document.createElement('article');
    row.className = 'card friend-row';
    row.innerHTML = `
      <p><strong>${escapeHtml(req.otherPseudo)}</strong> veut être ton ami.</p>
      <div class="choix-buttons">
        <button type="button" class="refuse-btn">Refuser</button>
        <button type="button" class="accept-btn">Accepter</button>
      </div>
    `;
    row.querySelector('.accept-btn').addEventListener('click', async () => {
      await apiCall('POST', `/friends/${req.id}/accept`);
      loadAll();
    });
    row.querySelector('.refuse-btn').addEventListener('click', async () => {
      await apiCall('POST', `/friends/${req.id}/refuse`);
      loadAll();
    });
    receivedList.appendChild(row);
  });
}

function renderSent(requests) {
  sentList.innerHTML = '';
  sentEmpty.hidden = requests.length > 0;

  requests.forEach((req) => {
    const row = document.createElement('article');
    row.className = 'card friend-row';
    row.innerHTML = `<p>Demande envoyée à <strong>${escapeHtml(req.otherPseudo)}</strong> — en attente.</p>`;
    sentList.appendChild(row);
  });
}

function renderFriends(friends) {
  friendsList.innerHTML = '';
  friendsEmpty.hidden = friends.length > 0;

  friends.forEach((friend) => {
    const row = document.createElement('article');
    row.className = 'card friend-row';
    row.innerHTML = `
      <p><strong>${escapeHtml(friend.pseudo)}</strong></p>
      <button type="button" class="view-profile-btn">Voir le profil</button>
    `;
    row.querySelector('.view-profile-btn').addEventListener('click', () => {
      loadFriendProfile(friend.id);
    });
    friendsList.appendChild(row);
  });
}

async function loadFriendProfile(friendId) {
  const data = await apiCall('GET', `/players/${playerId}/friends/${friendId}`);
  friendProfileSection.hidden = false;
  friendProfileTitle.textContent = `Profil de ${data.friend.pseudo}`;

  friendProfileScores.innerHTML = '';
  if (data.profile) {
    Object.entries(ARCHETYPE_LABELS)
      .map(([key, label]) => ({ label, value: data.profile[key] }))
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
        friendProfileScores.appendChild(row);
      });
  } else {
    friendProfileScores.innerHTML = `<p class="hint">${data.friend.pseudo} n'a pas encore répondu au questionnaire.</p>`;
  }

  friendProfileMissionsEmpty.hidden = data.missionsAccomplies.length > 0;
  friendProfileMissions.innerHTML = data.missionsAccomplies
    .map(
      (m) => `
        <article class="mission-card">
          <div class="mission-card-header">
            <h3>${escapeHtml(m.titre)}</h3>
            <span class="reward">+${m.recompenseBase} crédit${m.recompenseBase > 1 ? 's' : ''}</span>
          </div>
          <p class="hint">${new Date(m.date).toLocaleDateString('fr-FR')}</p>
        </article>
      `,
    )
    .join('');

  friendProfileSection.scrollIntoView({ behavior: 'smooth' });
}

async function loadAll() {
  const [received, sent, friends] = await Promise.all([
    apiCall('GET', `/players/${playerId}/friends/requests`),
    apiCall('GET', `/players/${playerId}/friends/sent`),
    apiCall('GET', `/players/${playerId}/friends`),
  ]);
  renderReceived(received);
  renderSent(sent);
  renderFriends(friends);
}

if (playerId) {
  noPlayerWarning.hidden = true;
  mainContent.hidden = false;
  loadAll();
} else {
  noPlayerWarning.hidden = false;
  mainContent.hidden = true;
}
