// ---------------------------------------------------------------------------
// Les offres des commerçants, côté joueur.
//
// Trois choses sur une page :
//   1. une barre de recherche — c'est par elle qu'on trouve une offre quand
//      on cherche quelque chose de précis ;
//   2. les offres en cours, dont l'ouverture rapporte des jetons ;
//   3. les bons obtenus, à montrer au commerçant au moment de payer.
//
// Ouvrir une offre est un geste qui déplace de l'argent : c'est le commerçant
// qui paie le joueur pour l'avoir lue. Le serveur décide seul s'il paie ou
// non, et la page dit toujours pourquoi — un refus silencieux ferait croire
// à une panne.
// ---------------------------------------------------------------------------

const rechercheForm = document.getElementById('recherche-form');
const rechercheInput = document.getElementById('recherche');
const rechercheResume = document.getElementById('recherche-resume');
const offresListe = document.getElementById('offres-liste');
const offresTitre = document.getElementById('offres-titre');
const offresVide = document.getElementById('offres-vide');
const bonsListe = document.getElementById('bons-liste');
const bonsVide = document.getElementById('bons-vide');
const connexion = document.getElementById('connexion');

const playerId = localStorage.getItem('playerId');

// Ce que le serveur a répondu à la dernière ouverture, par offre : le montant
// versé, ou la raison du refus. Gardé ici pour que la carte puisse l'afficher
// après le rechargement de la liste.
const resultats = new Map();

async function apiCall(method, path, body) {
  const reponse = await fetch(path, {
    method,
    headers: body ? { 'Content-Type': 'application/json' } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await reponse.json().catch(() => ({}));
  if (!reponse.ok) {
    const message = Array.isArray(data.message)
      ? data.message.join(', ')
      : data.message || 'Une erreur est survenue.';
    throw new Error(message);
  }
  return data;
}

/** « 1 jeton », « 1,5 jeton », « 3 jetons » : en français le pluriel part à 2. */
function jetons(montant) {
  return `${montant} jeton${montant >= 2 ? 's' : ''}`;
}

function dateCourte(valeur) {
  if (!valeur) return '';
  return new Date(valeur).toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'long',
  });
}

// --- Chargement -------------------------------------------------------------

async function charger() {
  if (!playerId) {
    connexion.hidden = false;
    return;
  }

  document.getElementById('bloc-recherche').hidden = false;
  document.getElementById('bloc-offres').hidden = false;
  document.getElementById('bloc-bons').hidden = false;

  const requete = rechercheInput.value.trim();
  const [offres, bons] = await Promise.all([
    apiCall('GET', `/offres?q=${encodeURIComponent(requete)}`),
    apiCall('GET', '/offres/mes-bons'),
  ]);

  afficherOffres(offres, requete);
  afficherBons(bons);
}

// --- Les offres -------------------------------------------------------------

function afficherOffres(offres, requete) {
  offresTitre.textContent = requete ? `Résultats pour « ${requete} »` : 'Offres en cours';
  rechercheResume.textContent = requete
    ? `${offres.length} offre${offres.length > 1 ? 's' : ''} correspond${offres.length > 1 ? 'ent' : ''} à ta recherche.`
    : 'Tape ce que tu cherches, ou laisse vide pour tout voir.';

  offresListe.innerHTML = '';
  offresVide.hidden = offres.length > 0;
  offresVide.textContent = requete
    ? "Aucune offre ne parle de ça pour le moment. Essaie un autre mot."
    : "Aucun commerce n'a d'offre en cours dans le quartier.";

  offres.forEach((offre) => offresListe.appendChild(carteOffre(offre)));
}

function carteOffre(offre) {
  const carte = document.createElement('article');
  carte.className = 'offre';

  const image = urlPhoto('publicite', offre.id, offre.photoVersion);
  const resultat = resultats.get(offre.id);

  carte.innerHTML = `
    ${image ? `<img class="offre-image" src="${escapeHtml(image)}" alt="" loading="lazy" />` : ''}
    <div class="offre-corps">
      <p class="offre-commerce">${escapeHtml(offre.commerce)}</p>
      <h3>${escapeHtml(offre.titre)}</h3>
      <p class="offre-accroche">${escapeHtml(offre.offre)}</p>
      <div class="badges">
        ${offre.reduction ? `<span class="badge bonus">${escapeHtml(offre.reduction)}</span>` : ''}
        <span class="badge">Jusqu'au ${dateCourte(offre.finLe)}</span>
      </div>
      <div class="offre-action"></div>
    </div>
  `;

  const action = carte.querySelector('.offre-action');

  if (offre.dejaOuverte) {
    // Déjà ouverte : la description est acquise, et le bon est en poche.
    action.innerHTML = `
      <p class="offre-detail">${escapeHtml(offre.description)}</p>
      ${resultat ? messageDuResultat(resultat) : ''}
      <p class="hint">Ce bon est dans « Mes bons », plus bas.</p>
    `;
    return carte;
  }

  action.innerHTML = `
    <button type="button" class="offre-ouvrir">
      Ouvrir l'offre${offre.gainPossible > 0 ? ` · +${offre.gainPossible}` : ''}
    </button>
    <p class="hint">${offre.gainPossible > 0 ? `Le commerçant te verse ${jetons(offre.gainPossible)} si c'est ta première ouverture et que tu es passé chez un partenaire récemment.` : 'Ouvrir cette offre te donne le bon de réduction.'}</p>
    <p class="offre-erreur error" hidden></p>
  `;

  const bouton = action.querySelector('.offre-ouvrir');
  const erreur = action.querySelector('.offre-erreur');

  bouton.addEventListener('click', async () => {
    bouton.disabled = true;
    erreur.hidden = true;
    try {
      const reponse = await apiCall('POST', `/offres/${offre.id}/ouvrir`);
      resultats.set(offre.id, reponse.paiement);
      await charger();
    } catch (e) {
      erreur.textContent = e.message;
      erreur.hidden = false;
      bouton.disabled = false;
    }
  });

  return carte;
}

/**
 * Ce que l'ouverture a donné.
 *
 * Le refus de paiement n'est pas une erreur : l'offre s'ouvre quand même et
 * le bon est obtenu. On le dit sur le ton d'une information, pas d'une alerte.
 */
function messageDuResultat(paiement) {
  if (paiement.paye) {
    return `<p class="mission-done">✓ Le commerçant t'a versé ${jetons(paiement.montant)}.</p>`;
  }
  return `<p class="hint">Offre ouverte et bon obtenu. ${escapeHtml(paiement.raison)}</p>`;
}

// --- Les bons ---------------------------------------------------------------

function afficherBons(bons) {
  bonsListe.innerHTML = '';
  bonsVide.hidden = bons.length > 0;

  // Les bons utilisables d'abord : c'est ce qu'on vient chercher ici.
  const ranges = [...bons].sort((a, b) => Number(b.valable) - Number(a.valable));

  ranges.forEach((bon) => {
    const carte = document.createElement('article');
    carte.className = `offre bon${bon.valable ? '' : ' bon-perime'}`;

    const image = urlPhoto('publicite', bon.publiciteId, bon.photoVersion);
    const etat = bon.utiliseLe
      ? `<span class="badge">Utilisé le ${dateCourte(bon.utiliseLe)}</span>`
      : bon.valable
        ? `<span class="badge valideur">À faire valoir jusqu'au ${dateCourte(bon.finLe)}</span>`
        : `<span class="badge">Offre terminée</span>`;

    carte.innerHTML = `
      ${image ? `<img class="offre-image" src="${escapeHtml(image)}" alt="" loading="lazy" />` : ''}
      <div class="offre-corps">
        <p class="offre-commerce">${escapeHtml(bon.commerce)}</p>
        <h3>${escapeHtml(bon.titre)}</h3>
        <p class="offre-accroche">${escapeHtml(bon.offre)}</p>
        <div class="badges">
          ${bon.reduction ? `<span class="badge bonus">${escapeHtml(bon.reduction)}</span>` : ''}
          ${etat}
        </div>
      </div>
    `;

    bonsListe.appendChild(carte);
  });
}

// --- Départ -----------------------------------------------------------------

rechercheForm.addEventListener('submit', (evenement) => {
  evenement.preventDefault();
  charger();
});

// Vider le champ (la petite croix d'un champ « search ») revient à tout voir.
rechercheInput.addEventListener('search', () => charger());

charger();
