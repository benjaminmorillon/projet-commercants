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

const SECTIONS = ['tableau-de-bord', 'commerces', 'missions', 'evenements', 'reglages', 'journal'];

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

// --- Commerces -------------------------------------------------------------

async function chargerCommerces() {
  const commerces = await api('/admin/commerces');
  document.getElementById('compte-commerces').textContent =
    `${commerces.length} établissement${commerces.length > 1 ? 's' : ''}`;

  document.getElementById('liste-commerces').innerHTML = commerces
    .map((commerce) =>
      fiche({
        id: commerce.id,
        nom: escapeHtml(commerce.nom),
        meta: `${commerce.nombreVisites} visite${commerce.nombreVisites > 1 ? 's' : ''} · ${escapeHtml(commerce.proprietaireEmail)}`,
        champs: [
          champTexte('nom', 'Nom', commerce.nom, { large: true, requis: true }),
          champTexte('adresse', 'Adresse', commerce.adresse, { large: true, requis: true }),
          champTexte('typeEtablissement', "Type d'établissement", commerce.typeEtablissement),
          champTexte('capaciteEstimee', 'Capacité estimée', commerce.capaciteEstimee, {
            type: 'number',
            min: 1,
          }),
          champTexte('latitude', 'Latitude', commerce.latitude, {
            type: 'number',
            step: 'any',
            min: -90,
            max: 90,
          }),
          champTexte('longitude', 'Longitude', commerce.longitude, {
            type: 'number',
            step: 'any',
            min: -180,
            max: 180,
          }),
          champTexte('noteGoogle', 'Note Google (sur 5)', commerce.noteGoogle, {
            type: 'number',
            step: '0.1',
            min: 0,
            max: 5,
          }),
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
