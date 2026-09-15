// ---------------------------------------------------------------------------
// Mon code de présence.
//
// Un QR, les huit caractères écrits en dessous, et un compte à rebours.
//
// Le compte à rebours n'est pas décoratif : le code meurt au bout de deux
// minutes, et sans lui le joueur tendrait son téléphone à un commerçant qui
// lirait un code déjà mort, sans que ni l'un ni l'autre comprenne pourquoi
// ça ne marche pas.
// ---------------------------------------------------------------------------

const qr = document.getElementById('qr');
const codeLisibleEl = document.getElementById('code-lisible');
const reboursEl = document.getElementById('rebours');
const erreurEl = document.getElementById('code-erreur');
const boutonRenouveler = document.getElementById('renouveler');

const playerId = localStorage.getItem('playerId');

let restantes = 0;
let minuteur = null;

async function apiCall(method, path, corps) {
  const reponse = await fetch(path, {
    method,
    headers: corps ? { 'Content-Type': 'application/json' } : undefined,
    body: corps ? JSON.stringify(corps) : undefined,
  });
  const data = await reponse.json().catch(() => ({}));
  if (!reponse.ok) {
    throw new Error(data.message || 'Une erreur est survenue.');
  }
  return data;
}

function afficher(code) {
  codeLisibleEl.textContent = code.lisible;
  restantes = code.secondesRestantes;

  // L'image arrive avec le code, en clair dans la réponse : un code de
  // présence ne peut pas être servi à une adresse publique, et une balise
  // image ne sait pas joindre le jeton de session.
  qr.src = code.qr;

  erreurEl.hidden = true;
  rafraichirRebours();
}

function rafraichirRebours() {
  if (restantes <= 0) {
    reboursEl.textContent = 'Ce code a expiré.';
    reboursEl.classList.add('expire');
    return;
  }

  const minutes = Math.floor(restantes / 60);
  const secondes = String(restantes % 60).padStart(2, '0');
  reboursEl.textContent = `Valable encore ${minutes}:${secondes}`;
  reboursEl.classList.remove('expire');
}

async function charger() {
  if (!playerId) {
    document.getElementById('connexion').hidden = false;
    return;
  }

  document.getElementById('bloc-code').hidden = false;

  try {
    afficher(await apiCall('GET', '/presence/mon-code'));
  } catch (erreur) {
    erreurEl.textContent = erreur.message;
    erreurEl.hidden = false;
  }

  chargerCommerces();

  if (minuteur) clearInterval(minuteur);
  minuteur = setInterval(() => {
    restantes -= 1;
    rafraichirRebours();
  }, 1000);
}

boutonRenouveler.addEventListener('click', async () => {
  boutonRenouveler.disabled = true;
  try {
    afficher(await apiCall('POST', '/presence/mon-code/renouveler'));
  } catch (erreur) {
    erreurEl.textContent = erreur.message;
    erreurEl.hidden = false;
  } finally {
    boutonRenouveler.disabled = false;
  }
});

// --- Les commerces qui me connaissent ---------------------------------------

function dateCourte(valeur) {
  if (!valeur) return '';
  return new Date(valeur).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' });
}

async function chargerCommerces() {
  if (!playerId) return;

  const commerces = await apiCall('GET', '/presence/mes-commerces').catch(() => []);
  document.getElementById('bloc-commerces').hidden = false;

  const liste = document.getElementById('commerces-liste');
  document.getElementById('commerces-vide').hidden = commerces.length > 0;
  document.getElementById('commerces-titre').textContent =
    `Les commerces qui me connaissent (${commerces.length})`;
  liste.innerHTML = '';

  commerces.forEach((commerce) => {
    const ligne = document.createElement('div');
    ligne.className = `client${commerce.retire ? ' bon-perime' : ''}`;
    ligne.innerHTML = `
      <div>
        <div class="client-nom">${escapeHtml(commerce.nom)}</div>
        <div class="client-detail">
          ${commerce.visites} venue${commerce.visites > 1 ? 's' : ''} · dernière le ${dateCourte(commerce.derniereVisite)}
          ${commerce.retire ? ' · tu ne figures plus dans sa liste' : ''}
        </div>
      </div>
      <button type="button" class="lien-discret retrait">
        ${commerce.retire ? 'Y revenir' : 'Ne plus recevoir ses offres'}
      </button>
    `;

    ligne.querySelector('.retrait').addEventListener('click', async (clic) => {
      clic.target.disabled = true;
      await apiCall('POST', `/presence/mes-commerces/${commerce.businessId}/retrait`, {
        retire: !commerce.retire,
      });
      await chargerCommerces();
    });

    liste.appendChild(ligne);
  });
}

// En revenant sur l'onglet après un moment, le code affiché est probablement
// périmé : on redemande celui du moment plutôt que de laisser un QR mort.
document.addEventListener('visibilitychange', () => {
  if (!document.hidden && restantes <= 0) {
    charger();
  }
});

charger();
