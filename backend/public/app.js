const stepAccount = document.getElementById('step-account');
const stepQuestionnaire = document.getElementById('step-questionnaire');
const stepResult = document.getElementById('step-result');

const accountForm = document.getElementById('account-form');
const accountError = document.getElementById('account-error');
const questionnaireForm = document.getElementById('questionnaire-form');
const questionnaireError = document.getElementById('questionnaire-error');
const scoresEl = document.getElementById('scores');
const restartButton = document.getElementById('restart');
const walletSection = document.getElementById('wallet-section');
const walletSoldeEl = document.getElementById('wallet-solde');
const walletHistoryEl = document.getElementById('wallet-history');
const walletHistoryEmpty = document.getElementById('wallet-history-empty');

const ARCHETYPE_LABELS = {
  scoreExplorateur: 'Explorateur',
  scoreAccomplisseur: 'Accomplisseur',
  scoreCompetiteur: 'Compétiteur',
  scoreSocialisateur: 'Socialisateur',
};

// Les jetons circulent entre comptes : chaque ligne dit d'où ils viennent
// ou vers qui ils partent.
const SENS_SIGNE = { entree: '+', sortie: '−' };

let playerId = localStorage.getItem('playerId');

function showStep(step) {
  stepAccount.hidden = step !== 'account';
  stepQuestionnaire.hidden = step !== 'questionnaire';
  stepResult.hidden = step !== 'result';
}

async function apiPost(path, body) {
  const response = await fetch(path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
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

async function apiPut(path, body) {
  const response = await fetch(path, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
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

async function apiDelete(path) {
  const response = await fetch(path, { method: 'DELETE' });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.message || 'Une erreur est survenue.');
  }
  return data;
}

async function apiGet(path) {
  const response = await fetch(path);
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.message || 'Une erreur est survenue.');
  }
  return data;
}

const DIMENSIONS = [
  ['deltaExplorateur', 'Explorateur'],
  ['deltaAccomplisseur', 'Accomplisseur'],
  ['deltaCompetiteur', 'Compétiteur'],
  ['deltaSocialisateur', 'Socialisateur'],
];

// XP, niveau et badges (section 2.9 des specs).
async function loadProgression() {
  if (!playerId) return;

  const progression = await apiGet(`/players/${playerId}/progression`).catch(() => null);
  if (!progression) return;

  document.getElementById('progression-section').hidden = false;
  document.getElementById('niveau-actuel').textContent = `Niveau ${progression.niveau}`;
  document.getElementById('xp-total').textContent = `${progression.xpTotal} XP`;
  document.getElementById('xp-bar').style.width = `${progression.progressionVersNiveauSuivant}%`;
  document.getElementById('xp-detail').textContent =
    `${progression.xpNiveauActuel} / ${progression.xpProchainNiveau} XP vers le niveau ${progression.niveau + 1}`;

  const carte = (badge, obtenu) => `
    <div class="badge-card${obtenu ? '' : ' verrouille'}">
      <span class="badge-icone">${badge.icone}</span>
      <strong>${escapeHtml(badge.nom)}</strong>
      <span class="hint">${escapeHtml(badge.description)}</span>
    </div>
  `;

  document.getElementById('badges-obtenus-empty').hidden = progression.badgesObtenus.length > 0;
  document.getElementById('badges-obtenus').innerHTML = progression.badgesObtenus
    .map((b) => carte(b, true))
    .join('');
  document.getElementById('badges-a-debloquer').innerHTML = progression.badgesADebloquer
    .map((b) => carte(b, false))
    .join('');
}

// Titres et objets de collection : la partie « ce que tu as vécu » de la
// progression (section 2.9).
async function loadCollection() {
  if (!playerId) return;

  const collection = await apiGet(`/players/${playerId}/collection`).catch(() => null);
  if (!collection) return;

  document.getElementById('collection-section').hidden = false;

  document.getElementById('titres-liste').innerHTML = collection.titres
    .map((titre) => {
      const actif = collection.titreEquipe?.id === titre.id;
      if (!titre.obtenu) {
        return `
          <div class="titre verrouille">
            <strong>${escapeHtml(titre.libelle)}</strong>
            <span class="hint">${escapeHtml(titre.condition)}</span>
          </div>
        `;
      }
      return `
        <button type="button" class="titre${actif ? ' actif' : ''}" data-titre="${escapeHtml(titre.id)}">
          <strong>${escapeHtml(titre.libelle)}</strong>
          <span class="hint">${actif ? 'Affiché sur ton profil' : 'Cliquer pour l’afficher'}</span>
        </button>
      `;
    })
    .join('');

  document.querySelectorAll('#titres-liste .titre[data-titre]').forEach((btn) => {
    btn.addEventListener('click', async () => {
      // Recliquer sur le titre affiché le retire.
      const actuel = collection.titreEquipe?.id;
      const choisi = btn.dataset.titre === actuel ? null : btn.dataset.titre;
      await apiPut(`/players/${playerId}/titre`, { titreId: choisi ?? undefined });
      loadCollection();
    });
  });

  document.getElementById('series-collection').innerHTML = collection.series
    .map(
      (serie) => `
        <div class="serie">
          <div class="serie-titre">
            <strong>${escapeHtml(serie.nom)}</strong>
            <span class="hint">${serie.obtenus} / ${serie.total}${serie.complete ? ' — complète !' : ''}</span>
          </div>
          <p class="hint">${escapeHtml(serie.description)}</p>
          <div class="objets">
            ${serie.items
              .map(
                (item) => `
                  <div class="objet${item.obtenu ? '' : ' verrouille'}" title="${escapeHtml(item.obtenuPar)}">
                    <span class="objet-icone">${item.obtenu ? item.icone : '·'}</span>
                    <span>${item.obtenu ? escapeHtml(item.nom) : '???'}</span>
                  </div>
                `,
              )
              .join('')}
          </div>
        </div>
      `,
    )
    .join('');
}

// Déblocage progressif : où en est le joueur dans son tutoriel, ce qui lui
// est encore fermé et pourquoi.
async function loadParcours() {
  if (!playerId) return;

  const deblocage = await apiGet(`/players/${playerId}/deblocage`).catch(() => null);
  if (!deblocage) return;

  document.getElementById('parcours-section').hidden = false;

  const restantes = deblocage.tutoriel.etapes.filter((e) => !e.faite).length;
  document.getElementById('parcours-intro').textContent = deblocage.tutoriel.termine
    ? 'Tutoriel terminé : le mode libre est ouvert.'
    : `Encore ${restantes} étape${restantes > 1 ? 's' : ''} avant le mode libre.`;

  document.getElementById('tutoriel-etapes').innerHTML = deblocage.tutoriel.etapes
    .map(
      (etape) => `
        <li class="etape${etape.faite ? ' faite' : ''}">
          <span class="etape-puce">${etape.faite ? '✓' : '○'}</span>
          <div>
            <strong>${escapeHtml(etape.titre)}</strong>
            <span class="hint">${escapeHtml(etape.consigne)}</span>
            ${etape.faite ? '' : `<a href="${escapeHtml(etape.lien)}">Y aller</a>`}
          </div>
        </li>
      `,
    )
    .join('');

  // Un cadenas dessiné plutôt qu'un emoji : l'interface reste sobre.
  const CADENAS_FERME =
    '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="4.5" y="10.5" width="15" height="10" rx="2.2"/><path d="M8 10.5V7.8a4 4 0 0 1 8 0v2.7"/></svg>';
  const CADENAS_OUVERT =
    '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="4.5" y="10.5" width="15" height="10" rx="2.2"/><path d="M8 10.5V7.8a4 4 0 0 1 7.6-1.7"/></svg>';

  document.getElementById('fonctionnalites').innerHTML = deblocage.fonctionnalites
    .map(
      (f) => `
        <div class="deblocage${f.ouverte ? ' ouvert' : ''}">
          ${f.ouverte ? CADENAS_OUVERT : CADENAS_FERME}
          <div>
            <strong>${escapeHtml(f.nom)}</strong>
            ${f.ouverte ? '' : `<span class="hint">${escapeHtml(f.condition)}</span>`}
          </div>
        </div>
      `,
    )
    .join('');

  const jour = deblocage.missionsDuJour;
  document.getElementById('missions-du-jour').textContent =
    `Missions aujourd'hui : ${jour.utilisees} / ${jour.limite} lancées, ${jour.restantes} restante${jour.restantes > 1 ? 's' : ''}. La limite monte d'une mission à chaque niveau.`;

  document.getElementById('zones-decouvertes').textContent =
    deblocage.zonesDecouvertes === 0
      ? "Carte : aucun quartier levé pour l'instant — fais scanner ton code chez un partenaire, et tout son quartier se lève d'un coup."
      : `Carte : ${deblocage.zonesDecouvertes} quartier${deblocage.zonesDecouvertes > 1 ? 's' : ''} levé${deblocage.zonesDecouvertes > 1 ? 's' : ''}.`;
}

// Le profil évolue à chaque action : on affiche les scores à jour et ce qui
// les a récemment déplacés.
async function loadProfilVivant() {
  if (!playerId) return;

  const [profile, events] = await Promise.all([
    apiGet(`/players/${playerId}/profile`).catch(() => null),
    apiGet(`/players/${playerId}/events`).catch(() => []),
  ]);
  if (!profile) return;

  document.getElementById('profil-vivant').hidden = false;
  renderScoresInto(document.getElementById('profil-scores'), profile);

  const container = document.getElementById('profil-events');
  document.getElementById('profil-events-empty').hidden = events.length > 0;

  container.innerHTML = events
    .map((event) => {
      const effets = DIMENSIONS.filter(([champ]) => Math.abs(event[champ]) >= 0.1)
        .map(([champ, label]) => {
          const valeur = event[champ];
          const signe = valeur > 0 ? '+' : '';
          return `<span class="${valeur > 0 ? 'positive' : 'negative'}">${signe}${valeur} ${label}</span>`;
        })
        .join(' ');

      return `
        <div class="event-row">
          <span>${escapeHtml(event.libelle)} <span class="hint">(${new Date(event.createdAt).toLocaleDateString('fr-FR')})</span></span>
          <span class="event-effets">${effets || '<span class="hint">tracé, sans effet sur les 4 profils</span>'}</span>
        </div>
      `;
    })
    .join('');
}

async function loadWallet() {
  if (!playerId) return;

  const wallet = await apiGet(`/players/${playerId}/wallet`);
  walletSection.hidden = false;
  // Le solde se lit d'un coup d'œil : le chiffre en grand, l'unité à côté.
  walletSoldeEl.innerHTML = `${wallet.solde}<span class="wallet-unite">jeton${wallet.solde > 1 ? 's' : ''}</span>`;
  walletHistoryEmpty.hidden = wallet.mouvements.length > 0;

  walletHistoryEl.innerHTML = wallet.mouvements
    .map((m) => {
      const date = new Date(m.createdAt).toLocaleDateString('fr-FR');
      return `
        <div class="transaction-row">
          <span>${escapeHtml(m.libelle)}${m.detail ? ` — ${escapeHtml(m.detail)}` : ''} <span class="hint">(${date})</span></span>
          <span class="${m.sens === 'entree' ? 'positive' : 'negative'}">${SENS_SIGNE[m.sens]}${m.montant}</span>
        </div>
      `;
    })
    .join('');
}

// --- Créer un compte ou se connecter -------------------------------------

let modeAuth = 'inscription';

function appliquerModeAuth() {
  const inscription = modeAuth === 'inscription';
  document.getElementById('champ-pseudo').hidden = !inscription;
  document.getElementById('pseudo').required = inscription;
  document.getElementById('account-submit').textContent = inscription
    ? 'Créer mon compte'
    : 'Se connecter';
  document.getElementById('mot-de-passe').setAttribute(
    'autocomplete',
    inscription ? 'new-password' : 'current-password',
  );
  document.getElementById('auth-aide').hidden = !inscription;
  // « Mot de passe oublié » n'a de sens que sur l'écran de connexion.
  document.getElementById('auth-oubli').hidden = inscription;
  document.getElementById('oubli-message').hidden = true;
  accountError.hidden = true;
}

document.getElementById('btn-oubli').addEventListener('click', async () => {
  const message = document.getElementById('oubli-message');
  const email = document.getElementById('email').value.trim();
  accountError.hidden = true;

  if (!email) {
    accountError.textContent = 'Indique d’abord ton adresse email.';
    accountError.hidden = false;
    return;
  }

  const reponse = await apiPost('/auth/mot-de-passe-oublie', { email }).catch((e) => ({
    message: e.message,
  }));
  message.textContent = reponse.message;
  message.hidden = false;
});

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
    // Le serveur pose un cookie de session ; la page ne garde que
    // l'identifiant, pour savoir de qui elle parle.
    const utilisateur =
      modeAuth === 'inscription'
        ? await apiPost('/auth/inscription', {
            pseudo: document.getElementById('pseudo').value.trim(),
            email,
            motDePasse,
          })
        : await apiPost('/auth/connexion', { email, motDePasse });

    playerId = utilisateur.id;
    localStorage.setItem('playerId', playerId);
    accountForm.reset();

    if (utilisateur.type === 'commercant') {
      window.location.href = 'commercant.html';
      return;
    }

    // On repasse par le même chemin qu'au chargement : une seule façon
    // d'afficher un joueur connecté, donc rien qui puisse diverger.
    await initialiser();
  } catch (error) {
    accountError.textContent = error.message;
    accountError.hidden = false;
  }
});

// --- Notifications hors de l'appli --------------------------------------

async function rafraichirBoutonPush() {
  const bouton = document.getElementById('btn-push');
  const etat = document.getElementById('push-etat');
  const { supporte, actif, refuse } = await etatPush();

  if (!supporte) {
    bouton.hidden = true;
    etat.textContent =
      "Ce navigateur ne sait pas recevoir de notifications hors de l'appli. Sur iPhone, il faut d'abord ajouter le site à l'écran d'accueil.";
    return;
  }
  if (refuse && !actif) {
    bouton.hidden = true;
    etat.textContent =
      'Les notifications sont bloquées pour ce site. Il faut les réautoriser dans les réglages du navigateur.';
    return;
  }

  bouton.hidden = false;
  bouton.textContent = actif ? 'Désactiver les notifications' : 'Activer les notifications';
  etat.textContent = actif
    ? 'Tu es prévenu même quand l’appli est fermée.'
    : "Être prévenu même quand l'appli est fermée : validation attendue, duo proposé, invitation reçue.";
}

document.getElementById('btn-push').addEventListener('click', async () => {
  const bouton = document.getElementById('btn-push');
  const erreur = document.getElementById('push-erreur');
  erreur.hidden = true;
  bouton.disabled = true;

  try {
    const { actif } = await etatPush();
    if (actif) {
      await desactiverPush();
    } else {
      await activerPush();
    }
  } catch (e) {
    erreur.textContent = e.message;
    erreur.hidden = false;
  } finally {
    bouton.disabled = false;
    await rafraichirBoutonPush();
  }
});

document.getElementById('btn-deconnexion').addEventListener('click', async () => {
  await desactiverPush().catch(() => null);
  await apiPost('/auth/deconnexion', {}).catch(() => null);
  localStorage.removeItem('playerId');
  window.location.reload();
});

questionnaireForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  questionnaireError.hidden = true;

  const sliders = {
    decouverteHabitude: Number(document.getElementById('decouverteHabitude').value),
    competitionCooperation: Number(document.getElementById('competitionCooperation').value),
    seulGroupe: Number(document.getElementById('seulGroupe').value),
    objectifImprovisation: Number(document.getElementById('objectifImprovisation').value),
  };

  try {
    const profile = await apiPost(`/players/${playerId}/questionnaire`, sliders);
    renderScores(profile);
    showStep('result');
    loadParcours();
    loadProgression();
    loadProfilVivant();
  } catch (error) {
    questionnaireError.textContent = error.message;
    questionnaireError.hidden = false;
  }
});

function renderScoresInto(container, profile) {
  container.innerHTML = '';

  Object.entries(ARCHETYPE_LABELS)
    .map(([key, label]) => ({ label, value: profile[key] }))
    .sort((a, b) => b.value - a.value)
    .forEach(({ label, value }) => {
      const row = document.createElement('div');
      row.className = 'score-row';
      row.innerHTML = `
        <div class="label"><span>${label}</span><span>${value}%</span></div>
        <div class="score-bar-track">
          <div class="score-bar-fill" style="width: ${value}%"></div>
        </div>
      `;
      container.appendChild(row);
    });
}

function renderScores(profile) {
  renderScoresInto(scoresEl, profile);
}

// « Recommencer » ne supprime que les réponses au questionnaire : le compte,
// lui, reste — c'est le bouton « Se déconnecter » qui le quitte.
restartButton.addEventListener('click', () => {
  questionnaireForm.reset();
  showStep('questionnaire');
});

function reinitialiserAffichage() {
  // Déconnecté, il n'y a qu'un formulaire à montrer : sur un ordinateur la
  // page redevient une colonne étroite et centrée plutôt qu'un formulaire
  // collé à gauche avec un grand vide à droite.
  document.body.classList.add('avant-connexion');
  accountForm.reset();
  questionnaireForm.reset();
  walletSection.hidden = true;
  document.getElementById('profil-vivant').hidden = true;
  document.getElementById('progression-section').hidden = true;
  document.getElementById('parcours-section').hidden = true;
  document.getElementById('collection-section').hidden = true;
  document.getElementById('compte-section').hidden = true;
  showStep('account');
}


// ---------------------------------------------------------------------------
// Ma photo de profil.
// ---------------------------------------------------------------------------

let moi = null;

function afficherMonAvatar() {
  if (!moi) return;

  const url = urlPhoto('joueur', moi.id, moi.photoVersion);
  document.getElementById('mon-avatar').innerHTML = pastilleAvatar(moi.pseudo, url, 'grand');
  document.getElementById('btn-photo').textContent = url ? 'Changer ma photo' : 'Ajouter une photo';
  document.getElementById('btn-retirer-photo').hidden = !url;
}

function direPhoto(texte, erreur = false) {
  const zone = document.getElementById('photo-aide');
  zone.textContent = texte;
  zone.className = erreur ? 'error' : 'hint';
}

document.getElementById('btn-photo').addEventListener('click', () => {
  document.getElementById('fichier-photo').click();
});

document.getElementById('fichier-photo').addEventListener('change', async (evenement) => {
  const fichier = evenement.target.files?.[0];
  // Le champ est remis à zéro tout de suite : sans ça, rechoisir le même
  // fichier après une erreur ne déclencherait rien.
  evenement.target.value = '';
  if (!fichier) return;

  direPhoto('Préparation de la photo…');

  try {
    const image = await reduireImage(fichier);
    const { version } = await apiPut(`/photos/joueur/${moi.id}`, { image });
    moi.photoVersion = version;
    afficherMonAvatar();
    direPhoto('Photo enregistrée.');
  } catch (erreur) {
    direPhoto(erreur.message, true);
  }
});

document.getElementById('btn-retirer-photo').addEventListener('click', async () => {
  if (!window.confirm('Retirer ta photo de profil ?')) return;

  try {
    await apiDelete(`/photos/joueur/${moi.id}`);
    moi.photoVersion = null;
    afficherMonAvatar();
    direPhoto('Photo retirée. Tes initiales reprennent sa place.');
  } catch (erreur) {
    direPhoto(erreur.message, true);
  }
});

function demarrer() {
  loadParcours();
  loadProgression();
  loadCollection();
  loadProfilVivant();
  loadWallet();
}

// C'est le serveur qui dit qui est connecté : le cookie de session fait foi,
// pas ce que la page a en mémoire.
async function initialiser() {
  appliquerModeAuth();

  const utilisateur = await apiGet('/auth/moi').catch(() => null);
  if (!utilisateur) {
    localStorage.removeItem('playerId');
    playerId = null;
    reinitialiserAffichage();
    return;
  }

  playerId = utilisateur.id;
  moi = utilisateur;
  localStorage.setItem('playerId', playerId);

  // Il y a désormais de quoi remplir les deux colonnes de l'écran large.
  document.body.classList.remove('avant-connexion');

  document.getElementById('compte-section').hidden = false;
  afficherMonAvatar();
  document.getElementById('compte-identite').textContent =
    `Connecté en tant que ${utilisateur.pseudo} (${utilisateur.email}).`;
  rafraichirBoutonPush();

  chargerBandeauOffres();

  showStep('questionnaire');
  demarrer();
}

/**
 * Le bandeau des offres.
 *
 * Une seule offre à la fois, la plus récente qu'on n'a pas encore ouverte :
 * c'est un rappel, pas une régie publicitaire. Quatre offres empilées sur la
 * page d'accueil transformeraient le profil du joueur en prospectus.
 *
 * Si la requête échoue, le bandeau reste simplement caché : rien sur cette
 * page ne dépend de lui.
 */
async function chargerBandeauOffres() {
  const bandeau = document.getElementById('bandeau-offres');
  if (!bandeau) return;

  const offres = await apiGet('/offres').catch(() => []);
  const aLire = offres.find((offre) => !offre.dejaOuverte);
  if (!aLire) {
    bandeau.hidden = true;
    return;
  }

  bandeau.innerHTML = `
    <span class="bandeau-etiquette">Offre du quartier</span>
    <span class="bandeau-titre">${escapeHtml(aLire.offre)}</span>
    <span class="bandeau-lieu">${escapeHtml(aLire.commerce)}${aLire.gainPossible > 0 ? ` · +${aLire.gainPossible} jeton${aLire.gainPossible >= 2 ? 's' : ''} à la lecture` : ''}</span>
  `;
  bandeau.hidden = false;
}

initialiser();
