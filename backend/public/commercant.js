const stepAccount = document.getElementById('step-account');
const stepDashboard = document.getElementById('step-dashboard');

const accountForm = document.getElementById('account-form');
const accountError = document.getElementById('account-error');
const missionForm = document.getElementById('mission-form');
const missionError = document.getElementById('mission-error');
const missionSuccess = document.getElementById('mission-success');
const businessMissionsEl = document.getElementById('business-missions');
const businessMissionsEmpty = document.getElementById('business-missions-empty');

let businessId = localStorage.getItem('businessId');

function showDashboard(show) {
  stepAccount.hidden = show;
  stepDashboard.hidden = !show;
}

function getCurrentPosition() {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error("Ton navigateur ne supporte pas la géolocalisation."));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (position) => resolve(position.coords),
      () => reject(new Error("Impossible d'obtenir ta position. Autorise l'accès à la localisation et réessaie (tu dois être sur place pour créer ta fiche établissement).")),
      { enableHighAccuracy: true, timeout: 10000 },
    );
  });
}

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

accountForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  accountError.hidden = true;

  const capacite = document.getElementById('capaciteEstimee').value;

  try {
    const coords = await getCurrentPosition();

    const dto = {
      nom: document.getElementById('nom').value.trim(),
      email: document.getElementById('email').value.trim(),
      adresse: document.getElementById('adresse').value.trim(),
      latitude: coords.latitude,
      longitude: coords.longitude,
      typeEtablissement: document.getElementById('typeEtablissement').value,
      ...(capacite ? { capaciteEstimee: Number(capacite) } : {}),
    };

    const business = await apiCall('POST', '/businesses', dto);
    businessId = business.id;
    localStorage.setItem('businessId', businessId);
    showDashboard(true);
    loadMissions();
  } catch (error) {
    accountError.textContent = error.message;
    accountError.hidden = false;
  }
});

missionForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  missionError.hidden = true;
  missionSuccess.hidden = true;

  const dto = {
    titre: document.getElementById('titre').value.trim(),
    description: document.getElementById('description').value.trim(),
    archetypeDominant: document.getElementById('archetypeDominant').value,
    duree: document.getElementById('duree').value,
    theme: document.getElementById('theme').value,
    modeInteraction: document.getElementById('modeInteraction').value,
    recompenseBase: Number(document.getElementById('recompenseBase').value),
  };

  try {
    await apiCall('POST', `/businesses/${businessId}/missions`, dto);
    missionSuccess.textContent = 'Mission publiée !';
    missionSuccess.hidden = false;
    missionForm.reset();
    loadMissions();
  } catch (error) {
    missionError.textContent = error.message;
    missionError.hidden = false;
  }
});

async function loadMissions() {
  const missions = await apiCall('GET', `/businesses/${businessId}/missions`);
  businessMissionsEl.innerHTML = '';
  businessMissionsEmpty.hidden = missions.length > 0;

  missions.forEach((mission) => {
    const card = document.createElement('article');
    card.className = 'mission-card';
    const date = new Date(mission.createdAt).toLocaleDateString('fr-FR');
    card.innerHTML = `
      <div class="mission-card-header">
        <h3>${mission.titre}</h3>
        <span class="reward">+${mission.recompenseBase} crédit${mission.recompenseBase > 1 ? 's' : ''}</span>
      </div>
      <p>${mission.description}</p>
      <p class="hint">Publiée le ${date}</p>
    `;
    businessMissionsEl.appendChild(card);
  });
}

if (businessId) {
  showDashboard(true);
  loadMissions();
} else {
  showDashboard(false);
}
