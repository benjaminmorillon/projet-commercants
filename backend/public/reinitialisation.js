// Page atteinte depuis le lien reçu par email : le jeton est dans l'adresse.
const jeton = new URLSearchParams(window.location.search).get('jeton');

const formulaire = document.getElementById('reinit-form');
const erreur = document.getElementById('reinit-erreur');

if (!jeton) {
  document.getElementById('carte-formulaire').hidden = true;
  document.getElementById('carte-lien-invalide').hidden = false;
}

formulaire.addEventListener('submit', async (evenement) => {
  evenement.preventDefault();
  erreur.hidden = true;

  const reponse = await fetch('/auth/reinitialiser', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      jeton,
      motDePasse: document.getElementById('mot-de-passe').value,
    }),
  });
  const donnees = await reponse.json().catch(() => ({}));

  if (!reponse.ok) {
    erreur.textContent = Array.isArray(donnees.message)
      ? donnees.message.join(', ')
      : donnees.message || 'Une erreur est survenue.';
    erreur.hidden = false;
    return;
  }

  // Le serveur a ouvert une session : on repart sur le profil.
  localStorage.setItem('playerId', donnees.id);
  window.location.href = donnees.type === 'commercant' ? 'commercant.html' : 'index.html';
});
