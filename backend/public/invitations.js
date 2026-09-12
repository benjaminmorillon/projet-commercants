const invitationsList = document.getElementById('invitations-list');
const invitationsEmpty = document.getElementById('invitations-empty');
const noPlayerWarning = document.getElementById('no-player-warning');

const playerId = localStorage.getItem('playerId');

// Réactions proposées à la cible : c'est ce retour que le commerçant verra.
const REACTIONS_ACCEPT = ['Ça m’intéresse', 'J’y serai avec des amis', 'Pourquoi pas'];
const REACTIONS_REFUS = ['Pas mon truc', 'Trop loin', 'Pas disponible', 'Trop de pub'];

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

function openResponsePopup(invitation, accepte) {
  const reactions = accepte ? REACTIONS_ACCEPT : REACTIONS_REFUS;

  const overlay = document.createElement('div');
  overlay.className = 'popup-overlay';
  overlay.innerHTML = `
    <div class="popup-card">
      <h3>${accepte ? 'Tu acceptes' : 'Tu refuses'}</h3>
      <p class="hint">Dis à ${escapeHtml(invitation.lieuNom)} ce que tu en penses — ça les aide à mieux cibler la prochaine fois.</p>
      <div class="reaction-buttons">
        ${reactions.map((r) => `<button type="button" class="reaction-btn" data-reaction="${escapeHtml(r)}">${escapeHtml(r)}</button>`).join('')}
      </div>
      <label>
        Commentaire (optionnel)
        <textarea class="response-comment" rows="2" maxlength="500" placeholder="Un mot de plus ?"></textarea>
      </label>
      <p class="popup-error error" hidden></p>
      <div class="popup-actions">
        <button type="button" class="popup-cancel">Annuler</button>
        <button type="button" class="popup-confirm">${accepte ? `✓ Accepter (+${invitation.creditPropose} €)` : 'Confirmer le refus'}</button>
      </div>
    </div>
  `;
  document.body.appendChild(overlay);

  let reactionChoisie = null;
  overlay.querySelectorAll('.reaction-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      reactionChoisie = btn.dataset.reaction;
      overlay.querySelectorAll('.reaction-btn').forEach((b) => b.classList.toggle('selected', b === btn));
    });
  });

  const errorEl = overlay.querySelector('.popup-error');
  overlay.querySelector('.popup-cancel').addEventListener('click', () => overlay.remove());
  overlay.querySelector('.popup-confirm').addEventListener('click', async () => {
    errorEl.hidden = true;
    const commentaire = overlay.querySelector('.response-comment').value.trim();
    try {
      await apiCall('POST', `/invitations/${invitation.id}/${accepte ? 'accepter' : 'refuser'}`, {
        ...(reactionChoisie ? { reaction: reactionChoisie } : {}),
        ...(commentaire ? { commentaire } : {}),
      });
      overlay.remove();
      loadInvitations();
    } catch (error) {
      errorEl.textContent = error.message;
      errorEl.hidden = false;
    }
  });
}

function renderInvitation(invitation) {
  const card = document.createElement('article');
  card.className = 'card invitation-card';

  const evenement = invitation.evenement
    ? `<p class="event-line"><strong>${escapeHtml(invitation.evenement.titre)}</strong> — ${new Date(invitation.evenement.dateDebut).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' })}</p>
       <p>${escapeHtml(invitation.evenement.description)}</p>`
    : '';

  const actions =
    invitation.statut === 'envoyee'
      ? `<div class="choix-buttons">
           <button type="button" class="refuse-invit-btn">Refuser</button>
           <button type="button" class="accept-invit-btn">Accepter (+${invitation.creditPropose} €)</button>
         </div>`
      : `<p class="${invitation.statut === 'acceptee' ? 'mission-done' : 'hint'}">
           ${invitation.statut === 'acceptee' ? `✓ Acceptée — ${invitation.creditVerse} € crédités` : '✗ Refusée'}
           ${invitation.reaction ? ` · « ${escapeHtml(invitation.reaction)} »` : ''}
         </p>`;

  card.innerHTML = `
    <div class="mission-card-header">
      <h3>${escapeHtml(invitation.lieuNom)}</h3>
      <span class="badge">${invitation.type === 'invitation' ? 'Invitation' : 'Publicité'}</span>
    </div>
    <p class="hint">${escapeHtml(invitation.lieuAdresse)}</p>
    ${invitation.imageDataUrl ? `<img class="image-preview" src="${invitation.imageDataUrl}" alt="" />` : ''}
    ${evenement}
    <p>${escapeHtml(invitation.message)}</p>
    ${actions}
  `;

  if (invitation.statut === 'envoyee') {
    card.querySelector('.accept-invit-btn').addEventListener('click', () => openResponsePopup(invitation, true));
    card.querySelector('.refuse-invit-btn').addEventListener('click', () => openResponsePopup(invitation, false));
  }

  return card;
}

async function loadInvitations() {
  const invitations = await apiCall('GET', `/players/${playerId}/invitations`);
  invitationsList.innerHTML = '';
  invitationsEmpty.hidden = invitations.length > 0;
  invitations.forEach((invitation) => invitationsList.appendChild(renderInvitation(invitation)));
}

if (playerId) {
  loadInvitations();
} else {
  noPlayerWarning.hidden = false;
}
