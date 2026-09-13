const placesList = document.getElementById('places-list');
const noPlayerWarning = document.getElementById('no-player-warning');

const playerId = localStorage.getItem('playerId');

function getCurrentPosition() {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error("Ton navigateur ne supporte pas la géolocalisation."));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (position) => resolve(position.coords),
      () => reject(new Error("Impossible d'obtenir ta position. Autorise l'accès à la localisation et réessaie.")),
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
    <div class="mission-card-header">
      <h3>${escapeHtml(place.nom)} ${bonusBadge(place)}</h3>
      <span class="reward">${ratingLabel(place)}</span>
    </div>
    <p class="hint">${escapeHtml(place.typeEtablissement)} — ${escapeHtml(place.adresse)}</p>
    <button type="button" class="checkin-btn">Check-in ici</button>
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
    <button type="button" class="toggle-reviews-btn">Voir les avis</button>
    <div class="reviews-list" hidden></div>
  `;

  const checkinBtn = card.querySelector('.checkin-btn');
  const checkinStatus = card.querySelector('.checkin-status');
  const reviewForm = card.querySelector('.review-form');
  const reviewError = card.querySelector('.review-error');
  const toggleReviewsBtn = card.querySelector('.toggle-reviews-btn');
  const reviewsListEl = card.querySelector('.reviews-list');

  checkinBtn.addEventListener('click', async () => {
    checkinStatus.hidden = false;
    checkinStatus.textContent = 'Localisation en cours...';
    checkinBtn.disabled = true;

    try {
      const coords = await getCurrentPosition();
      const checkin = await apiCall('POST', `/businesses/${place.id}/checkins`, {
        playerId,
        latitude: coords.latitude,
        longitude: coords.longitude,
      });
      checkinStatus.textContent = `Check-in validé (${Math.round(checkin.distanceMeters)}m du lieu). Tu peux laisser un avis !`;
      reviewForm.hidden = false;
    } catch (error) {
      checkinStatus.textContent = error.message;
      checkinBtn.disabled = false;
    }
  });

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

  if (!playerId) {
    checkinBtn.disabled = true;
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
    // Cercle illustrant la zone dans laquelle le check-in est accepté (150m).
    L.circle([place.latitude, place.longitude], {
      radius: 150,
      color: '#1f5f50',
      weight: 1,
      fillOpacity: 0.08,
    }).addTo(map);

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
