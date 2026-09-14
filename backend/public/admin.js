// ---------------------------------------------------------------------------
// Le back-office.
//
// Volontairement autonome : il ne charge pas nav.js (la coquille de
// l'application joueur), et ne partage rien avec elle à part la feuille de
// style et escapeHtml. Un outil d'administration qui dépend de l'interface
// grand public finit toujours par casser quand celle-ci évolue.
//
// Le formulaire de réglages n'est pas écrit dans le HTML : il est construit à
// partir du catalogue renvoyé par le serveur. Ajouter un réglage côté backend
// le fait apparaître ici tout seul.
// ---------------------------------------------------------------------------

const SECTIONS = [
  'tableau-de-bord',
  'commerces',
  'missions',
  'evenements',
  'comptes',
  'jetons',
  'reglages',
  'journal',
];

async function api(chemin, options = {}) {
  const reponse = await fetch(chemin, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });

  const texte = await reponse.text();
  const donnees = texte ? JSON.parse(texte) : null;

  if (!reponse.ok) {
    const message = Array.isArray(donnees?.message)
      ? donnees.message.join(' ')
      : donnees?.message || 'Une erreur est survenue.';
    const erreur = new Error(message);
    erreur.statut = reponse.status;
    throw erreur;
  }

  return donnees;
}

// --- Connexion -------------------------------------------------------------

function montrerConnexion(message) {
  document.getElementById('shell').hidden = true;
  document.getElementById('ecran-connexion').hidden = false;

  const zone = document.getElementById('erreur-connexion');
  zone.textContent = message || '';
  zone.hidden = !message;
}

document.getElementById('form-connexion').addEventListener('submit', async (evenement) => {
  evenement.preventDefault();

  const email = document.getElementById('email').value.trim();
  const motDePasse = document.getElementById('mot-de-passe').value;

  try {
    await api('/auth/connexion', {
      method: 'POST',
      body: JSON.stringify({ email, motDePasse }),
    });
  } catch (erreur) {
    montrerConnexion(erreur.message);
    return;
  }

  // Connecté — mais pas forcément administrateur. C'est /admin/moi qui
  // tranche, et lui seul : la page ne décide rien, elle demande.
  demarrer();
});

document.getElementById('btn-deconnexion').addEventListener('click', async () => {
  await api('/auth/deconnexion', { method: 'POST' }).catch(() => null);
  window.location.reload();
});

// --- Navigation ------------------------------------------------------------

function sectionDemandee() {
  const cible = window.location.hash.replace('#', '');
  return SECTIONS.includes(cible) ? cible : 'tableau-de-bord';
}

function afficherSection(nom) {
  SECTIONS.forEach((section) => {
    document.getElementById(`section-${section}`).hidden = section !== nom;
  });

  document.querySelectorAll('.admin-rail a').forEach((lien) => {
    if (lien.dataset.section === nom) {
      lien.setAttribute('aria-current', 'page');
    } else {
      lien.removeAttribute('aria-current');
    }
  });

  if (nom === 'tableau-de-bord') chargerTableauDeBord();
  if (nom === 'commerces') chargerCommerces();
  if (nom === 'missions') remplirFormulaireCreation().then(chargerMissions);
  if (nom === 'evenements') chargerEvenements();
  if (nom === 'comptes') chargerComptes();
  if (nom === 'jetons') chargerJetons();
  if (nom === 'reglages') chargerReglages();
  if (nom === 'journal') chargerJournal();
}

window.addEventListener('hashchange', () => afficherSection(sectionDemandee()));

// --- Tableau de bord -------------------------------------------------------

const ETIQUETTES_COMPTEURS = {
  joueurs: 'joueurs',
  commercants: 'comptes commerçants',
  commerces: 'établissements',
  missions: 'missions au catalogue',
  visites: 'visites enregistrées',
  validations: 'missions soumises',
};

async function chargerTableauDeBord() {
  const resume = await api('/admin/resume');

  document.getElementById('compteurs').innerHTML = Object.entries(ETIQUETTES_COMPTEURS)
    .map(
      ([cle, etiquette]) => `
        <div>
          <span class="valeur">${resume[cle] ?? 0}</span>
          <span class="etiquette">${escapeHtml(etiquette)}</span>
        </div>`,
    )
    .join('');

  const { lignes } = await api('/admin/journal?combien=5');
  document.getElementById('journal-court').innerHTML = tableauJournal(lignes);
}

// --- Réglages --------------------------------------------------------------

// Un identifiant HTML valide à partir d'une clé qui contient un point.
function idChamp(cle) {
  return `reglage-${cle.replace(/\./g, '-')}`;
}

function formater(valeur) {
  return typeof valeur === 'boolean' ? (valeur ? 'oui' : 'non') : String(valeur);
}

function carteReglage(reglage) {
  const id = idChamp(reglage.cle);
  const unite = reglage.unite ? `<span class="unite">${escapeHtml(reglage.unite)}</span>` : '';
  const pastille = reglage.personnalise ? '<span class="pastille-modifie">modifié</span>' : '';

  return `
    <div class="reglage" data-cle="${escapeHtml(reglage.cle)}" data-libelle="${escapeHtml(reglage.libelle)}">
      <label class="reglage-titre" for="${id}">${escapeHtml(reglage.libelle)} ${pastille}</label>
      <p class="explication">${escapeHtml(reglage.explication)}</p>
      <div class="commande">
        <div class="saisie">
          <input type="text" id="${id}" inputmode="decimal"
                 value="${escapeHtml(formater(reglage.valeur))}" />
          ${unite}
        </div>
        <div class="defaut">
          ${
            reglage.personnalise
              ? `d'origine : ${escapeHtml(formater(reglage.defaut))} — <button type="button" data-action="defaut">remettre</button>`
              : `valeur d'origine`
          }
        </div>
        <div class="reglage-retour" data-role="reglage-retour"></div>
      </div>
    </div>`;
}

async function chargerReglages() {
  const { groupes, reglages } = await api('/admin/reglages');

  document.getElementById('reglages').innerHTML = groupes
    .map((groupe) => {
      const dedans = reglages.filter((r) => r.groupe === groupe.id);
      if (dedans.length === 0) return '';
      return `
        <section class="groupe-reglages">
          <h2>${escapeHtml(groupe.titre)}</h2>
          <p class="resume">${escapeHtml(groupe.resume)}</p>
          ${dedans.map(carteReglage).join('')}
        </section>`;
    })
    .join('');
}

function direRetour(carte, message, bon) {
  const zone = carte.querySelector('[data-role="reglage-retour"]');

  // Le serveur préfixe ses refus du nom du réglage, parce qu'un appel d'API
  // n'a pas de contexte. Ici le nom est juste au-dessus : on l'enlève.
  const prefixe = `${carte.dataset.libelle} : `;
  zone.textContent = message.startsWith(prefixe) ? message.slice(prefixe.length) : message;
  zone.className = `reglage-retour ${bon ? 'ok' : 'ko'}`;

  if (bon) {
    // Le message de confirmation s'efface tout seul ; un message d'erreur
    // reste tant qu'on n'a pas corrigé.
    window.setTimeout(() => {
      if (zone.textContent === message) {
        zone.textContent = '';
        zone.className = 'reglage-retour';
      }
    }, 2500);
  }
}

// Enregistrement quand on quitte le champ ou qu'on appuie sur Entrée : pas de
// bouton « Enregistrer » par réglage, qui ferait vingt boutons sur la page.
document.getElementById('reglages').addEventListener(
  'blur',
  async (evenement) => {
    const champ = evenement.target;
    if (!champ.matches('input[type="text"]')) return;

    const carte = champ.closest('.reglage');
    const cle = carte.dataset.cle;

    try {
      await api(`/admin/reglages/${encodeURIComponent(cle)}`, {
        method: 'PUT',
        body: JSON.stringify({ valeur: champ.value }),
      });
      direRetour(carte, 'Enregistré.', true);
      // On recharge : la pastille « modifié » et le lien « remettre »
      // doivent apparaître, et une valeur normalisée (0,80 → 0.8) doit
      // s'afficher telle que le serveur l'a comprise.
      await chargerReglages();
      afficherSection('reglages');
    } catch (erreur) {
      direRetour(carte, erreur.message, false);
    }
  },
  true,
);

document.getElementById('reglages').addEventListener('keydown', (evenement) => {
  if (evenement.key === 'Enter' && evenement.target.matches('input[type="text"]')) {
    evenement.preventDefault();
    evenement.target.blur();
  }
});

document.getElementById('reglages').addEventListener('click', async (evenement) => {
  const bouton = evenement.target.closest('[data-action="defaut"]');
  if (!bouton) return;

  const carte = bouton.closest('.reglage');
  try {
    await api(`/admin/reglages/${encodeURIComponent(carte.dataset.cle)}`, { method: 'DELETE' });
    await chargerReglages();
  } catch (erreur) {
    direRetour(carte, erreur.message, false);
  }
});

// --- Journal ---------------------------------------------------------------

function quand(iso) {
  const date = new Date(iso);
  return date.toLocaleString('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function tableauJournal(lignes) {
  if (!lignes || lignes.length === 0) {
    return '<div class="vide">Aucune modification pour le moment.</div>';
  }

  return `
    <div class="enveloppe-table">
      <table class="table-journal">
        <thead>
          <tr><th>Quand</th><th>Qui</th><th>Quoi</th></tr>
        </thead>
        <tbody>
          ${lignes
            .map(
              (ligne) => `
            <tr>
              <td class="quand">${escapeHtml(quand(ligne.faitLe))}</td>
              <td class="qui">${escapeHtml(ligne.auteurEmail)}</td>
              <td>${escapeHtml(ligne.resume)}</td>
            </tr>`,
            )
            .join('')}
        </tbody>
      </table>
    </div>`;
}

async function chargerJournal() {
  const { lignes } = await api('/admin/journal');
  document.getElementById('journal-complet').innerHTML = tableauJournal(lignes);
}


// ===========================================================================
// Les contenus : commerces, missions, événements.
//
// Les trois pages partagent le même motif — une fiche repliée qui se déplie
// en formulaire — donc la mécanique (déplier, enregistrer, supprimer,
// afficher le retour) est écrite UNE fois ici, et chaque page se contente de
// décrire ses champs.
// ===========================================================================

// Le vocabulaire des missions, chargé une fois et gardé : il ne change pas
// pendant qu'on utilise la page.
let vocabulaire = null;

async function chargerVocabulaire() {
  if (!vocabulaire) {
    vocabulaire = await api('/admin/vocabulaire');
  }
  return vocabulaire;
}

function optionsDe(termes, choisie) {
  return termes
    .map(
      (t) =>
        `<option value="${escapeHtml(t.valeur)}"${t.valeur === choisie ? ' selected' : ''}>${escapeHtml(t.libelle)}</option>`,
    )
    .join('');
}

// --- Les champs d'un formulaire de fiche -----------------------------------

function champTexte(nom, etiquette, valeur, options = {}) {
  const attrs = [
    `name="${nom}"`,
    `value="${escapeHtml(valeur ?? '')}"`,
    options.type ? `type="${options.type}"` : 'type="text"',
    options.step ? `step="${options.step}"` : '',
    options.min !== undefined ? `min="${options.min}"` : '',
    options.max !== undefined ? `max="${options.max}"` : '',
    options.requis ? 'required' : '',
  ]
    .filter(Boolean)
    .join(' ');

  return `
    <label class="${options.large ? 'pleine-largeur' : ''}">
      ${escapeHtml(etiquette)}
      <input ${attrs} />
    </label>`;
}

function champZoneTexte(nom, etiquette, valeur) {
  return `
    <label class="pleine-largeur">
      ${escapeHtml(etiquette)}
      <textarea name="${nom}">${escapeHtml(valeur ?? '')}</textarea>
    </label>`;
}

function champListe(nom, etiquette, termes, valeur) {
  return `
    <label>
      ${escapeHtml(etiquette)}
      <select name="${nom}">${optionsDe(termes, valeur)}</select>
    </label>`;
}

// --- La fiche générique ----------------------------------------------------

/**
 * Construit une fiche dépliable.
 *
 * `suppression` vaut null quand l'objet ne peut pas être supprimé : on
 * n'affiche alors pas un bouton qui échouerait, on explique pourquoi.
 */
function fiche({ id, nom, meta, champs, suppression }) {
  const boutonSupprimer = suppression?.possible
    ? `<button type="button" class="bouton-discret bouton-danger" data-supprimer="${escapeHtml(id)}">Supprimer</button>`
    : '';
  const raison = suppression && !suppression.possible
    ? `<span class="message">${escapeHtml(suppression.raison)}</span>`
    : '';

  return `
    <details class="fiche" data-id="${escapeHtml(id)}">
      <summary class="fiche-entete">
        <span class="nom">${nom}</span>
        <span class="meta">${meta}</span>
        <span class="chevron">▾</span>
      </summary>
      <div class="fiche-corps">
        <form data-id="${escapeHtml(id)}">
          <div class="champs">${champs}</div>
          <div class="actions-fiche">
            <button type="submit">Enregistrer</button>
            ${boutonSupprimer}
            <span class="message" data-role="message"></span>
            ${raison}
          </div>
        </form>
      </div>
    </details>`;
}

/** Les valeurs d'un formulaire, sous forme d'objet simple. */
function valeursDuFormulaire(formulaire) {
  const valeurs = {};
  new FormData(formulaire).forEach((valeur, cle) => {
    valeurs[cle] = valeur;
  });
  return valeurs;
}

function messageDeFiche(formulaire, texte, bon) {
  const zone = formulaire.querySelector('[data-role="message"]');
  zone.textContent = texte;
  zone.className = `message ${bon ? 'ok' : 'ko'}`;
}

/**
 * Branche l'enregistrement et la suppression sur une liste de fiches.
 *
 * Un seul écouteur posé sur le conteneur plutôt qu'un par fiche : les fiches
 * sont reconstruites à chaque rechargement, et des écouteurs posés sur
 * chacune s'accumuleraient sans jamais être retirés.
 */
function brancherListe(conteneurId, { chemin, recharger, nomPourConfirmation }) {
  const conteneur = document.getElementById(conteneurId);

  conteneur.addEventListener('submit', async (evenement) => {
    evenement.preventDefault();
    const formulaire = evenement.target;
    const id = formulaire.dataset.id;

    try {
      const reponse = await api(`${chemin}/${encodeURIComponent(id)}`, {
        method: 'PUT',
        body: JSON.stringify(valeursDuFormulaire(formulaire)),
      });
      messageDeFiche(
        formulaire,
        reponse.modifie === 0 ? 'Aucune modification à enregistrer.' : 'Enregistré.',
        true,
      );
    } catch (erreur) {
      messageDeFiche(formulaire, erreur.message, false);
    }
  });

  conteneur.addEventListener('click', async (evenement) => {
    const bouton = evenement.target.closest('[data-supprimer]');
    if (!bouton) return;

    const id = bouton.dataset.supprimer;
    const fiche = bouton.closest('.fiche');
    const nom = nomPourConfirmation(fiche);

    // Une suppression ne se rattrape pas : on demande confirmation en
    // nommant ce qui va disparaître, pas en demandant « êtes-vous sûr ? ».
    if (!window.confirm(`Supprimer définitivement ${nom} ?`)) {
      return;
    }

    try {
      await api(`${chemin}/${encodeURIComponent(id)}`, { method: 'DELETE' });
      await recharger();
    } catch (erreur) {
      messageDeFiche(bouton.closest('form'), erreur.message, false);
    }
  });
}


// ---------------------------------------------------------------------------
// La position d'un commerce, sans jamais parler de coordonnées.
//
// Personne ne sait ce qu'est une longitude, et personne ne devrait avoir à
// l'apprendre pour corriger une fiche. Deux façons de placer le point, qui
// couvrent tous les cas :
//
//   1. écrire l'adresse et cliquer sur « Chercher » — le site propose les
//      adresses trouvées, on choisit la bonne ;
//   2. déplacer le point à la main sur la carte, pour l'entrée de service au
//      fond de la cour que le service d'adresses ne connaît pas.
//
// Les coordonnées existent toujours en base — c'est ce qui fait marcher la
// vérification de présence — mais elles ne sont ni saisies ni affichées comme
// des nombres à comprendre. On dit « à 30 m de l'adresse », pas « 48,8601 ».
// ---------------------------------------------------------------------------

function champAdresse(commerce) {
  return `
    <label class="pleine-largeur bloc-adresse">
      Adresse
      <div class="ligne-adresse">
        <input type="text" name="adresse" value="${escapeHtml(commerce.adresse ?? '')}" required />
        <button type="button" class="bouton-discret" data-chercher-adresse>Chercher</button>
      </div>
      <div class="propositions" data-role="propositions" hidden></div>
    </label>`;
}

function champPosition(commerce) {
  return `
    <div class="pleine-largeur bloc-position">
      <span class="etiquette-position">Emplacement exact</span>
      <p class="aide-position">
        Déplacez le point si l'entrée n'est pas exactement à l'adresse postale.
        C'est de ce point que part le rayon dans lequel un joueur peut valider sa venue.
      </p>
      <div class="carte-position" data-role="carte"
           data-latitude="${commerce.latitude}" data-longitude="${commerce.longitude}"></div>
      <p class="etat-position" data-role="etat-position"></p>
      <input type="hidden" name="latitude" value="${commerce.latitude}" />
      <input type="hidden" name="longitude" value="${commerce.longitude}" />
    </div>`;
}

/** Distance à vol d'oiseau entre deux points, en mètres (formule de Haversine). */
function distanceEnMetres(lat1, lon1, lat2, lon2) {
  const RAYON_TERRE = 6371000;
  const rad = (d) => (d * Math.PI) / 180;
  const dLat = rad(lat2 - lat1);
  const dLon = rad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(rad(lat1)) * Math.cos(rad(lat2)) * Math.sin(dLon / 2) ** 2;
  return RAYON_TERRE * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/**
 * Installe la carte d'une fiche, une seule fois, au moment où on la déplie.
 *
 * Construire cinq cartes au chargement de la page pour cinq commerces dont on
 * n'en ouvrira qu'un serait du gâchis — et Leaflet a besoin que son conteneur
 * soit visible pour se dimensionner correctement.
 */
function installerCarte(fiche) {
  const conteneur = fiche.querySelector('[data-role="carte"]');
  if (!conteneur || conteneur.dataset.prete === 'oui') {
    return;
  }
  conteneur.dataset.prete = 'oui';

  const depart = [Number(conteneur.dataset.latitude), Number(conteneur.dataset.longitude)];
  const carte = L.map(conteneur).setView(depart, 17);

  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '© OpenStreetMap',
  }).addTo(carte);

  const point = L.marker(depart, { draggable: true }).addTo(carte);
  point.bindTooltip('Glissez-moi', { permanent: false });

  const posent = (lat, lon, origine) => {
    point.setLatLng([lat, lon]);
    carte.setView([lat, lon], Math.max(carte.getZoom(), 17));
    fiche.querySelector('input[name="latitude"]').value = lat;
    fiche.querySelector('input[name="longitude"]').value = lon;
    direPosition(fiche, origine);
  };

  point.on('dragend', () => {
    const { lat, lng } = point.getLatLng();
    posent(lat, lng, 'deplace');
  });

  // Le conteneur vient d'apparaître : Leaflet doit remesurer sa taille.
  window.setTimeout(() => carte.invalidateSize(), 60);

  fiche.dataset.carteInstallee = 'oui';
  fiche.__posent = posent;
  fiche.__depart = depart;
  direPosition(fiche, 'initial');
}

/** Dit où en est le point, en français et sans chiffre technique. */
function direPosition(fiche, origine) {
  const zone = fiche.querySelector('[data-role="etat-position"]');
  if (!zone) return;

  const depart = fiche.__depart;
  const lat = Number(fiche.querySelector('input[name="latitude"]').value);
  const lon = Number(fiche.querySelector('input[name="longitude"]').value);
  const ecart = Math.round(distanceEnMetres(depart[0], depart[1], lat, lon));

  if (origine === 'initial' || ecart === 0) {
    zone.textContent = 'Point enregistré actuellement.';
    zone.className = 'etat-position';
    return;
  }

  zone.textContent =
    origine === 'adresse'
      ? `Point déplacé sur l'adresse choisie, à ${ecart} m de l'ancien. Enregistrez pour valider.`
      : `Point déplacé à la main, à ${ecart} m de l'ancien. Enregistrez pour valider.`;
  zone.className = 'etat-position modifie';
}

/** Cherche l'adresse saisie et propose les résultats. */
async function chercherAdresse(fiche) {
  const zone = fiche.querySelector('[data-role="propositions"]');
  const adresse = fiche.querySelector('input[name="adresse"]').value.trim();

  zone.hidden = false;
  zone.innerHTML = '<span class="propositions-etat">Recherche…</span>';

  try {
    const { adresses } = await api(`/admin/adresses?q=${encodeURIComponent(adresse)}`);

    if (adresses.length === 0) {
      zone.innerHTML =
        '<span class="propositions-etat">Aucune adresse trouvée. Essayez une écriture plus complète, ou placez le point à la main sur la carte.</span>';
      return;
    }

    zone.innerHTML = adresses
      .map(
        (a) => `
        <button type="button" class="proposition"
                data-latitude="${a.latitude}" data-longitude="${a.longitude}">
          ${escapeHtml(a.resume)}
        </button>`,
      )
      .join('');
  } catch (erreur) {
    zone.innerHTML = `<span class="propositions-etat ko">${escapeHtml(erreur.message)}</span>`;
  }
}

// Un seul écouteur pour toute la liste : les fiches sont reconstruites à
// chaque rechargement, des écouteurs posés sur chacune s'accumuleraient.
document.getElementById('liste-commerces').addEventListener('click', async (evenement) => {
  const fiche = evenement.target.closest('.fiche');
  if (!fiche) return;

  if (evenement.target.closest('[data-chercher-adresse]')) {
    await chercherAdresse(fiche);
    return;
  }

  const proposition = evenement.target.closest('.proposition');
  if (proposition && fiche.__posent) {
    fiche.__posent(
      Number(proposition.dataset.latitude),
      Number(proposition.dataset.longitude),
      'adresse',
    );
    fiche.querySelector('[data-role="propositions"]').hidden = true;
  }
});

// La carte se construit quand la fiche s'ouvre, pas avant.
document.getElementById('liste-commerces').addEventListener(
  'toggle',
  (evenement) => {
    if (evenement.target.matches('.fiche') && evenement.target.open) {
      installerCarte(evenement.target);
    }
  },
  true,
);

// --- Commerces -------------------------------------------------------------


async function chargerCommerces() {
  const commerces = await api('/admin/commerces');
  document.getElementById('compte-commerces').textContent =
    `${commerces.length} établissement${commerces.length > 1 ? 's' : ''}`;

  document.getElementById('liste-commerces').innerHTML = commerces
    .map((commerce) =>
      fiche({
        id: commerce.id,
        nom: `<span class="ligne-avec-avatar">${pastilleAvatar(commerce.nom, urlPhoto('commerce', commerce.id, commerce.photoVersion), 'petit')}<span class="corps">${escapeHtml(commerce.nom)}</span></span>`,
        meta: `${commerce.nombreVisites} visite${commerce.nombreVisites > 1 ? 's' : ''} · ${escapeHtml(commerce.proprietaireEmail)}`,
        champs: [
          champTexte('nom', 'Nom', commerce.nom, { large: true, requis: true }),
          champAdresse(commerce),
          champTexte('typeEtablissement', "Type d'établissement", commerce.typeEtablissement),
          champTexte('capaciteEstimee', 'Capacité estimée', commerce.capaciteEstimee, {
            type: 'number',
            min: 1,
          }),
          champTexte('noteGoogle', 'Note Google (sur 5)', commerce.noteGoogle, {
            type: 'number',
            step: '0.1',
            min: 0,
            max: 5,
          }),
          champPosition(commerce),
        ].join(''),
        // On ne supprime pas un commerce depuis ici : ses visites, ses
        // missions, ses événements et ses mouvements de jetons y renvoient.
        suppression: {
          possible: false,
          raison:
            "Un commerce ne se supprime pas depuis cet écran : ses visites, missions et mouvements de jetons y renvoient.",
        },
      }),
    )
    .join('');
}

// --- Missions --------------------------------------------------------------

async function chargerMissions() {
  const mots = await chargerVocabulaire();
  const recherche = document.getElementById('recherche-missions').value.trim();
  const missions = await api(
    `/admin/missions${recherche ? `?recherche=${encodeURIComponent(recherche)}` : ''}`,
  );

  document.getElementById('compte-missions').textContent =
    `${missions.length} mission${missions.length > 1 ? 's' : ''}`;

  document.getElementById('liste-missions').innerHTML = missions
    .map((mission) => {
      const jouee = mission.nombreFois > 0;
      const origine = mission.lieuNom ? escapeHtml(mission.lieuNom) : 'Catalogue';

      // Les missions du catalogue portent un identifiant lisible (EXP-001) :
      // il est utile, on l'affiche. Celles créées par un commerçant portent un
      // identifiant technique de 36 caractères, qui ne dit rien à personne et
      // mange toute la ligne. On le garde pour la recherche, pas pour l'œil.
      const reference = mission.id.length <= 12 ? `${escapeHtml(mission.id)} · ` : '';

      return fiche({
        id: mission.id,
        nom: `${escapeHtml(mission.titre)} ${jouee ? `<span class="pastille-joue">jouée ${mission.nombreFois}×</span>` : ''}`,
        meta: `${reference}${origine} · ${mission.recompenseBase} jetons`,
        champs: [
          champTexte('titre', 'Titre', mission.titre, { large: true, requis: true }),
          champZoneTexte('description', 'Description', mission.description),
          champListe('archetypeDominant', 'Archétype', mots.archetypes, mission.archetypeDominant),
          champListe('duree', 'Durée', mots.durees, mission.duree),
          champListe('theme', 'Thème', mots.themes, mission.theme),
          champListe('modeInteraction', 'Mode', mots.modesInteraction, mission.modeInteraction),
          champTexte('recompenseBase', 'Récompense (jetons)', mission.recompenseBase, {
            type: 'number',
            step: '0.01',
            min: 0.01,
          }),
        ].join(''),
        suppression: jouee
          ? {
              possible: false,
              raison: `Déjà jouée ${mission.nombreFois} fois : la supprimer laisserait des trous dans les profils des joueurs.`,
            }
          : { possible: true },
      });
    })
    .join('');
}

document.getElementById('recherche-missions').addEventListener('input', () => {
  // On attend que la frappe se calme avant d'interroger le serveur.
  window.clearTimeout(chargerMissions.minuteur);
  chargerMissions.minuteur = window.setTimeout(chargerMissions, 250);
});

document.getElementById('form-mission').addEventListener('submit', async (evenement) => {
  evenement.preventDefault();
  const formulaire = evenement.target;
  const message = document.getElementById('message-creation');

  const valeurs = valeursDuFormulaire(formulaire);
  valeurs.recompenseBase = Number(valeurs.recompenseBase);

  try {
    const mission = await api('/admin/missions', {
      method: 'POST',
      body: JSON.stringify(valeurs),
    });
    message.textContent = `Mission ${mission.id} créée.`;
    message.className = 'message ok';
    formulaire.reset();
    await chargerMissions();
  } catch (erreur) {
    message.textContent = erreur.message;
    message.className = 'message ko';
  }
});

// --- Événements ------------------------------------------------------------

/** Une date au format attendu par <input type="datetime-local">. */
function pourChampDate(iso) {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  const pad = (n) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

async function chargerEvenements() {
  const evenements = await api('/admin/evenements');
  document.getElementById('compte-evenements').textContent =
    `${evenements.length} événement${evenements.length > 1 ? 's' : ''}`;

  document.getElementById('liste-evenements').innerHTML = evenements
    .map((evenement) =>
      fiche({
        id: evenement.id,
        nom: escapeHtml(evenement.titre),
        meta: `${escapeHtml(quand(evenement.dateDebut))} · ${escapeHtml(evenement.lieuNom)}`,
        champs: [
          champTexte('titre', 'Titre', evenement.titre, { large: true, requis: true }),
          champZoneTexte('description', 'Description', evenement.description),
          champTexte('dateDebut', 'Date et heure de début', pourChampDate(evenement.dateDebut), {
            type: 'datetime-local',
          }),
        ].join(''),
        suppression:
          evenement.nombreCampagnes > 0
            ? {
                possible: false,
                raison: `${evenement.nombreCampagnes} campagne(s) d'invitation y renvoient : des joueurs ont déjà été crédités.`,
              }
            : { possible: true },
      }),
    )
    .join('');
}

// Les listes déroulantes du formulaire de création, remplies au premier
// affichage de la page Missions.
async function remplirFormulaireCreation() {
  const mots = await chargerVocabulaire();
  document.querySelectorAll('#form-mission select[data-vocabulaire]').forEach((liste) => {
    liste.innerHTML = optionsDe(mots[liste.dataset.vocabulaire] || [], null);
  });
}

brancherListe('liste-commerces', {
  chemin: '/admin/commerces',
  recharger: chargerCommerces,
  nomPourConfirmation: (fiche) => fiche.querySelector('.nom').textContent.trim(),
});

brancherListe('liste-missions', {
  chemin: '/admin/missions',
  recharger: chargerMissions,
  nomPourConfirmation: (fiche) => `la mission « ${fiche.querySelector('.nom').textContent.trim()} »`,
});

brancherListe('liste-evenements', {
  chemin: '/admin/evenements',
  recharger: chargerEvenements,
  nomPourConfirmation: (fiche) => `l'événement « ${fiche.querySelector('.nom').textContent.trim()} »`,
});


// ===========================================================================
// Les comptes.
// ===========================================================================

const ETIQUETTES_TYPE = {
  particulier: 'Joueur',
  commercant: 'Commerçant',
};

function scoresProfil(profil) {
  if (!profil || !profil.questionnaireFait) {
    return '<p class="note-fiche">Questionnaire pas encore rempli : ce compte n\'a pas de profil de joueur.</p>';
  }

  const barres = [
    ['Explorateur', profil.explorateur],
    ['Accomplisseur', profil.accomplisseur],
    ['Compétiteur', profil.competiteur],
    ['Socialisateur', profil.socialisateur],
  ];

  return `
    <div class="profil-barres">
      ${barres
        .map(
          ([nom, valeur]) => `
        <div class="profil-barre">
          <span class="profil-nom">${escapeHtml(nom)}</span>
          <span class="profil-piste"><span class="profil-jauge" style="width:${Math.max(0, Math.min(100, valeur))}%"></span></span>
          <span class="profil-valeur">${Math.round(valeur)}</span>
        </div>`,
        )
        .join('')}
    </div>`;
}

function tableauMouvements(mouvements) {
  if (!mouvements || mouvements.length === 0) {
    return '<p class="note-fiche">Aucun mouvement de jetons.</p>';
  }

  return `
    <div class="enveloppe-table">
      <table class="table-journal">
        <thead><tr><th>Quand</th><th>Quoi</th><th class="a-droite">Montant</th></tr></thead>
        <tbody>
          ${mouvements
            .map(
              (m) => `
            <tr>
              <td class="quand">${escapeHtml(quand(m.createdAt))}</td>
              <td>
                ${escapeHtml(m.libelle)}
                ${m.detail ? `<span class="detail-mouvement">${escapeHtml(m.detail)}</span>` : ''}
              </td>
              <td class="a-droite montant ${m.sens === 'entree' ? 'entree' : 'sortie'}">
                ${m.sens === 'entree' ? '+' : '−'}${m.montant}
              </td>
            </tr>`,
            )
            .join('')}
        </tbody>
      </table>
    </div>`;
}

async function ouvrirCompte(fiche) {
  const corps = fiche.querySelector('.fiche-corps');
  if (corps.dataset.charge === 'oui') return;
  corps.dataset.charge = 'oui';
  corps.innerHTML = '<p class="note-fiche">Chargement…</p>';

  try {
    const d = await api(`/admin/comptes/${encodeURIComponent(fiche.dataset.id)}`);
    const joueur = d.compte.type === 'particulier';

    corps.innerHTML = `
      <div class="colonnes-fiche">
        <div>
          <h3>Le compte</h3>
          <dl class="details">
            <dt>Email</dt><dd>${escapeHtml(d.compte.email)}</dd>
            <dt>Type</dt><dd>${escapeHtml(ETIQUETTES_TYPE[d.compte.type] || d.compte.type)}</dd>
            <dt>Inscrit le</dt><dd>${escapeHtml(quand(d.compte.createdAt))}</dd>
            ${d.etablissement ? `<dt>Établissement</dt><dd>${escapeHtml(d.etablissement.nom)}</dd>` : ''}
            ${
              joueur
                ? `<dt>Activité</dt><dd>${d.activite.visites} visite(s), ${d.activite.validations} mission(s) soumise(s)</dd>`
                : ''
            }
            ${
              d.progression
                ? `<dt>Progression</dt><dd>niveau ${d.progression.niveau}, ${d.progression.xpTotal} XP</dd>`
                : ''
            }
          </dl>

          <h3>Administration</h3>
          <p class="note-fiche">
            ${
              d.compte.administrateur
                ? 'Ce compte a accès à cet espace et peut tout y modifier.'
                : "Ce compte n'a pas accès à cet espace."
            }
          </p>
          <button type="button" class="bouton-discret ${d.compte.administrateur ? 'bouton-danger' : ''}"
                  data-administration="${d.compte.administrateur ? 'retirer' : 'accorder'}">
            ${d.compte.administrateur ? "Retirer les droits d'administration" : 'Nommer administrateur'}
          </button>
          <span class="message" data-role="message-admin"></span>
        </div>

        <div>
          ${joueur ? '<h3>Profil de joueur</h3>' + scoresProfil(d.profil) : ''}
          <h3>Jetons — solde ${d.jetons.solde}</h3>
          ${tableauMouvements(d.jetons.mouvements)}
        </div>
      </div>`;
  } catch (erreur) {
    corps.dataset.charge = 'non';
    corps.innerHTML = `<p class="note-fiche ko">${escapeHtml(erreur.message)}</p>`;
  }
}

async function chargerComptes() {
  const recherche = document.getElementById('recherche-comptes').value.trim();
  const filtre = document.getElementById('filtre-comptes').value;

  const parametres = new URLSearchParams();
  if (recherche) parametres.set('recherche', recherche);
  if (filtre) parametres.set('type', filtre);

  const comptes = await api(`/admin/comptes${parametres.toString() ? `?${parametres}` : ''}`);
  document.getElementById('compte-comptes').textContent =
    `${comptes.length} compte${comptes.length > 1 ? 's' : ''}`;

  document.getElementById('liste-comptes').innerHTML = comptes
    .map((c) => {
      const marque = c.administrateur ? '<span class="pastille-admin">administrateur</span>' : '';
      const detail =
        c.type === 'commercant'
          ? escapeHtml(c.etablissement || '—')
          : `niveau ${c.niveau} · ${c.xpTotal} XP`;

      return `
        <details class="fiche" data-id="${escapeHtml(c.id)}">
          <summary class="fiche-entete">
            <span class="nom">
              <span class="ligne-avec-avatar">
                ${pastilleAvatar(c.pseudo, urlPhoto('joueur', c.id, c.photoVersion), 'petit')}
                <span class="corps">${escapeHtml(c.pseudo)} ${marque}</span>
              </span>
            </span>
            <span class="meta">${escapeHtml(ETIQUETTES_TYPE[c.type] || c.type)} · ${detail} · ${c.soldeJetons} jetons</span>
            <span class="chevron">▾</span>
          </summary>
          <div class="fiche-corps"></div>
        </details>`;
    })
    .join('');
}

document.getElementById('recherche-comptes').addEventListener('input', () => {
  window.clearTimeout(chargerComptes.minuteur);
  chargerComptes.minuteur = window.setTimeout(chargerComptes, 250);
});
document.getElementById('filtre-comptes').addEventListener('change', chargerComptes);

document.getElementById('liste-comptes').addEventListener(
  'toggle',
  (evenement) => {
    if (evenement.target.matches('.fiche') && evenement.target.open) {
      ouvrirCompte(evenement.target);
    }
  },
  true,
);

document.getElementById('liste-comptes').addEventListener('click', async (evenement) => {
  const bouton = evenement.target.closest('[data-administration]');
  if (!bouton) return;

  const fiche = bouton.closest('.fiche');
  const accorder = bouton.dataset.administration === 'accorder';
  const zone = fiche.querySelector('[data-role="message-admin"]');

  const qui = fiche.querySelector('.nom').textContent.trim();
  if (
    !window.confirm(
      accorder
        ? `Donner à ${qui} accès à tout cet espace d'administration ?`
        : `Retirer à ${qui} l'accès à cet espace ?`,
    )
  ) {
    return;
  }

  try {
    await api(`/admin/comptes/${encodeURIComponent(fiche.dataset.id)}/administrateur`, {
      method: 'POST',
      body: JSON.stringify({ accorder }),
    });
    await chargerComptes();
  } catch (erreur) {
    zone.textContent = erreur.message;
    zone.className = 'message ko';
  }
});

// ===========================================================================
// Le registre de jetons.
// ===========================================================================

// Les comptes du registre tels qu'on les nomme à l'écran. « commercant » est
// une valeur technique ; elle n'a rien à faire sous les yeux de quelqu'un.
const ETIQUETTES_COMPTE = {
  joueur: 'Joueur',
  commercant: 'Commerçant',
  plateforme: 'Compte de la plateforme',
  cause: 'Compte des causes',
};

const ETIQUETTES_TOTAUX = {
  joueurs: 'chez les joueurs',
  commercants: 'chez les commerçants',
  plateforme: 'à la plateforme',
  causes: 'reversés aux causes',
  enCirculation: 'en circulation',
};

function formulaireCorrection(ligne) {
  return `
    <form class="correction" data-compte="${escapeHtml(ligne.id)}">
      <div class="champs">
        <label>
          Sens
          <select name="sens">
            <option value="crediter">Créditer ce compte</option>
            <option value="retirer">Retirer de ce compte</option>
          </select>
        </label>
        <label>
          Montant (jetons)
          <input type="number" name="montant" min="0.01" step="0.01" required />
        </label>
        <label class="pleine-largeur">
          Raison de la correction
          <input type="text" name="raison" required minlength="5"
                 placeholder="Ex : invitation du 12 mars non créditée" />
        </label>
      </div>
      <div class="actions-fiche">
        <button type="submit">Enregistrer la correction</button>
        <span class="message" data-role="message"></span>
      </div>
    </form>`;
}

async function ouvrirCompteRegistre(fiche) {
  const corps = fiche.querySelector('.fiche-corps');
  if (corps.dataset.charge === 'oui') return;
  corps.dataset.charge = 'oui';
  corps.innerHTML = '<p class="note-fiche">Chargement…</p>';

  try {
    const d = await api(`/admin/registre/${encodeURIComponent(fiche.dataset.id)}/mouvements`);
    corps.innerHTML = `
      <h3>Corriger ce solde</h3>
      <p class="note-fiche">
        La correction s'écrit comme un mouvement : elle apparaîtra dans l'historique
        ci-dessous et dans le journal, avec votre nom et la raison que vous donnez.
      </p>
      ${formulaireCorrection({ id: fiche.dataset.id })}
      <h3>Historique</h3>
      ${tableauMouvements(d.mouvements)}`;
  } catch (erreur) {
    corps.dataset.charge = 'non';
    corps.innerHTML = `<p class="note-fiche ko">${escapeHtml(erreur.message)}</p>`;
  }
}

async function chargerJetons() {
  const e = await api('/admin/registre');

  document.getElementById('totaux-jetons').innerHTML = Object.entries(ETIQUETTES_TOTAUX)
    .map(
      ([cle, etiquette]) => `
      <div>
        <span class="valeur">${e.totaux[cle]}</span>
        <span class="etiquette">${escapeHtml(etiquette)}</span>
      </div>`,
    )
    .join('');

  const verdict = document.getElementById('verdict-registre');
  if (e.coherence.coherent) {
    verdict.textContent =
      'Registre cohérent : chaque solde correspond exactement à la somme de ses mouvements.';
    verdict.className = 'verdict-registre ok';
  } else {
    verdict.textContent = `Écart détecté sur ${e.coherence.ecarts.length} compte(s). Un solde ne correspond plus à ses mouvements — à examiner avant toute autre opération.`;
    verdict.className = 'verdict-registre ko';
  }

  document.getElementById('liste-registre').innerHTML = e.lignes
    .map(
      (l) => `
      <details class="fiche" data-id="${escapeHtml(l.id)}">
        <summary class="fiche-entete">
          <span class="nom">${escapeHtml(l.nom)}</span>
          <span class="meta">${escapeHtml(ETIQUETTES_COMPTE[l.type] || l.type)} · ${l.solde} jetons</span>
          <span class="chevron">▾</span>
        </summary>
        <div class="fiche-corps"></div>
      </details>`,
    )
    .join('');
}

document.getElementById('liste-registre').addEventListener(
  'toggle',
  (evenement) => {
    if (evenement.target.matches('.fiche') && evenement.target.open) {
      ouvrirCompteRegistre(evenement.target);
    }
  },
  true,
);

document.getElementById('liste-registre').addEventListener('submit', async (evenement) => {
  evenement.preventDefault();
  const formulaire = evenement.target;
  if (!formulaire.matches('.correction')) return;

  const valeurs = valeursDuFormulaire(formulaire);
  const zone = formulaire.querySelector('[data-role="message"]');

  // Toucher à l'argent de quelqu'un mérite une confirmation qui nomme ce
  // qu'on s'apprête à faire, pas un « êtes-vous sûr ? ».
  const verbe = valeurs.sens === 'retirer' ? 'Retirer' : 'Créditer';
  const nom = formulaire.closest('.fiche').querySelector('.nom').textContent.trim();
  if (!window.confirm(`${verbe} ${valeurs.montant} jeton(s) sur « ${nom} » ?`)) {
    return;
  }

  try {
    const resultat = await api('/admin/registre/correction', {
      method: 'POST',
      body: JSON.stringify({
        compteId: formulaire.dataset.compte,
        sens: valeurs.sens,
        montant: Number(valeurs.montant),
        raison: valeurs.raison,
      }),
    });
    zone.textContent = `Fait. Nouveau solde : ${resultat.solde} jetons.`;
    zone.className = 'message ok';
    formulaire.reset();
    await chargerJetons();
  } catch (erreur) {
    zone.textContent = erreur.message;
    zone.className = 'message ko';
  }
});

// --- Démarrage -------------------------------------------------------------



async function demarrer() {
  let moi;
  try {
    moi = await api('/admin/moi');
  } catch (erreur) {
    // 401 : pas connecté. 403 : connecté, mais pas administrateur — et c'est
    // une information utile, sinon on reste devant un formulaire qui « ne
    // marche pas » sans comprendre pourquoi.
    montrerConnexion(
      erreur.statut === 403
        ? "Ce compte n'a pas les droits d'administration."
        : '',
    );
    return;
  }

  document.getElementById('ecran-connexion').hidden = true;
  document.getElementById('shell').hidden = false;
  document.getElementById('identite').textContent = moi.email;

  afficherSection(sectionDemandee());
}

demarrer();
