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

const SECTIONS = ['tableau-de-bord', 'reglages', 'journal'];

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
