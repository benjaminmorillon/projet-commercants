const placesList = document.getElementById('places-list');
const noPlayerWarning = document.getElementById('no-player-warning');

const playerId = localStorage.getItem('playerId');

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

function ratingLabel(place) {
  if (!place.nombreAvis) {
    // Une absence d'avis est une information neutre : elle ne doit pas
    // s'afficher avec le même poids qu'une note.
    return '<span class="hint">Pas encore d\'avis</span>';
  }
  return `★ ${place.noteMoyenne}/5 (${place.nombreAvis} avis)`;
}

// Les lieux de qualité encore peu fréquentés rapportent davantage
// (section 4 des specs) : on le montre clairement au joueur.
function bonusBadge(place) {
  const bonus = Math.round(((place.multiplicateur ?? 1) - 1) * 100);
  if (bonus <= 0) {
    return '';
  }
  return `<span class="badge bonus">+${bonus}% ici</span>`;
}

function renderPlace(place) {
  const card = document.createElement('article');
  card.className = 'card place-card';
  card.innerHTML = `
    <div class="ligne-avec-avatar en-haut">
      ${pastilleAvatar(place.nom, urlPhoto('commerce', place.id, place.photoVersion))}
      <div class="corps">
        <div class="mission-card-header">
          <h3>${escapeHtml(place.nom)} ${bonusBadge(place)}</h3>
          <span class="reward">${ratingLabel(place)}</span>
        </div>
        <p class="hint">${escapeHtml(place.typeEtablissement)} — ${escapeHtml(place.adresse)}</p>
      </div>
    </div>
    <p class="hint venue">
      Pour enregistrer ta venue ici, montre <a href="code.html">ton code</a> au commerçant sur
      place : c'est lui qui le scanne.
    </p>
    <p class="checkin-status hint" hidden></p>
    <form class="review-form" hidden>
      <label>
        Note
        <select class="review-note">
          <option value="5">5 - Excellent</option>
          <option value="4">4 - Très bien</option>
          <option value="3">3 - Correct</option>
          <option value="2">2 - Moyen</option>
          <option value="1">1 - Déçu</option>
        </select>
      </label>
      <label>
        Commentaire (optionnel)
        <textarea class="review-comment" rows="2" maxlength="1000" placeholder="Ton avis sur ce lieu..."></textarea>
      </label>
      <button type="submit">Publier l'avis</button>
      <p class="review-error error" hidden></p>
    </form>
    <div class="pieces-lieu"></div>
    <button type="button" class="toggle-reviews-btn">Voir les avis</button>
    <div class="reviews-list" hidden></div>
  `;

  const checkinStatus = card.querySelector('.checkin-status');
  const reviewForm = card.querySelector('.review-form');
  const reviewError = card.querySelector('.review-error');
  const toggleReviewsBtn = card.querySelector('.toggle-reviews-btn');
  const reviewsListEl = card.querySelector('.reviews-list');

  reviewForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    reviewError.hidden = true;

    const dto = {
      playerId,
      note: Number(card.querySelector('.review-note').value),
      commentaire: card.querySelector('.review-comment').value.trim() || undefined,
    };

    try {
      await apiCall('POST', `/businesses/${place.id}/reviews`, dto);
      reviewForm.hidden = true;
      checkinStatus.textContent = 'Merci, ton avis a été publié !';
      loadReviews();
    } catch (error) {
      reviewError.textContent = error.message;
      reviewError.hidden = false;
    }
  });

  // Les documents du lieu : sa carte, ses tarifs, une affiche. Chargés avec
  // la fiche, parce que c'est souvent ce qu'on vient chercher — savoir ce
  // qu'il y a à la carte avant de pousser la porte.
  async function loadPieces() {
    const pieces = await apiCall('GET', `/businesses/${place.id}/pieces-jointes`).catch(() => []);
    const bloc = card.querySelector('.pieces-lieu');
    if (pieces.length === 0) {
      bloc.hidden = true;
      return;
    }

    bloc.hidden = false;
    bloc.innerHTML = `
      <p class="pieces-titre">Ses documents</p>
      <div class="pieces">
        ${pieces
          .map(
            (piece) => `
              <div class="piece">
                <span class="piece-icone" aria-hidden="true">${piece.affichable ? '▣' : '▤'}</span>
                <div class="piece-texte">
                  <a class="piece-nom" href="/pieces-jointes/${encodeURIComponent(piece.id)}"
                     target="_blank" rel="noopener">${escapeHtml(piece.nom)}</a>
                  <span class="piece-poids">${escapeHtml(piece.poids)}</span>
                </div>
              </div>
            `,
          )
          .join('')}
      </div>
    `;
  }

  loadPieces();

  async function loadReviews() {
    const reviews = await apiCall('GET', `/businesses/${place.id}/reviews`);
    reviewsListEl.innerHTML = reviews.length
      ? reviews
          .map(
            (review) => `
              <div class="review-item">
                <strong>${'★'.repeat(review.note)}${'☆'.repeat(5 - review.note)}</strong>
                ${review.commentaire ? `<p>${escapeHtml(review.commentaire)}</p>` : ''}
              </div>
            `,
          )
          .join('')
      : '<p class="hint">Aucun avis pour le moment.</p>';
  }

  toggleReviewsBtn.addEventListener('click', async () => {
    const willShow = reviewsListEl.hidden;
    if (willShow) {
      await loadReviews();
    }
    reviewsListEl.hidden = !willShow;
    toggleReviewsBtn.textContent = willShow ? 'Masquer les avis' : 'Voir les avis';
  });

  if (playerId) {
    reviewForm.hidden = false;
  }

  return card;
}

function renderMap(places) {
  const mapEl = document.getElementById('map');
  const mapEmpty = document.getElementById('map-empty');

  if (places.length === 0) {
    mapEl.hidden = true;
    mapEmpty.hidden = false;
    return;
  }

  mapEl.hidden = false;
  mapEmpty.hidden = true;

  const map = L.map(mapEl);
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    maxZoom: 19,
  }).addTo(map);

  const markers = places.map((place) => {

    const marker = L.marker([place.latitude, place.longitude]).addTo(map);
    marker.bindPopup(
      `<strong>${escapeHtml(place.nom)}</strong><br>${escapeHtml(place.adresse)}<br>${ratingLabel(place)}<br>${bonusBadge(place) || ''}`,
    );
    return marker;
  });

  if (markers.length === 1) {
    map.setView(markers[0].getLatLng(), 16);
  } else {
    map.fitBounds(L.featureGroup(markers).getBounds().pad(0.2));
  }
}

async function loadPlaces() {
  const places = await apiCall('GET', '/businesses');
  placesList.innerHTML = '';
  places.forEach((place) => placesList.appendChild(renderPlace(place)));
  renderMap(places);
}

noPlayerWarning.hidden = Boolean(playerId);
loadPlaces();
