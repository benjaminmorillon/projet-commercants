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

let modeAuth = 'inscription';

function appliquerModeAuth() {
  const inscription = modeAuth === 'inscription';
  document.querySelectorAll('.champ-etablissement').forEach((champ) => {
    champ.hidden = !inscription;
    champ.querySelectorAll('input, select').forEach((entree) => {
      // Un champ masqué ne doit pas bloquer l'envoi du formulaire.
      entree.required = inscription && entree.id !== 'capaciteEstimee';
    });
  });
  document.getElementById('account-submit').textContent = inscription
    ? 'Créer mon espace'
    : 'Se connecter';
  accountError.hidden = true;
}

document.getElementById('auth-tabs').addEventListener('click', (event) => {
  const btn = event.target.closest('.tab-btn');
  if (!btn) return;
  document.querySelectorAll('#auth-tabs .tab-btn').forEach((b) => b.classList.remove('active'));
  btn.classList.add('active');
  modeAuth = btn.dataset.mode;
  appliquerModeAuth();
});

accountForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  accountError.hidden = true;

  const email = document.getElementById('email').value.trim();
  const motDePasse = document.getElementById('mot-de-passe').value;

  try {
    if (modeAuth === 'connexion') {
      const utilisateur = await apiCall('POST', '/auth/connexion', { email, motDePasse });
      if (utilisateur.type !== 'commercant') {
        throw new Error("Ce compte est un compte joueur : connecte-toi depuis l'onglet Profil.");
      }
      await retrouverMonEtablissement();
      return;
    }

    // Deux étapes enchaînées : le compte commerçant, puis son établissement.
    // La position du navigateur sert de coordonnées du lieu.
    const nom = document.getElementById('nom').value.trim();
    await apiCall('POST', '/auth/inscription', {
      email,
      motDePasse,
      pseudo: nom,
      type: 'commercant',
    });

    const capacite = document.getElementById('capaciteEstimee').value;
    const coords = await getCurrentPosition();
    const business = await apiCall('POST', '/businesses', {
      nom,
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

// Après une connexion, on retrouve l'établissement rattaché au compte.
async function retrouverMonEtablissement() {
  // Le serveur sait lequel est le mien : inutile de télécharger tous les
  // lieux du quartier pour en chercher un.
  const mien = await apiCall('GET', '/businesses/mien');
  businessId = mien.id;
  localStorage.setItem('businessId', businessId);
  showDashboard();
}

/* ---------- La photo de l'établissement ---------- */

let photoVersionLieu = null;

function afficherAvatarEtablissement(nom) {
  const url = urlPhoto('commerce', businessId, photoVersionLieu);
  document.getElementById('avatar-etablissement').innerHTML =
    pastilleAvatar(nom || 'Mon établissement', url, 'grand');
  document.getElementById('btn-photo-lieu').textContent = url
    ? 'Changer la photo'
    : 'Ajouter une photo';
  document.getElementById('btn-retirer-photo-lieu').hidden = !url;
}

function direPhotoLieu(texte, erreur = false) {
  const zone = document.getElementById('photo-lieu-aide');
  zone.textContent = texte;
  zone.className = erreur ? 'error' : 'hint';
}

async function chargerPhotoEtablissement() {
  const fiche = await apiCall('GET', `/businesses/${businessId}`).catch(() => null);
  photoVersionLieu = fiche?.photoVersion ?? null;
  afficherAvatarEtablissement(fiche?.nom);
}

document.getElementById('btn-photo-lieu').addEventListener('click', () => {
  document.getElementById('fichier-photo-lieu').click();
});

document.getElementById('fichier-photo-lieu').addEventListener('change', async (evenement) => {
  const fichier = evenement.target.files?.[0];
  evenement.target.value = '';
  if (!fichier) return;

  direPhotoLieu('Préparation de la photo…');

  try {
    // Un peu plus grande que pour un joueur : une devanture s'affiche aussi
    // en bandeau sur la fiche partenaire, pas seulement en pastille.
    const image = await reduireImage(fichier, 720);
    const { version } = await apiCall('PUT', `/photos/commerce/${businessId}`, { image });
    photoVersionLieu = version;
    await chargerPhotoEtablissement();
    direPhotoLieu('Photo enregistrée.');
  } catch (erreur) {
    direPhotoLieu(erreur.message, true);
  }
});

document.getElementById('btn-retirer-photo-lieu').addEventListener('click', async () => {
  if (!window.confirm("Retirer la photo de l'établissement ?")) return;

  try {
    await apiCall('DELETE', `/photos/commerce/${businessId}`);
    photoVersionLieu = null;
    await chargerPhotoEtablissement();
    direPhotoLieu('Photo retirée.');
  } catch (erreur) {
    direPhotoLieu(erreur.message, true);
  }
});

/* ---------- Compte de jetons ---------- */

async function loadJetons() {
  const donnees = await apiCall('GET', `/businesses/${businessId}/jetons`).catch(() => null);
  if (!donnees) return;

  document.getElementById('jetons-solde').innerHTML =
    `${donnees.solde}<span class="wallet-unite">jeton${donnees.solde > 1 ? 's' : ''}</span>`;

  const prestataire = document.getElementById('jetons-prestataire');
  if (donnees.prestataire?.simule) {
    prestataire.hidden = false;
    prestataire.textContent =
      "Paiement en mode démonstration : aucune somme réelle n'est prélevée, les jetons sont simplement crédités.";
  }

  const liste = document.getElementById('jetons-mouvements');
  document.getElementById('jetons-mouvements-vide').hidden = donnees.mouvements.length > 0;
  liste.innerHTML = donnees.mouvements
    .map((m) => {
      const date = new Date(m.createdAt).toLocaleDateString('fr-FR');
      return `
        <div class="transaction-row">
          <span>${escapeHtml(m.libelle)}${m.detail ? ` — ${escapeHtml(m.detail)}` : ''} <span class="hint">(${date})</span></span>
          <span class="${m.sens === 'entree' ? 'positive' : 'negative'}">${m.sens === 'entree' ? '+' : '−'}${m.montant}</span>
        </div>
      `;
    })
    .join('');
}

document.getElementById('recharge-valider')?.addEventListener('click', async () => {
  const bouton = document.getElementById('recharge-valider');
  const message = document.getElementById('recharge-message');
  const champ = document.getElementById('recharge-montant');
  message.hidden = true;
  message.className = 'error';

  const montant = Number(champ.value);
  if (!montant || montant < 1) {
    message.textContent = 'Indique un montant d’au moins 1 jeton.';
    message.hidden = false;
    return;
  }

  bouton.disabled = true;
  try {
    await apiCall('POST', `/businesses/${businessId}/jetons/recharger`, { montant });
    champ.value = '';
    message.className = 'success';
    message.textContent = `${montant} jetons crédités sur ton compte.`;
    message.hidden = false;
    await loadJetons();
    refreshPreview();
  } catch (erreur) {
    message.textContent = erreur.message;
    message.hidden = false;
  } finally {
    bouton.disabled = false;
  }
});

/* ---------- Onglets ---------- */

document.querySelectorAll('#dashboard-tabs .tab-btn').forEach((btn) => {
  btn.addEventListener('click', () => {
    document
      .querySelectorAll('#dashboard-tabs .tab-btn')
      .forEach((b) => b.classList.toggle('active', b === btn));
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
            <span class="reward">+${mission.recompenseBase} jeton${mission.recompenseBase > 1 ? 's' : ''}</span>
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

    // Le commerçant doit voir avant de cliquer si son compte suffit.
    const alerteSolde = result.soldeSuffisant
      ? ''
      : `<span class="error">Solde insuffisant : il te reste ${result.soldeJetons} jeton${result.soldeJetons > 1 ? 's' : ''}. Recharge ton compte depuis « Mon activité ».</span>`;

    campaignPreview.innerHTML = result.nombreCibles
      ? `<strong>${result.nombreCibles} joueur${result.nombreCibles > 1 ? 's' : ''} ciblé${result.nombreCibles > 1 ? 's' : ''}</strong>
         · ${result.coutTotal.toFixed(2)} jetons au total (${result.coutParCible.toFixed(2)} par personne)
         · ${result.creditParJoueur.toFixed(2)} versés à chacun dès l'envoi
         ${ligneTarif}
         ${alerteSolde}
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
    campaignSuccess.textContent = `Campagne envoyée à ${campaign.nombreCibles} joueur${campaign.nombreCibles > 1 ? 's' : ''} pour ${campaign.coutTotal.toFixed(2)} jetons.`;
    campaignSuccess.hidden = false;
    document.getElementById('campaign-message').value = '';
    campaignImageDataUrl = null;
    document.getElementById('campaign-image-preview').hidden = true;
    loadCampaigns();
    // Les jetons viennent de sortir du compte : le solde affiché doit suivre.
    loadJetons();
    refreshPreview();
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
            <span class="reward">${campaign.coutTotal.toFixed(2)} jetons</span>
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

/* ---------- Pièces jointes ---------- */

// Le fichier part tel quel, sans réduction : un PDF ne se redimensionne pas,
// et une image jointe est faite pour être lue en grand (une carte, une
// affiche). C'est le serveur qui plafonne, et qui le dit en français.
function fichierEnDataUrl(fichier) {
  return new Promise((resoudre, rejeter) => {
    const lecteur = new FileReader();
    lecteur.onerror = () => rejeter(new Error('Impossible de lire ce fichier.'));
    lecteur.onload = () => resoudre(lecteur.result);
    lecteur.readAsDataURL(fichier);
  });
}

async function loadPieces() {
  if (!businessId) return;
  const pieces = await apiCall('GET', `/businesses/${businessId}/pieces-jointes`);

  const liste = document.getElementById('pieces-liste');
  document.getElementById('pieces-titre').textContent = `Mes pièces jointes (${pieces.length})`;
  document.getElementById('pieces-vide').hidden = pieces.length > 0;
  liste.innerHTML = '';

  pieces.forEach((piece) => {
    const ligne = document.createElement('div');
    ligne.className = 'piece';
    ligne.innerHTML = `
      <span class="piece-icone" aria-hidden="true">${piece.affichable ? '▣' : '▤'}</span>
      <div class="piece-texte">
        <a class="piece-nom" href="/pieces-jointes/${encodeURIComponent(piece.id)}" target="_blank" rel="noopener">
          ${escapeHtml(piece.nom)}
        </a>
        <span class="piece-poids">${escapeHtml(piece.poids)}</span>
      </div>
      <button type="button" class="lien-discret piece-retirer">Retirer</button>
    `;

    ligne.querySelector('.piece-retirer').addEventListener('click', async (clic) => {
      if (!window.confirm(`Retirer « ${piece.nom} » ?`)) return;
      clic.target.disabled = true;
      await apiCall('DELETE', `/businesses/${businessId}/pieces-jointes/${piece.id}`);
      await loadPieces();
    });

    liste.appendChild(ligne);
  });
}

document.getElementById('btn-piece').addEventListener('click', () => {
  document.getElementById('fichier-piece').click();
});

document.getElementById('fichier-piece').addEventListener('change', async (evenement) => {
  const fichier = evenement.target.files?.[0];
  const erreur = document.getElementById('piece-erreur');
  erreur.hidden = true;
  if (!fichier) return;

  try {
    await apiCall('POST', `/businesses/${businessId}/pieces-jointes`, {
      fichier: await fichierEnDataUrl(fichier),
      nom: fichier.name,
    });
    await loadPieces();
  } catch (e) {
    erreur.textContent = e.message;
    erreur.hidden = false;
  } finally {
    // Sans ça, rechoisir le MÊME fichier après une erreur ne déclenche rien :
    // la valeur du champ n'a pas changé.
    evenement.target.value = '';
  }
});

/* ---------- Clients : le scan du code de présence ---------- */

const scanVideo = document.getElementById('scan-video');
const scanEtat = document.getElementById('scan-etat');
const scanErreur = document.getElementById('scan-erreur');
const scanResultat = document.getElementById('scan-resultat');
const btnDemarrer = document.getElementById('scan-demarrer');
const btnArreter = document.getElementById('scan-arreter');

let fluxCamera = null;
let boucleScan = null;

/**
 * Le lecteur de codes du navigateur.
 *
 * `BarcodeDetector` est intégré à Chrome et à Android ; Safari et Firefox ne
 * l'ont pas. Plutôt que d'embarquer une bibliothèque de décodage de plusieurs
 * centaines de kilooctets pour ces cas-là, on laisse la saisie manuelle
 * prendre le relais : le code est fait pour ça — huit caractères sans I, L,
 * O, 0 ni 1, justement pour être tapés sans se tromper.
 */
function lecteurDisponible() {
  return typeof window.BarcodeDetector === 'function';
}

async function demarrerCamera() {
  scanErreur.hidden = true;

  if (!lecteurDisponible()) {
    scanEtat.textContent =
      "Ce navigateur ne sait pas lire un QR code. Demande au client les huit caractères affichés sous son code et tape-les ci-dessous.";
    return;
  }

  try {
    fluxCamera = await navigator.mediaDevices.getUserMedia({
      // La caméra arrière : sur un téléphone posé sur le comptoir, c'est
      // elle qui regarde l'écran du client.
      video: { facingMode: 'environment' },
    });
  } catch (erreur) {
    scanEtat.textContent =
      "La caméra n'est pas accessible (refusée, ou déjà utilisée). Tu peux taper le code à la main.";
    return;
  }

  scanVideo.srcObject = fluxCamera;
  scanVideo.hidden = false;
  await scanVideo.play();

  btnDemarrer.hidden = true;
  btnArreter.hidden = false;
  scanEtat.textContent = 'Vise le code affiché sur le téléphone du client.';

  const lecteur = new window.BarcodeDetector({ formats: ['qr_code'] });
  boucleScan = setInterval(async () => {
    try {
      const trouves = await lecteur.detect(scanVideo);
      if (trouves.length > 0) {
        arreterCamera();
        await envoyerCode(trouves[0].rawValue);
      }
    } catch {
      // Une image illisible entre deux : rien à signaler, on réessaie.
    }
  }, 400);
}

function arreterCamera() {
  if (boucleScan) clearInterval(boucleScan);
  boucleScan = null;
  if (fluxCamera) fluxCamera.getTracks().forEach((piste) => piste.stop());
  fluxCamera = null;
  scanVideo.hidden = true;
  btnDemarrer.hidden = false;
  btnArreter.hidden = true;
  scanEtat.textContent = '';
}

btnDemarrer.addEventListener('click', demarrerCamera);
btnArreter.addEventListener('click', arreterCamera);
// Quitter la page sans éteindre la caméra laisserait la diode allumée.
window.addEventListener('pagehide', arreterCamera);

document.getElementById('scan-form').addEventListener('submit', async (submitEvent) => {
  submitEvent.preventDefault();
  const champ = document.getElementById('scan-code');
  await envoyerCode(champ.value);
  champ.value = '';
});

async function envoyerCode(code) {
  scanErreur.hidden = true;
  scanResultat.hidden = true;

  try {
    const resultat = await apiCall('POST', `/businesses/${businessId}/presence`, { code });

    const url = urlPhoto('joueur', resultat.joueur.id, resultat.joueur.photoVersion);
    scanResultat.className = 'scan-resultat';
    scanResultat.innerHTML = `
      ${pastilleAvatar(resultat.joueur.pseudo, url)}
      <div>
        <strong>${escapeHtml(resultat.joueur.pseudo)}</strong>
        <p class="hint">${
          resultat.premiereVisite
            ? 'Première venue chez toi. Son quartier vient de se lever sur sa carte.'
            : `${resultat.visites}<sup>e</sup> venue chez toi.`
        }</p>
      </div>
    `;
    scanResultat.hidden = false;

    await loadClients();
  } catch (erreur) {
    scanErreur.textContent = erreur.message;
    scanErreur.hidden = false;
  }
}

function dateCourte(valeur) {
  if (!valeur) return '';
  return new Date(valeur).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' });
}

async function loadClients() {
  if (!businessId) return;
  const clients = await apiCall('GET', `/businesses/${businessId}/clients`);

  const liste = document.getElementById('clients-list');
  document.getElementById('clients-count').textContent = `Mes clients (${clients.length})`;
  document.getElementById('clients-empty').hidden = clients.length > 0;
  liste.innerHTML = '';

  clients.forEach((client) => {
    const ligne = document.createElement('div');
    ligne.className = 'client';
    const url = urlPhoto('joueur', client.playerId, client.photoVersion);
    ligne.innerHTML = `
      ${pastilleAvatar(client.pseudo, url)}
      <div>
        <div class="client-nom">${escapeHtml(client.pseudo)}</div>
        <div class="client-detail">Depuis le ${dateCourte(client.premiereVisite)} · dernière venue le ${dateCourte(client.derniereVisite)}</div>
      </div>
      <span class="client-visites">${client.visites} venue${client.visites > 1 ? 's' : ''}</span>
    `;
    liste.appendChild(ligne);
  });
}

/* ---------- Offres ---------- */

// L'image choisie, réduite, en attente de la création de l'offre. Elle ne
// peut être envoyée qu'APRÈS : elle se range sous l'identifiant de l'offre,
// qui n'existe pas encore au moment où le commerçant la choisit.
let offreImageDataUrl = null;
wireImagePicker('offre-image', 'offre-image-preview', (value) => {
  offreImageDataUrl = value;
});

const offreForm = document.getElementById('offre-form');
const offreError = document.getElementById('offre-error');
const offreEstimation = document.getElementById('offre-estimation');

// Dire tout de suite combien de lectures le budget paie. Un commerçant qui
// saisit « 30 » sans savoir ce que ça achète n'a aucun moyen de juger.
function rafraichirEstimation() {
  const budget = Number(document.getElementById('offre-budget').value);
  const cout = Number(document.getElementById('offre-cout').value) || 0.3;
  if (!budget || !cout) {
    offreEstimation.textContent =
      "Le coût par ouverture est ce que tu paies chaque fois qu'un joueur lit ton offre. Laisse vide pour le tarif par défaut.";
    return;
  }
  const lectures = Math.floor(budget / cout);
  offreEstimation.textContent = `Avec ce budget, ton offre sera lue environ ${lectures} fois avant de s'arrêter.`;
}

['offre-budget', 'offre-cout'].forEach((id) => {
  document.getElementById(id).addEventListener('input', rafraichirEstimation);
});
rafraichirEstimation();

offreForm.addEventListener('submit', async (submitEvent) => {
  submitEvent.preventDefault();
  offreError.hidden = true;

  const pourcent = Number(document.getElementById('offre-pourcent').value);
  const jetonsReduc = Number(document.getElementById('offre-jetons').value);
  const cout = Number(document.getElementById('offre-cout').value);

  try {
    const offre = await apiCall('POST', `/businesses/${businessId}/offres`, {
      titre: document.getElementById('offre-titre').value.trim(),
      offre: document.getElementById('offre-offre').value.trim(),
      description: document.getElementById('offre-description').value.trim(),
      motsCles: document.getElementById('offre-motscles').value.trim(),
      ...(pourcent ? { reductionPourcent: pourcent } : {}),
      ...(jetonsReduc ? { reductionJetons: jetonsReduc } : {}),
      debutLe: document.getElementById('offre-debut').value,
      finLe: document.getElementById('offre-fin').value,
      budgetJetons: Number(document.getElementById('offre-budget').value),
      ...(cout ? { coutParOuverture: cout } : {}),
    });

    if (offreImageDataUrl) {
      await apiCall('PUT', `/businesses/${businessId}/offres/${offre.id}/image`, {
        image: offreImageDataUrl,
      });
    }

    offreForm.reset();
    offreImageDataUrl = null;
    document.getElementById('offre-image-preview').hidden = true;
    rafraichirEstimation();
    await loadOffres();
    await loadBons();
  } catch (erreur) {
    offreError.textContent = erreur.message;
    offreError.hidden = false;
  }
});

async function loadOffres() {
  if (!businessId) return;
  const offres = await apiCall('GET', `/businesses/${businessId}/offres`);

  const liste = document.getElementById('offres-list');
  document.getElementById('offres-count').textContent = `Mes offres (${offres.length})`;
  document.getElementById('offres-empty').hidden = offres.length > 0;
  liste.innerHTML = '';

  offres.forEach((offre) => {
    const carte = document.createElement('article');
    carte.className = 'mission-card';

    const image = urlPhoto('publicite', offre.id, offre.photoVersion);

    carte.innerHTML = `
      <div class="mission-card-header">
        <h4>${escapeHtml(offre.titre)}</h4>
        <span class="badge${offre.enCours ? ' bonus' : ''}">${offre.enCours ? 'En cours' : offre.active ? 'Hors période ou budget épuisé' : 'Suspendue'}</span>
      </div>
      ${image ? `<img class="image-preview" src="${escapeHtml(image)}" alt="" />` : ''}
      <p>${escapeHtml(offre.offre)}</p>
      <div class="badges">
        <span class="badge">${dateCourte(offre.debutLe)} → ${dateCourte(offre.finLe)}</span>
        <span class="badge">${offre.nombreOuvertures} lecture${offre.nombreOuvertures > 1 ? 's' : ''}</span>
        <span class="badge">${offre.nombrePayees} payée${offre.nombrePayees > 1 ? 's' : ''}</span>
        <span class="badge">${offre.nombreBonsUtilises} bon${offre.nombreBonsUtilises > 1 ? 's' : ''} encaissé${offre.nombreBonsUtilises > 1 ? 's' : ''}</span>
        <span class="badge">Reste ${offre.budgetRestant} / ${offre.budgetJetons} jetons</span>
      </div>
      <div class="mission-actions">
        <button type="button" class="offre-annoncer"${offre.annonce.possible ? '' : ' disabled'}>
          ${escapeHtml(offre.annonce.libelle)}
        </button>
        <button type="button" class="secondary offre-bascule">
          ${offre.active ? 'Suspendre' : 'Réactiver'}
        </button>
      </div>
      <p class="offre-annonce-erreur error" hidden></p>
    `;

    carte.querySelector('.offre-bascule').addEventListener('click', async (clic) => {
      clic.target.disabled = true;
      await apiCall('PUT', `/businesses/${businessId}/offres/${offre.id}`, {
        active: !offre.active,
      });
      await loadOffres();
    });

    const boutonAnnonce = carte.querySelector('.offre-annoncer');
    const erreurAnnonce = carte.querySelector('.offre-annonce-erreur');
    if (offre.annonce.possible) {
      boutonAnnonce.addEventListener('click', async () => {
        // Une notification poussée sur le téléphone de quelqu'un ne se
        // rattrape pas : on demande confirmation avant, pas après.
        if (!window.confirm(`Prévenir tes clients de cette offre ? Tu ne pourras le faire qu'une fois pour celle-ci.`)) {
          return;
        }
        boutonAnnonce.disabled = true;
        erreurAnnonce.hidden = true;
        try {
          const retour = await apiCall('POST', `/businesses/${businessId}/offres/${offre.id}/annoncer`);
          boutonAnnonce.textContent = `${retour.prevenus} client${retour.prevenus > 1 ? 's' : ''} prévenu${retour.prevenus > 1 ? 's' : ''}`;
          await loadOffres();
        } catch (erreur) {
          erreurAnnonce.textContent = erreur.message;
          erreurAnnonce.hidden = false;
          boutonAnnonce.disabled = false;
        }
      });
    }

    liste.appendChild(carte);
  });
}

async function loadBons() {
  if (!businessId) return;
  const bons = await apiCall('GET', `/businesses/${businessId}/bons`);

  // Ceux à encaisser d'abord : c'est la seule chose qu'on cherche ici quand
  // un client est devant le comptoir.
  const ranges = [...bons].sort((a, b) => Number(b.valable) - Number(a.valable));
  const aEncaisser = bons.filter((b) => b.valable).length;

  const liste = document.getElementById('bons-list');
  document.getElementById('bons-count').textContent = `Bons à encaisser (${aEncaisser})`;
  document.getElementById('bons-empty').hidden = bons.length > 0;
  liste.innerHTML = '';

  ranges.forEach((bon) => {
    const ligne = document.createElement('article');
    ligne.className = 'mission-card';

    const etat = bon.utiliseLe
      ? `<span class="badge">Encaissé le ${dateCourte(bon.utiliseLe)}</span>`
      : bon.valable
        ? `<span class="badge valideur">À encaisser</span>`
        : `<span class="badge">Offre terminée</span>`;

    ligne.innerHTML = `
      <div class="mission-card-header">
        <h4>${escapeHtml(bon.joueur)}</h4>
        ${etat}
      </div>
      <p>${escapeHtml(bon.titre)} — ${escapeHtml(bon.offre)}</p>
      <div class="badges">
        ${bon.reduction ? `<span class="badge bonus">${escapeHtml(bon.reduction)}</span>` : ''}
        <span class="badge">Obtenu le ${dateCourte(bon.obtenuLe)}</span>
      </div>
      ${bon.valable ? '<button type="button" class="bon-encaisser">Encaisser ce bon</button>' : ''}
      <p class="bon-erreur error" hidden></p>
    `;

    const bouton = ligne.querySelector('.bon-encaisser');
    if (bouton) {
      const erreur = ligne.querySelector('.bon-erreur');
      bouton.addEventListener('click', async () => {
        bouton.disabled = true;
        erreur.hidden = true;
        try {
          await apiCall('POST', `/businesses/${businessId}/bons/${bon.id}/utiliser`);
          await loadBons();
          await loadOffres();
        } catch (e) {
          erreur.textContent = e.message;
          erreur.hidden = false;
          bouton.disabled = false;
        }
      });
    }

    liste.appendChild(ligne);
  });
}

/* ---------- Démarrage ---------- */

function showDashboard() {
  stepAccount.hidden = true;
  dashboard.hidden = false;
  chargerPhotoEtablissement();
  loadJetons();
  loadEvents();
  loadMissions();
  loadCampaigns();
  loadOffres();
  loadBons();
  loadClients();
  loadPieces();
  refreshPreview();
}

async function initialiser() {
  appliquerModeAuth();

  const utilisateur = await apiCall('GET', '/auth/moi').catch(() => null);
  if (!utilisateur || utilisateur.type !== 'commercant') {
    localStorage.removeItem('businessId');
    businessId = null;
    return;
  }

  await retrouverMonEtablissement().catch(() => {
    // Compte commerçant sans établissement : on laisse le formulaire ouvert.
    localStorage.removeItem('businessId');
    businessId = null;
  });
}

initialiser();
