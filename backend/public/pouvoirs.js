// ---------------------------------------------------------------------------
// L'inventaire des pouvoirs.
//
// Trois listes, et l'ordre compte : ce qui COURT en ce moment d'abord, parce
// que c'est périssable et que c'est maintenant qu'il faut sortir ; ce qui est
// PRÊT ensuite ; ce qui est PASSÉ en dernier, replié, parce qu'un pouvoir
// qu'on a laissé périmer est une leçon, pas un reproche.
//
// Deux pouvoirs demandent une cible : « Vision lointaine » veut un quartier,
// « Lever le voile » veut un joueur. Plutôt qu'un champ de saisie où l'on
// taperait des coordonnées, la page va chercher ce qu'il faut : les quartiers
// voisins viennent de la position du navigateur, les joueurs viennent de la
// liste d'amis.
// ---------------------------------------------------------------------------

const connexion = document.getElementById('connexion');
const playerId = localStorage.getItem('playerId');

const BLOCS = {
  actifs: {
    conteneur: document.getElementById('actifs'),
    bloc: document.getElementById('bloc-actifs'),
    titre: document.getElementById('actifs-titre'),
  },
  disponibles: {
    conteneur: document.getElementById('disponibles'),
    bloc: document.getElementById('bloc-disponibles'),
    titre: document.getElementById('disponibles-titre'),
    vide: document.getElementById('disponibles-vide'),
  },
  passes: {
    conteneur: document.getElementById('passes'),
    bloc: document.getElementById('bloc-passes'),
    titre: document.getElementById('passes-titre'),
  },
};

// La couleur d'un pouvoir, c'est celle de son archétype — les mêmes quatre
// teintes que les pages du site.
const TEINTES = {
  explorateur: '#38bdf8',
  accomplisseur: '#f59e0b',
  competiteur: '#fb7185',
  socialisateur: '#2dd4bf',
};

const ARCHETYPES = {
  explorateur: 'Explorateur',
  accomplisseur: 'Accomplisseur',
  competiteur: 'Compétiteur',
  socialisateur: 'Socialisateur',
};

async function appeler(methode, chemin, corps) {
  const reponse = await fetch(chemin, {
    method: methode,
    headers: corps ? { 'Content-Type': 'application/json' } : undefined,
    body: corps ? JSON.stringify(corps) : undefined,
  });
  const donnees = await reponse.json().catch(() => ({}));
  if (!reponse.ok) {
    throw new Error(
      Array.isArray(donnees.message) ? donnees.message.join(', ') : donnees.message || 'Erreur.',
    );
  }
  return donnees;
}

function carte(pouvoir, etat) {
  const teinte = TEINTES[pouvoir.profil] || 'var(--accent)';
  const bouton =
    etat === 'disponible'
      ? `<button type="button" class="utiliser" data-id="${escapeHtml(pouvoir.id)}" data-cible="${escapeHtml(pouvoir.cible)}" data-nom="${escapeHtml(pouvoir.nom)}">Utiliser</button>`
      : '';

  // Le temps restant est dit différemment selon l'état : avant de servir,
  // c'est un compte à rebours avant de perdre le pouvoir ; pendant, c'est ce
  // qu'il reste pour en profiter.
  const chrono =
    etat === 'disponible'
      ? `<span class="pouvoir-chrono">périme dans ${escapeHtml(pouvoir.restant)}</span>`
      : etat === 'actif'
        ? `<span class="pouvoir-chrono actif">encore ${escapeHtml(pouvoir.restant)}</span>`
        : '';

  return `
    <article class="pouvoir${etat === 'passe' ? ' pouvoir-passe' : ''}" style="--teinte:${teinte}">
      <div class="pouvoir-entete">
        <strong>${escapeHtml(pouvoir.nom)}</strong>
        ${chrono}
      </div>
      <p class="pouvoir-effet">${escapeHtml(pouvoir.effet)}</p>
      ${etat === 'disponible' ? `<p class="pouvoir-conseil">${escapeHtml(pouvoir.conseil)}</p>` : ''}
      <div class="pouvoir-pied">
        <span class="pouvoir-profil">${escapeHtml(ARCHETYPES[pouvoir.profil] || pouvoir.profil)}</span>
        <span class="pouvoir-origine">${escapeHtml(pouvoir.origine)}</span>
      </div>
      ${bouton}
      <p class="error pouvoir-erreur" hidden></p>
    </article>
  `;
}

function remplir(cle, liste, etat, titre) {
  const { conteneur, bloc, titre: titreEl, vide } = BLOCS[cle];
  conteneur.innerHTML = liste.map((p) => carte(p, etat)).join('');
  titreEl.textContent = `${titre}${liste.length ? ` (${liste.length})` : ''}`;
  if (vide) vide.hidden = liste.length > 0;
  bloc.hidden = liste.length === 0 && !vide;
}

async function charger() {
  const inventaire = await appeler('GET', `/players/${playerId}/pouvoirs`);

  remplir('actifs', inventaire.actifs, 'actif', 'En cours');
  remplir('disponibles', inventaire.disponibles, 'disponible', 'Prêts à servir');
  remplir('passes', inventaire.passes, 'passe', 'Déjà passés');

  // Compter ce qui a péri sans servir : c'est l'information qui apprend le
  // plus vite qu'un pouvoir se dépense.
  const perimes = inventaire.passes.filter((p) => p.etat === 'perime').length;
  document.getElementById('passes-aide').textContent = perimes
    ? `${perimes} ${perimes > 1 ? 'ont péri' : 'a péri'} sans servir.`
    : 'Tu les as tous utilisés.';

  brancherBoutons();
}

// --- Désigner une cible ----------------------------------------------------

/**
 * Le quartier à lever.
 *
 * On propose les quartiers VOISINS de la position actuelle : lever le
 * brouillard sur l'autre bout de la ville n'apprendrait rien d'utile, et
 * demander des coordonnées à taper serait absurde.
 */
function demanderQuartier() {
  return new Promise((resoudre, rejeter) => {
    if (!navigator.geolocation) {
      rejeter(new Error("Ton navigateur ne sait pas où tu es : impossible de choisir un quartier."));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (position) => {
        // La clé d'un quartier, telle que le serveur la calcule : le coin
        // bas-gauche de la case de 0,005°, à trois décimales.
        const taille = 0.005;
        const lat = Math.floor(position.coords.latitude / taille) * taille;
        const lon = Math.floor(position.coords.longitude / taille) * taille;
        resoudre(`${lat.toFixed(3)},${lon.toFixed(3)}`);
      },
      () => rejeter(new Error('Position refusée : impossible de choisir un quartier.')),
    );
  });
}

async function demanderJoueur() {
  const pseudo = window.prompt('Le pseudo du joueur dont tu veux voir le profil :');
  if (!pseudo) throw new Error('Aucun joueur désigné.');
  const trouves = await appeler('GET', `/players/recherche?pseudo=${encodeURIComponent(pseudo)}`);
  const joueur = Array.isArray(trouves) ? trouves[0] : trouves;
  if (!joueur || !joueur.id) throw new Error(`Aucun joueur nommé « ${pseudo} ».`);
  return joueur.id;
}

function brancherBoutons() {
  document.querySelectorAll('.utiliser').forEach((bouton) => {
    bouton.addEventListener('click', async () => {
      const erreur = bouton.parentElement.querySelector('.pouvoir-erreur');
      erreur.hidden = true;
      bouton.disabled = true;

      try {
        let cible = null;
        if (bouton.dataset.cible === 'zone') cible = await demanderQuartier();
        if (bouton.dataset.cible === 'joueur') cible = await demanderJoueur();

        await appeler('POST', `/players/${playerId}/pouvoirs/${bouton.dataset.id}/utiliser`, {
          cible,
        });
        await charger();
      } catch (e) {
        erreur.textContent = e.message;
        erreur.hidden = false;
        bouton.disabled = false;
      }
    });
  });
}

if (!playerId) {
  connexion.hidden = false;
} else {
  charger().catch((e) => {
    connexion.textContent = e.message;
    connexion.hidden = false;
  });
}
