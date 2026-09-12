// ---------------------------------------------------------------------------
// Carte 3D : on se déplace dans le plan comme dans Google Maps, on repère les
// missions chez les partenaires et on ouvre la fiche d'un partenaire.
// ---------------------------------------------------------------------------

const playerId = localStorage.getItem('playerId');

const ARCHETYPE_LABELS = {
  explorateur: 'Explorateur',
  accomplisseur: 'Accomplisseur',
  competiteur: 'Compétiteur',
  socialisateur: 'Socialisateur',
  mixte: 'Mixte',
};

const DUREE_LABELS = { courte: 'Courte', moyenne: 'Moyenne', longue: 'Longue' };

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

// Petite icône par type d'établissement, pour reconnaître un lieu d'un coup d'œil.
const ICONES_LIEU = [
  [/bar|pub|brasserie/i, '🍺'],
  [/restaurant|resto|pizz|burger/i, '🍽️'],
  [/caf|salon de th/i, '☕'],
  [/h[oô]tel|auberge/i, '🛏️'],
  [/boulang|p[aâ]tiss/i, '🥐'],
  [/libr|livre/i, '📚'],
  [/mus[eé]e|galerie/i, '🖼️'],
  [/sport|salle|gym/i, '🏋️'],
  [/coiff|beaut/i, '💈'],
  [/[eé]picerie|march|primeur/i, '🧺'],
  [/glac|cr[eè]me/i, '🍨'],
  [/cinema|cin[eé]ma|th[eé][aâ]tre/i, '🎭'],
];

// Icône d'une mission selon l'archétype qu'elle met en avant.
const ICONES_ARCHETYPE = {
  explorateur: '🧭',
  accomplisseur: '🏆',
  competiteur: '⚔️',
  socialisateur: '💬',
  mixte: '✨',
};

const TYPE_MATCHING = {
  duo_affinite_naturelle: 'affinite_naturelle',
  duo_defi_complementarite: 'defi_complementarite',
  groupe: 'affinite_naturelle',
};

const RAYON_CHECKIN_M = 150;
const ZOOM_MISSIONS = 15.2;
// Éventail des missions sous l'étiquette du lieu (en pixels à l'écran).
const RAYON_EVENTAIL_PX = 85;
const ANGLE_DEBUT = 25;
const ANGLE_ARC = 130;
const ZOOM_NOMS = 15;

const messageEl = document.getElementById('carte-message');
const ficheEl = document.getElementById('fiche');
const ficheContenuEl = document.getElementById('fiche-contenu');
const ficheFondEl = document.getElementById('fiche-fond');

let lieux = [];
let filtreActif = 'tout';
let marqueursLieux = [];
let marqueursMissions = [];
let marqueurPosition = null;
let lieuOuvert = null;
let batimentsCharges = false;

// ---------------------------------------------------------------------------
// Petits utilitaires
// ---------------------------------------------------------------------------

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

let timerMessage = null;
function afficherMessage(texte, duree = 4000) {
  messageEl.textContent = texte;
  messageEl.hidden = false;
  clearTimeout(timerMessage);
  if (duree) {
    timerMessage = setTimeout(() => {
      messageEl.hidden = true;
    }, duree);
  }
}

function iconeLieu(type) {
  const trouve = ICONES_LIEU.find(([regex]) => regex.test(type || ''));
  return trouve ? trouve[1] : '📍';
}

function bonusPourcent(lieu) {
  return Math.round(((lieu.multiplicateur ?? 1) - 1) * 100);
}

// Déplace un point de `metres` dans la direction `angleDeg` (0 = nord).
function decaler(latitude, longitude, metres, angleDeg) {
  const R = 6378137;
  const angle = (angleDeg * Math.PI) / 180;
  const dLat = ((metres * Math.cos(angle)) / R) * (180 / Math.PI);
  const dLng =
    ((metres * Math.sin(angle)) / (R * Math.cos((latitude * Math.PI) / 180))) * (180 / Math.PI);
  return [longitude + dLng, latitude + dLat];
}

function cerclePolygone(latitude, longitude, metres, points = 56) {
  const anneau = [];
  for (let i = 0; i <= points; i += 1) {
    anneau.push(decaler(latitude, longitude, metres, (i * 360) / points));
  }
  return { type: 'Polygon', coordinates: [anneau] };
}

function carrePolygone(latitude, longitude, cote) {
  const anneau = [45, 135, 225, 315, 45].map((angle) =>
    decaler(latitude, longitude, cote, angle),
  );
  return { type: 'Polygon', coordinates: [anneau] };
}

// ---------------------------------------------------------------------------
// La carte
// ---------------------------------------------------------------------------

// Fond de plan OpenStreetMap : pas de clé d'API à gérer.
const STYLE_PLAN = {
  version: 8,
  sources: {
    osm: {
      type: 'raster',
      tiles: [
        'https://a.tile.openstreetmap.org/{z}/{x}/{y}.png',
        'https://b.tile.openstreetmap.org/{z}/{x}/{y}.png',
        'https://c.tile.openstreetmap.org/{z}/{x}/{y}.png',
      ],
      tileSize: 256,
      maxzoom: 19,
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    },
  },
  layers: [
    { id: 'fond-couleur', type: 'background', paint: { 'background-color': '#e8e5df' } },
    { id: 'osm', type: 'raster', source: 'osm' },
  ],
};

const map = new maplibregl.Map({
  container: 'carte',
  style: STYLE_PLAN,
  center: [2.3522, 48.8566],
  zoom: 12,
  pitch: 55,
  bearing: -18,
  maxPitch: 80,
  attributionControl: { compact: true },
});

map.addControl(new maplibregl.NavigationControl({ visualizePitch: true }), 'bottom-right');
map.addControl(new maplibregl.ScaleControl({ maxWidth: 90, unit: 'metric' }), 'bottom-left');
map.touchZoomRotate.enableRotation();

// ---------------------------------------------------------------------------
// Couches 3D de nos propres données
// ---------------------------------------------------------------------------

function geojsonZones() {
  return {
    type: 'FeatureCollection',
    features: lieux
      .filter(lieuVisible)
      .map((lieu) => ({
        type: 'Feature',
        properties: { id: lieu.id },
        geometry: cerclePolygone(lieu.latitude, lieu.longitude, RAYON_CHECKIN_M),
      })),
  };
}

// Une « balise » verticale par partenaire : plus elle est haute et verte, plus
// le lieu rapporte (multiplicateur de rééquilibrage).
function geojsonBalises() {
  return {
    type: 'FeatureCollection',
    features: lieux.filter(lieuVisible).map((lieu) => {
      const bonus = bonusPourcent(lieu);
      return {
        type: 'Feature',
        properties: {
          id: lieu.id,
          hauteur: 22 + bonus * 1.6,
          couleur: bonus > 0 ? '#10b981' : '#7c3aed',
        },
        geometry: carrePolygone(lieu.latitude, lieu.longitude, 6),
      };
    }),
  };
}

function installerCouches() {
  map.addSource('zones-checkin', { type: 'geojson', data: geojsonZones() });
  map.addLayer({
    id: 'zones-checkin-fond',
    type: 'fill',
    source: 'zones-checkin',
    paint: { 'fill-color': '#7c3aed', 'fill-opacity': 0.08 },
  });
  map.addLayer({
    id: 'zones-checkin-trait',
    type: 'line',
    source: 'zones-checkin',
    paint: { 'line-color': '#7c3aed', 'line-width': 1.2, 'line-opacity': 0.45 },
  });

  map.addSource('batiments', {
    type: 'geojson',
    data: { type: 'FeatureCollection', features: [] },
  });
  map.addLayer({
    id: 'batiments-3d',
    type: 'fill-extrusion',
    source: 'batiments',
    paint: {
      'fill-extrusion-color': '#cfc9c0',
      'fill-extrusion-height': ['get', 'hauteur'],
      'fill-extrusion-base': 0,
      'fill-extrusion-opacity': 0.88,
    },
  });

  map.addSource('balises', { type: 'geojson', data: geojsonBalises() });
  map.addLayer({
    id: 'balises-3d',
    type: 'fill-extrusion',
    source: 'balises',
    paint: {
      'fill-extrusion-color': ['get', 'couleur'],
      'fill-extrusion-height': ['get', 'hauteur'],
      'fill-extrusion-base': 0,
      'fill-extrusion-opacity': 0.72,
    },
  });
}

function rafraichirCouches() {
  if (!map.getSource('zones-checkin')) return;
  map.getSource('zones-checkin').setData(geojsonZones());
  map.getSource('balises').setData(geojsonBalises());
}

// ---------------------------------------------------------------------------
// Bâtiments en 3D (volumes réels, récupérés auprès d'OpenStreetMap)
// ---------------------------------------------------------------------------

function hauteurBatiment(tags) {
  const hauteur = parseFloat(tags.height);
  if (!Number.isNaN(hauteur) && hauteur > 0) return hauteur;
  const niveaux = parseFloat(tags['building:levels']);
  if (!Number.isNaN(niveaux) && niveaux > 0) return niveaux * 3;
  return 9;
}

async function chargerBatiments() {
  if (map.getZoom() < 15) {
    afficherMessage('Rapproche-toi un peu (zoom) pour afficher les bâtiments en 3D.');
    return;
  }

  const bornes = map.getBounds();
  const bbox = [
    bornes.getSouth().toFixed(5),
    bornes.getWest().toFixed(5),
    bornes.getNorth().toFixed(5),
    bornes.getEast().toFixed(5),
  ].join(',');
  const requete = `[out:json][timeout:25];way["building"](${bbox});out geom;`;

  afficherMessage('Chargement des bâtiments...', 0);
  try {
    const reponse = await fetch('https://overpass-api.de/api/interpreter', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: `data=${encodeURIComponent(requete)}`,
    });
    if (!reponse.ok) throw new Error('service indisponible');
    const donnees = await reponse.json();

    const features = (donnees.elements || [])
      .filter((el) => Array.isArray(el.geometry) && el.geometry.length > 3)
      .map((el) => {
        const anneau = el.geometry.map((point) => [point.lon, point.lat]);
        const premier = anneau[0];
        const dernier = anneau[anneau.length - 1];
        if (premier[0] !== dernier[0] || premier[1] !== dernier[1]) {
          anneau.push(premier);
        }
        return {
          type: 'Feature',
          properties: { hauteur: hauteurBatiment(el.tags || {}) },
          geometry: { type: 'Polygon', coordinates: [anneau] },
        };
      });

    map.getSource('batiments').setData({ type: 'FeatureCollection', features });
    batimentsCharges = features.length > 0;
    document.getElementById('btn-batiments').classList.toggle('active', batimentsCharges);
    afficherMessage(
      features.length
        ? `${features.length} bâtiments affichés en 3D.`
        : 'Aucun bâtiment cartographié dans cette zone.',
    );
  } catch (error) {
    afficherMessage("Les bâtiments 3D ne sont pas disponibles pour le moment (source externe injoignable).");
  }
}

// ---------------------------------------------------------------------------
// Filtres
// ---------------------------------------------------------------------------

function lieuVisible(lieu) {
  if (filtreActif === 'bonus') return bonusPourcent(lieu) > 0;
  return true;
}

function missionsFiltrees(lieu) {
  if (filtreActif === 'solo') return lieu.missions.filter((m) => !m.estDuo);
  if (filtreActif === 'duo') return lieu.missions.filter((m) => m.estDuo);
  if (filtreActif === 'disponible') {
    return lieu.missions.filter((m) => m.statutJoueur === 'disponible');
  }
  return lieu.missions;
}

// ---------------------------------------------------------------------------
// Marqueurs
// ---------------------------------------------------------------------------

function contenuPinLieu(lieu, nombreMissions) {
  const bonus = bonusPourcent(lieu);
  return `
    <span class="pin-icone">${iconeLieu(lieu.typeEtablissement)}</span>
    <span class="pin-nom">${escapeHtml(lieu.nom)}</span>
    <span class="pin-compteur">${nombreMissions}</span>
    ${bonus > 0 ? `<span class="pin-bonus">+${bonus}%</span>` : ''}
  `;
}

function creerMarqueurLieu(lieu) {
  const nombreMissions = missionsFiltrees(lieu).length;

  const el = document.createElement('div');
  el.className = 'pin-lieu';
  el.innerHTML = contenuPinLieu(lieu, nombreMissions);
  if (nombreMissions === 0) {
    el.classList.add('eteint');
  }
  if (!lieuVisible(lieu)) {
    el.style.display = 'none';
  }
  el.addEventListener('click', (event) => {
    event.stopPropagation();
    ouvrirFiche(lieu);
  });
  // Le marqueur survolé passe devant les autres : sur une rue dense, les
  // étiquettes se chevauchent sinon.
  el.style.zIndex = '2'; // l'étiquette du lieu passe devant ses missions
  el.addEventListener('mouseenter', () => {
    el.style.zIndex = '3';
  });
  el.addEventListener('mouseleave', () => {
    el.style.zIndex = '2';
  });

  const marqueur = new maplibregl.Marker({ element: el, anchor: 'bottom' })
    .setLngLat([lieu.longitude, lieu.latitude])
    .addTo(map);

  return { lieu, el, marqueur };
}

function creerMarqueurMission(lieu, mission, index, total) {
  const el = document.createElement('div');
  el.className = `pin-mission ${mission.estDuo ? 'duo' : ''} ${mission.statutJoueur}`;
  const icone =
    mission.statutJoueur === 'accomplie'
      ? '✓'
      : mission.statutJoueur === 'en_attente'
        ? '⏳'
        : ICONES_ARCHETYPE[mission.archetypeDominant] || '✨';
  el.innerHTML = `<div class="pin-corps"><span>${icone}</span></div>`;
  el.title = mission.titre;
  el.addEventListener('click', (event) => {
    event.stopPropagation();
    ouvrirFiche(lieu, mission.id);
  });
  el.style.display = 'none'; // rendu visible par majZoom() si on est assez près

  // Les missions se jouent DANS le lieu : on les accroche donc au même point,
  // en éventail sous l'étiquette du partenaire. L'écart est exprimé en pixels
  // pour qu'il reste lisible quel que soit le zoom et l'inclinaison.
  const angle = total > 1 ? ANGLE_DEBUT + (index * ANGLE_ARC) / (total - 1) : 90;
  const radians = (angle * Math.PI) / 180;
  const ecart = [
    Math.round(RAYON_EVENTAIL_PX * Math.cos(radians)),
    Math.round(RAYON_EVENTAIL_PX * Math.sin(radians)),
  ];

  const marqueur = new maplibregl.Marker({ element: el, anchor: 'bottom', offset: ecart })
    .setLngLat([lieu.longitude, lieu.latitude])
    .addTo(map);

  return { lieu, mission, el, marqueur };
}

function dessinerMarqueurs() {
  marqueursLieux.forEach((m) => m.marqueur.remove());
  marqueursMissions.forEach((m) => m.marqueur.remove());
  marqueursLieux = [];
  marqueursMissions = [];

  lieux.forEach((lieu) => {
    marqueursLieux.push(creerMarqueurLieu(lieu));

    const missions = missionsFiltrees(lieu);
    missions.forEach((mission, index) => {
      marqueursMissions.push(creerMarqueurMission(lieu, mission, index, missions.length));
    });
  });

  majZoom();
  majSelection();
}

// Appelé à chaque mouvement de zoom : uniquement des bascules de classe, pour
// que la carte reste fluide.
function majZoom() {
  const zoom = map.getZoom();
  const compact = zoom < ZOOM_NOMS;
  const missionsVisibles = zoom >= ZOOM_MISSIONS;

  marqueursLieux.forEach(({ el }) => el.classList.toggle('compact', compact));
  marqueursMissions.forEach(({ lieu, el }) => {
    el.style.display = missionsVisibles && lieuVisible(lieu) ? '' : 'none';
  });
}

function majSelection() {
  marqueursLieux.forEach(({ lieu, el }) => {
    el.classList.toggle('selectionne', lieuOuvert === lieu.id);
  });
}

// ---------------------------------------------------------------------------
// Fiche partenaire
// ---------------------------------------------------------------------------

function fermerFiche() {
  ficheEl.hidden = true;
  ficheFondEl.hidden = true;
  lieuOuvert = null;
  majSelection();
}

function noteTexte(lieu) {
  return lieu.nombreAvis ? `★ ${lieu.noteMoyenne}` : '—';
}

function badgesMission(mission) {
  return [
    ARCHETYPE_LABELS[mission.archetypeDominant],
    DUREE_LABELS[mission.duree],
    THEME_LABELS[mission.theme],
  ]
    .filter(Boolean)
    .map((label) => `<span class="badge">${label}</span>`)
    .join('');
}

function blocMission(lieu, mission) {
  const recompenseFinale =
    Math.round(mission.recompenseBase * (lieu.multiplicateur ?? 1) * 100) / 100;

  const etiquetteValideur = mission.estMissionType
    ? '<span class="badge valideur">Validée par un autre joueur</span>'
    : '<span class="badge valideur">Validée par le commerçant — check-in requis</span>';

  let zoneAction = '';
  if (!playerId) {
    zoneAction = `<p class="hint"><a href="index.html">Crée ton profil</a> pour accomplir cette mission.</p>`;
  } else if (mission.statutJoueur === 'accomplie') {
    zoneAction = `<p class="mission-done">✓ Mission accomplie</p>`;
  } else if (mission.statutJoueur === 'en_attente') {
    zoneAction = `<p class="mission-pending">⏳ En attente de validation</p>`;
  } else {
    zoneAction = `
      <div class="mission-actions">
        ${mission.estDuo ? `<button type="button" class="secondary" data-action="binome">Chercher un binôme</button>` : ''}
        <button type="button" data-action="terminer">J'ai terminé</button>
      </div>
      <div class="choix-credit" hidden>
        ${
          mission.estMissionType
            ? `<label>Pseudo du joueur qui doit valider
                 <input type="text" class="validator-pseudo" placeholder="Ex : Bob" /></label>`
            : ''
        }
        <p class="hint">Que fais-tu du crédit gagné (une fois validé) ?</p>
        <div class="choix-buttons">
          <button type="button" data-choix="depense">Dépenser</button>
          <button type="button" data-choix="don">Donner</button>
          <button type="button" data-choix="accumulation">Accumuler</button>
        </div>
      </div>
      <p class="mission-erreur error" hidden></p>
    `;
  }

  return `
    <article class="mission-bloc ${mission.estDuo ? 'duo' : ''}" data-mission="${mission.id}">
      <div class="mission-card-header">
        <h4>${escapeHtml(mission.titre)}</h4>
        <span class="reward">+${recompenseFinale} crédit${recompenseFinale > 1 ? 's' : ''}</span>
      </div>
      <p>${escapeHtml(mission.description)}</p>
      <div class="badges">
        <span class="badge duo-badge">${MODE_LABELS[mission.modeInteraction] || 'Solo'}</span>
        ${badgesMission(mission)}
        ${etiquetteValideur}
      </div>
      ${zoneAction}
    </article>
  `;
}

function ouvrirFiche(lieu, missionCiblee) {
  lieuOuvert = lieu.id;
  const bonus = bonusPourcent(lieu);
  const missions = lieu.missions;
  const solos = missions.filter((m) => !m.estDuo);
  const duos = missions.filter((m) => m.estDuo);

  ficheContenuEl.innerHTML = `
    <h2>${iconeLieu(lieu.typeEtablissement)} ${escapeHtml(lieu.nom)}</h2>
    <p class="hint">${escapeHtml(lieu.typeEtablissement)} — ${escapeHtml(lieu.adresse)}</p>

    <div class="fiche-stats">
      <div class="fiche-stat"><strong>${noteTexte(lieu)}</strong><span>${lieu.nombreAvis} avis</span></div>
      <div class="fiche-stat"><strong>${lieu.nombreCheckins}</strong><span>Visites</span></div>
      <div class="fiche-stat"><strong>${Math.round((lieu.tauxOccupation ?? 0) * 100)}%</strong><span>Fréquentation</span></div>
      <div class="fiche-stat"><strong>${bonus > 0 ? `+${bonus}%` : '—'}</strong><span>Bonus</span></div>
    </div>

    <div class="mission-actions">
      <button type="button" id="fiche-checkin">Check-in ici</button>
      <button type="button" class="secondary" id="fiche-avis">Voir les avis</button>
    </div>
    <p id="fiche-checkin-statut" class="hint" hidden></p>
    <div id="fiche-avis-liste" hidden></div>

    <p class="fiche-section-titre">Missions solo (${solos.length})</p>
    ${solos.map((m) => blocMission(lieu, m)).join('') || '<p class="hint">Aucune mission solo ici.</p>'}

    <p class="fiche-section-titre">Missions duo (${duos.length})</p>
    ${duos.map((m) => blocMission(lieu, m)).join('') || '<p class="hint">Aucune mission duo ici.</p>'}
  `;

  brancherFiche(lieu);

  ficheEl.hidden = false;
  ficheFondEl.hidden = false;
  ficheEl.scrollTop = 0;
  majSelection();

  // On se rapproche du lieu, en gardant la vue inclinée.
  map.easeTo({
    center: [lieu.longitude, lieu.latitude],
    zoom: Math.max(map.getZoom(), 16.5),
    pitch: Math.max(map.getPitch(), 50),
    offset: [0, -120],
    duration: 900,
  });

  if (missionCiblee) {
    const bloc = ficheContenuEl.querySelector(`[data-mission="${missionCiblee}"]`);
    if (bloc) {
      bloc.scrollIntoView({ behavior: 'smooth', block: 'center' });
      bloc.classList.add('selectionne');
    }
  }
}

function positionActuelle() {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error("Ton navigateur ne supporte pas la géolocalisation."));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (position) => resolve(position.coords),
      () =>
        reject(
          new Error("Impossible d'obtenir ta position. Autorise la localisation et réessaie."),
        ),
      { enableHighAccuracy: true, timeout: 10000 },
    );
  });
}

function brancherFiche(lieu) {
  const checkinBtn = document.getElementById('fiche-checkin');
  const checkinStatut = document.getElementById('fiche-checkin-statut');

  if (!playerId) {
    checkinBtn.disabled = true;
    checkinStatut.hidden = false;
    checkinStatut.innerHTML = `<a href="index.html">Crée ton profil joueur</a> pour faire un check-in.`;
  } else {
    checkinBtn.addEventListener('click', async () => {
      checkinStatut.hidden = false;
      checkinStatut.textContent = 'Localisation en cours...';
      checkinBtn.disabled = true;
      try {
        const coords = await positionActuelle();
        const checkin = await apiCall('POST', `/businesses/${lieu.id}/checkins`, {
          playerId,
          latitude: coords.latitude,
          longitude: coords.longitude,
        });
        checkinStatut.textContent = `Check-in validé (${Math.round(checkin.distanceMeters)} m du lieu).`;
      } catch (error) {
        checkinStatut.textContent = error.message;
        checkinBtn.disabled = false;
      }
    });
  }

  const avisBtn = document.getElementById('fiche-avis');
  const avisListe = document.getElementById('fiche-avis-liste');
  avisBtn.addEventListener('click', async () => {
    if (!avisListe.hidden) {
      avisListe.hidden = true;
      avisBtn.textContent = 'Voir les avis';
      return;
    }
    const avis = await apiCall('GET', `/businesses/${lieu.id}/reviews`);
    avisListe.innerHTML = avis.length
      ? avis
          .map(
            (a) => `
              <div class="review-item">
                <strong>${'★'.repeat(a.note)}${'☆'.repeat(5 - a.note)}</strong>
                ${a.commentaire ? `<p>${escapeHtml(a.commentaire)}</p>` : ''}
              </div>`,
          )
          .join('')
      : '<p class="hint">Aucun avis pour le moment.</p>';
    avisListe.hidden = false;
    avisBtn.textContent = 'Masquer les avis';
  });

  ficheContenuEl.querySelectorAll('.mission-bloc').forEach((bloc) => {
    const mission = lieu.missions.find((m) => m.id === bloc.dataset.mission);
    if (!mission) return;
    brancherMission(bloc, lieu, mission);
  });
}

function brancherMission(bloc, lieu, mission) {
  const erreurEl = bloc.querySelector('.mission-erreur');
  const choixEl = bloc.querySelector('.choix-credit');
  const terminerBtn = bloc.querySelector('[data-action="terminer"]');
  const binomeBtn = bloc.querySelector('[data-action="binome"]');

  if (binomeBtn) {
    binomeBtn.addEventListener('click', async () => {
      erreurEl.hidden = true;
      binomeBtn.disabled = true;
      try {
        await apiCall('POST', `/players/${playerId}/duos`, {
          typeMatching: TYPE_MATCHING[mission.modeInteraction] || 'affinite_naturelle',
          missionId: mission.id,
          businessId: lieu.id,
        });
        afficherMessage(
          "Duo proposé sur cette mission — retrouve-le dans l'onglet Duos (ton binôme reste caché jusqu'au rendez-vous).",
          6000,
        );
      } catch (error) {
        erreurEl.textContent = error.message;
        erreurEl.hidden = false;
        binomeBtn.disabled = false;
      }
    });
  }

  if (!terminerBtn) return;

  terminerBtn.addEventListener('click', () => {
    terminerBtn.hidden = true;
    choixEl.hidden = false;
  });

  choixEl.querySelectorAll('button[data-choix]').forEach((btn) => {
    btn.addEventListener('click', async () => {
      erreurEl.hidden = true;
      const dto = { choix: btn.dataset.choix };
      const pseudoInput = choixEl.querySelector('.validator-pseudo');
      if (pseudoInput) {
        dto.validatorPseudo = pseudoInput.value.trim();
      }
      try {
        await apiCall(
          'POST',
          `/players/${playerId}/missions/${mission.id}/request-validation`,
          dto,
        );
        afficherMessage('Demande de validation envoyée.');
        await chargerCarte({ garderVue: true, reouvrir: lieu.id });
      } catch (error) {
        erreurEl.textContent = error.message;
        erreurEl.hidden = false;
      }
    });
  });
}

// ---------------------------------------------------------------------------
// Chargement des données
// ---------------------------------------------------------------------------

function cadrerSurLesLieux() {
  if (lieux.length === 0) return;
  if (lieux.length === 1) {
    map.easeTo({ center: [lieux[0].longitude, lieux[0].latitude], zoom: 16.5, duration: 800 });
    return;
  }
  const bornes = new maplibregl.LngLatBounds();
  lieux.forEach((lieu) => bornes.extend([lieu.longitude, lieu.latitude]));
  map.fitBounds(bornes, { padding: { top: 130, bottom: 90, left: 60, right: 70 }, duration: 800 });
}

async function chargerCarte(options = {}) {
  const query = playerId ? `?playerId=${encodeURIComponent(playerId)}` : '';
  const donnees = await apiCall('GET', `/map${query}`);
  lieux = donnees.lieux.filter(
    (lieu) => typeof lieu.latitude === 'number' && typeof lieu.longitude === 'number',
  );

  if (lieux.length === 0) {
    afficherMessage(
      "Aucun partenaire sur la carte pour l'instant — ajoute un établissement depuis l'espace commerçant.",
      0,
    );
  }

  dessinerMarqueurs();
  rafraichirCouches();

  if (!options.garderVue) {
    cadrerSurLesLieux();
  }
  if (options.reouvrir) {
    const lieu = lieux.find((l) => l.id === options.reouvrir);
    if (lieu) ouvrirFiche(lieu);
  }
}

// ---------------------------------------------------------------------------
// Branchements de l'interface
// ---------------------------------------------------------------------------

document.getElementById('carte-filtres').addEventListener('click', (event) => {
  const chip = event.target.closest('.chip');
  if (!chip) return;
  document.querySelectorAll('#carte-filtres .chip').forEach((c) => c.classList.remove('active'));
  chip.classList.add('active');
  filtreActif = chip.dataset.filtre;
  dessinerMarqueurs();
  rafraichirCouches();
});

const btn3d = document.getElementById('btn-3d');
btn3d.addEventListener('click', () => {
  const en3d = map.getPitch() > 10;
  map.easeTo({ pitch: en3d ? 0 : 58, bearing: en3d ? 0 : -18, duration: 700 });
  btn3d.textContent = en3d ? '2D' : '3D';
});

document.getElementById('btn-nord').addEventListener('click', () => {
  map.easeTo({ bearing: 0, duration: 500 });
});

document.getElementById('btn-batiments').addEventListener('click', chargerBatiments);

document.getElementById('btn-tout-voir').addEventListener('click', () => {
  fermerFiche();
  cadrerSurLesLieux();
});

document.getElementById('btn-position').addEventListener('click', async () => {
  try {
    const coords = await positionActuelle();
    if (marqueurPosition) marqueurPosition.remove();
    const el = document.createElement('div');
    el.className = 'pin-moi';
    el.title = 'Ma position';
    marqueurPosition = new maplibregl.Marker({ element: el, anchor: 'center' })
      .setLngLat([coords.longitude, coords.latitude])
      .addTo(map);
    map.easeTo({
      center: [coords.longitude, coords.latitude],
      zoom: Math.max(map.getZoom(), 16),
      duration: 900,
    });
  } catch (error) {
    afficherMessage(error.message);
  }
});

document.getElementById('fiche-fermer').addEventListener('click', fermerFiche);
ficheFondEl.addEventListener('click', fermerFiche);

map.on('zoom', majZoom);

map.on('load', () => {
  installerCouches();
  chargerCarte().catch((error) => afficherMessage(error.message, 0));
});
