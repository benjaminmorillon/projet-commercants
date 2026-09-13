const stepAccount = document.getElementById('step-account');
const dashboard = document.getElementById('dashboard');
const accountForm = document.getElementById('account-form');
const accountError = document.getElementById('account-error');

let businessId = localStorage.getItem('businessId');

/* ---------- Helpers ---------- */

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

// Redimensionne l'image choisie avant de l'envoyer : elle est stockée en
// data URL dans la base, autant qu'elle reste légère.
function fileToResizedDataUrl(file, maxSize = 800) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Impossible de lire l'image."));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error("Fichier image invalide."));
      img.onload = () => {
        const ratio = Math.min(1, maxSize / Math.max(img.width, img.height));
        const canvas = document.createElement('canvas');
        canvas.width = Math.round(img.width * ratio);
        canvas.height = Math.round(img.height * ratio);
        canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL('image/jpeg', 0.7));
      };
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
  });
}

function wireImagePicker(inputId, previewId, onChange) {
  const input = document.getElementById(inputId);
  const preview = document.getElementById(previewId);
  input.addEventListener('change', async () => {
    const file = input.files?.[0];
    if (!file) {
      preview.hidden = true;
      onChange(null);
      return;
    }
    const dataUrl = await fileToResizedDataUrl(file);
    preview.src = dataUrl;
    preview.hidden = false;
    onChange(dataUrl);
  });
}

/* ---------- Compte ---------- */

accountForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  accountError.hidden = true;

  const capacite = document.getElementById('capaciteEstimee').value;

  try {
    const coords = await getCurrentPosition();
    const business = await apiCall('POST', '/businesses', {
      nom: document.getElementById('nom').value.trim(),
      email: document.getElementById('email').value.trim(),
      adresse: document.getElementById('adresse').value.trim(),
      latitude: coords.latitude,
      longitude: coords.longitude,
      typeEtablissement: document.getElementById('typeEtablissement').value,
      ...(capacite ? { capaciteEstimee: Number(capacite) } : {}),
    });
    businessId = business.id;
    localStorage.setItem('businessId', businessId);
    showDashboard();
  } catch (error) {
    accountError.textContent = error.message;
    accountError.hidden = false;
  }
});

/* ---------- Onglets ---------- */

document.querySelectorAll('.tab-btn').forEach((btn) => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.tab-btn').forEach((b) => b.classList.toggle('active', b === btn));
    document.querySelectorAll('.tab-panel').forEach((panel) => {
      panel.hidden = panel.dataset.panel !== btn.dataset.tab;
    });
    if (btn.dataset.tab === 'concurrence') {
      loadConcurrence();
    }
  });
});

/* ---------- Événements ---------- */

let eventImageDataUrl = null;
wireImagePicker('event-image', 'event-image-preview', (value) => {
  eventImageDataUrl = value;
});

const eventForm = document.getElementById('event-form');
const eventError = document.getElementById('event-error');
const eventSuccess = document.getElementById('event-success');

eventForm.addEventListener('submit', async (submitEvent) => {
  submitEvent.preventDefault();
  eventError.hidden = true;
  eventSuccess.hidden = true;

  try {
    await apiCall('POST', `/businesses/${businessId}/events`, {
      titre: document.getElementById('event-titre').value.trim(),
      description: document.getElementById('event-description').value.trim(),
      dateDebut: new Date(document.getElementById('event-date').value).toISOString(),
      ...(eventImageDataUrl ? { imageDataUrl: eventImageDataUrl } : {}),
    });
    eventSuccess.textContent = 'Événement publié !';
    eventSuccess.hidden = false;
    eventForm.reset();
    eventImageDataUrl = null;
    document.getElementById('event-image-preview').hidden = true;
    loadEvents();
  } catch (error) {
    eventError.textContent = error.message;
    eventError.hidden = false;
  }
});

async function loadEvents() {
  const events = await apiCall('GET', `/businesses/${businessId}/events`);
  const list = document.getElementById('events-list');
  document.getElementById('events-empty').hidden = events.length > 0;

  list.innerHTML = events
    .map(
      (ev) => `
        <article class="mission-card">
          <div class="mission-card-header">
            <h3>${escapeHtml(ev.titre)}</h3>
            <span class="reward">${new Date(ev.dateDebut).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</span>
          </div>
          ${ev.imageDataUrl ? `<img class="image-preview" src="${ev.imageDataUrl}" alt="" />` : ''}
          <p>${escapeHtml(ev.description)}</p>
        </article>
      `,
    )
    .join('');

  // Alimente le sélecteur d'événement du ciblage.
  const select = document.getElementById('campaign-event');
  select.innerHTML = events
    .map((ev) => `<option value="${ev.id}">${escapeHtml(ev.titre)}</option>`)
    .join('');
}

/* ---------- Missions ---------- */

const missionForm = document.getElementById('mission-form');
const missionError = document.getElementById('mission-error');
const missionSuccess = document.getElementById('mission-success');

missionForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  missionError.hidden = true;
  missionSuccess.hidden = true;

  try {
    await apiCall('POST', `/businesses/${businessId}/missions`, {
      titre: document.getElementById('titre').value.trim(),
      description: document.getElementById('description').value.trim(),
      archetypeDominant: document.getElementById('archetypeDominant').value,
      duree: document.getElementById('duree').value,
      theme: document.getElementById('theme').value,
      modeInteraction: document.getElementById('modeInteraction').value,
      recompenseBase: Number(document.getElementById('recompenseBase').value),
    });
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
  const list = document.getElementById('business-missions');
  document.getElementById('business-missions-empty').hidden = missions.length > 0;

  list.innerHTML = missions
    .map(
      (mission) => `
        <article class="mission-card">
          <div class="mission-card-header">
            <h3>${escapeHtml(mission.titre)}</h3>
            <span class="reward">+${mission.recompenseBase} crédit${mission.recompenseBase > 1 ? 's' : ''}</span>
          </div>
          <p>${escapeHtml(mission.description)}</p>
          <p class="hint">Publiée le ${new Date(mission.createdAt).toLocaleDateString('fr-FR')}</p>
        </article>
      `,
    )
    .join('');
}

/* ---------- Ciblage ---------- */

let campaignImageDataUrl = null;
wireImagePicker('campaign-image', 'campaign-image-preview', (value) => {
  campaignImageDataUrl = value;
});

const campaignForm = document.getElementById('campaign-form');
const campaignError = document.getElementById('campaign-error');
const campaignSuccess = document.getElementById('campaign-success');
const campaignPreview = document.getElementById('campaign-preview');
const campaignType = document.getElementById('campaign-type');
const campaignEventLabel = document.getElementById('campaign-event-label');

const SLIDERS = [
  ['min-explorateur', 'val-explorateur', 'minExplorateur'],
  ['min-accomplisseur', 'val-accomplisseur', 'minAccomplisseur'],
  ['min-competiteur', 'val-competiteur', 'minCompetiteur'],
  ['min-socialisateur', 'val-socialisateur', 'minSocialisateur'],
];

function readCriteria() {
  const criteria = {
    minMissionsReussies: Number(document.getElementById('min-missions').value || 0),
    montantParCible: Number(document.getElementById('montant-par-cible').value || 0),
  };
  SLIDERS.forEach(([inputId, , field]) => {
    criteria[field] = Number(document.getElementById(inputId).value);
  });
  return criteria;
}

let previewTimer = null;
function schedulePreview() {
  clearTimeout(previewTimer);
  previewTimer = setTimeout(refreshPreview, 300);
}

async function refreshPreview() {
  const criteria = readCriteria();
  try {
    const result = await apiCall('POST', `/businesses/${businessId}/campaigns/preview`, criteria);
    const exemples = result.apercu.map((a) => escapeHtml(a.pseudo)).join(', ');
    const remise = Math.round((1 - 1 / result.multiplicateur) * 100);
    const ligneTarif =
      remise > 0
        ? `<span class="hint">Tarif réduit de ${remise}% : ton lieu est bien noté mais encore peu fréquenté.</span>`
        : remise < 0
          ? `<span class="hint">Tarif majoré de ${-remise}% : ton lieu est déjà très fréquenté au regard de sa note.</span>`
          : '';

    campaignPreview.innerHTML = result.nombreCibles
      ? `<strong>${result.nombreCibles} joueur${result.nombreCibles > 1 ? 's' : ''} ciblé${result.nombreCibles > 1 ? 's' : ''}</strong>
         · ${result.coutTotal.toFixed(2)} € au total (${result.coutParCible.toFixed(2)} € par personne)
         · ${result.creditParJoueur.toFixed(2)} € versés à chacun dès l'envoi
         ${ligneTarif}
         ${exemples ? `<span class="hint">Ex : ${exemples}</span>` : ''}`
      : `<strong>Aucun joueur ne correspond</strong> <span class="hint">Baisse les curseurs pour élargir ta cible.</span>`;
  } catch (error) {
    campaignPreview.textContent = error.message;
  }
}

SLIDERS.forEach(([inputId, valueId]) => {
  const input = document.getElementById(inputId);
  input.addEventListener('input', () => {
    document.getElementById(valueId).textContent = `${input.value}%`;
    schedulePreview();
  });
});
document.getElementById('min-missions').addEventListener('input', schedulePreview);
document.getElementById('montant-par-cible').addEventListener('input', schedulePreview);

campaignType.addEventListener('change', () => {
  campaignEventLabel.hidden = campaignType.value !== 'invitation';
});

campaignForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  campaignError.hidden = true;
  campaignSuccess.hidden = true;

  const type = campaignType.value;
  const eventId = document.getElementById('campaign-event').value;

  if (type === 'invitation' && !eventId) {
    campaignError.textContent = "Crée d'abord un événement dans l'onglet « Mon activité ».";
    campaignError.hidden = false;
    return;
  }

  try {
    const campaign = await apiCall('POST', `/businesses/${businessId}/campaigns`, {
      ...readCriteria(),
      type,
      ...(type === 'invitation' ? { eventId } : {}),
      message: document.getElementById('campaign-message').value.trim(),
      ...(campaignImageDataUrl ? { imageDataUrl: campaignImageDataUrl } : {}),
    });
    campaignSuccess.textContent = `Campagne envoyée à ${campaign.nombreCibles} joueur${campaign.nombreCibles > 1 ? 's' : ''} pour ${campaign.coutTotal.toFixed(2)} €.`;
    campaignSuccess.hidden = false;
    document.getElementById('campaign-message').value = '';
    campaignImageDataUrl = null;
    document.getElementById('campaign-image-preview').hidden = true;
    loadCampaigns();
  } catch (error) {
    campaignError.textContent = error.message;
    campaignError.hidden = false;
  }
});

const STATUT_LABELS = { acceptee: '✓ Accepté', refusee: '✗ Refusé' };

async function loadCampaigns() {
  const campaigns = await apiCall('GET', `/businesses/${businessId}/campaigns`);
  const list = document.getElementById('campaigns-list');
  document.getElementById('campaigns-empty').hidden = campaigns.length > 0;

  list.innerHTML = campaigns
    .map((campaign) => {
      const retours = campaign.retours.length
        ? campaign.retours
            .map(
              (r) => `
                <div class="retour-row">
                  <span class="${r.statut === 'acceptee' ? 'positive' : 'negative'}">${STATUT_LABELS[r.statut] || r.statut}</span>
                  <span><strong>${escapeHtml(r.pseudo)}</strong>${r.reaction ? ` — « ${escapeHtml(r.reaction)} »` : ''}${r.commentaire ? `<br><span class="hint">${escapeHtml(r.commentaire)}</span>` : ''}</span>
                </div>
              `,
            )
            .join('')
        : '<p class="hint">Aucune réponse pour l\'instant.</p>';

      return `
        <article class="mission-card">
          <div class="mission-card-header">
            <h3>${campaign.type === 'invitation' ? escapeHtml(campaign.eventTitre || 'Invitation') : 'Publicité'}</h3>
            <span class="reward">${campaign.coutTotal.toFixed(2)} €</span>
          </div>
          <p>${escapeHtml(campaign.message)}</p>
          <div class="badges">
            <span class="badge">${campaign.nombreCibles} ciblé${campaign.nombreCibles > 1 ? 's' : ''}</span>
            <span class="badge">${campaign.acceptees} accepté${campaign.acceptees > 1 ? 's' : ''}</span>
            <span class="badge">${campaign.refusees} refusé${campaign.refusees > 1 ? 's' : ''}</span>
            <span class="badge">${campaign.enAttente} en attente</span>
          </div>
          <h4>Ce qu'en pensent tes cibles</h4>
          ${retours}
        </article>
      `;
    })
    .join('');
}

/* ---------- Concurrence ---------- */

let concurrenceMap = null;
let concurrenceLayer = null;

function readConcurrenceFilters() {
  return {
    type: document.getElementById('filter-type').value,
    note: Number(document.getElementById('filter-note').value || 0),
    missions: Number(document.getElementById('filter-missions').value || 0),
  };
}

async function loadConcurrence() {
  const all = await apiCall('GET', '/businesses');
  const filters = readConcurrenceFilters();

  const places = all.filter(
    (place) =>
      (!filters.type || place.typeEtablissement === filters.type) &&
      (!filters.note || (place.noteMoyenne ?? 0) >= filters.note) &&
      place.nombreMissions >= filters.missions,
  );

  renderConcurrenceMap(places);
  renderConcurrenceList(places);
}

function renderConcurrenceMap(places) {
  const mapEl = document.getElementById('concurrence-map');
  document.getElementById('concurrence-map-empty').hidden = places.length > 0;
  mapEl.hidden = places.length === 0;
  if (places.length === 0) {
    return;
  }

  if (!concurrenceMap) {
    concurrenceMap = L.map(mapEl);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      maxZoom: 19,
    }).addTo(concurrenceMap);
  }
  if (concurrenceLayer) {
    concurrenceLayer.remove();
  }

  const markers = places.map((place) => {
    const estMoi = place.id === businessId;
    const marker = L.circleMarker([place.latitude, place.longitude], {
      radius: 9,
      // Mon établissement se repère à sa couleur ; la concurrence reste grise.
      color: estMoi ? '#1f5f50' : '#9ca0a7',
      fillColor: estMoi ? '#1f5f50' : '#c3c6ca',
      fillOpacity: 0.85,
      weight: 2,
    });
    marker.bindPopup(`
      <strong>${escapeHtml(place.nom)}${estMoi ? ' (toi)' : ''}</strong><br>
      ${escapeHtml(place.typeEtablissement)}<br>
      ${place.nombreAvis ? `★ ${place.noteMoyenne}/5 (${place.nombreAvis} avis)` : 'Pas encore d\'avis'}<br>
      ${place.nombreMissions} mission${place.nombreMissions > 1 ? 's' : ''} · ${place.nombreCheckins} visite${place.nombreCheckins > 1 ? 's' : ''}
    `);
    return marker;
  });

  concurrenceLayer = L.featureGroup(markers).addTo(concurrenceMap);
  concurrenceMap.fitBounds(concurrenceLayer.getBounds().pad(0.25));
  setTimeout(() => concurrenceMap.invalidateSize(), 50);
}

function renderConcurrenceList(places) {
  document.getElementById('concurrence-count').textContent = `Établissements (${places.length})`;
  document.getElementById('concurrence-list').innerHTML = places
    .map(
      (place) => `
        <article class="mission-card${place.id === businessId ? ' mine' : ''}">
          <div class="mission-card-header">
            <h3>${escapeHtml(place.nom)}${place.id === businessId ? ' <span class="badge">toi</span>' : ''}</h3>
            <span class="reward">${place.nombreAvis ? `★ ${place.noteMoyenne}/5` : '—'}</span>
          </div>
          <p class="hint">${escapeHtml(place.typeEtablissement)} — ${escapeHtml(place.adresse)}</p>
          <div class="badges">
            <span class="badge">${place.nombreMissions} mission${place.nombreMissions > 1 ? 's' : ''}</span>
            <span class="badge">${place.nombreCheckins} visite${place.nombreCheckins > 1 ? 's' : ''}</span>
            <span class="badge">${place.nombreAvis} avis</span>
          </div>
        </article>
      `,
    )
    .join('');
}

document.getElementById('concurrence-filters').addEventListener('change', loadConcurrence);

/* ---------- Démarrage ---------- */

function showDashboard() {
  stepAccount.hidden = true;
  dashboard.hidden = false;
  loadEvents();
  loadMissions();
  loadCampaigns();
  refreshPreview();
}

if (businessId) {
  showDashboard();
}
