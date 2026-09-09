const filtersForm = document.getElementById('filters-form');
const filterArchetype = document.getElementById('filter-archetype');
const filterDuree = document.getElementById('filter-duree');
const filterTheme = document.getElementById('filter-theme');
const filterMode = document.getElementById('filter-mode');
const missionsList = document.getElementById('missions-list');
const missionsCount = document.getElementById('missions-count');
const missionsEmpty = document.getElementById('missions-empty');

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

async function loadMissions() {
  const params = new URLSearchParams();
  if (filterArchetype.value) params.set('archetype', filterArchetype.value);
  if (filterDuree.value) params.set('duree', filterDuree.value);
  if (filterTheme.value) params.set('theme', filterTheme.value);
  if (filterMode.value) params.set('modeInteraction', filterMode.value);

  const response = await fetch(`/missions?${params.toString()}`);
  const missions = await response.json();
  renderMissions(missions);
}

function renderMissions(missions) {
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

    card.innerHTML = `
      <div class="mission-card-header">
        <h3>${escapeHtml(mission.titre)}</h3>
        <span class="reward">+${mission.recompenseBase} crédit${mission.recompenseBase > 1 ? 's' : ''}</span>
      </div>
      <p>${escapeHtml(mission.description)}</p>
      <div class="badges">${badges}</div>
    `;
    missionsList.appendChild(card);
  });
}

filtersForm.addEventListener('change', loadMissions);

loadMissions();
