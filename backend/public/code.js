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

async function apiCall(method, path) {
  const reponse = await fetch(path, { method });
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

// En revenant sur l'onglet après un moment, le code affiché est probablement
// périmé : on redemande celui du moment plutôt que de laisser un QR mort.
document.addEventListener('visibilitychange', () => {
  if (!document.hidden && restantes <= 0) {
    charger();
  }
});

charger();
