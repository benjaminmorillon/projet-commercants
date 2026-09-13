// ---------------------------------------------------------------------------
// Activation des notifications hors de l'appli.
//
// Trois choses doivent s'aligner : le navigateur doit savoir le faire, la
// personne doit donner son accord, et le serveur doit connaître l'adresse de
// ce navigateur-là. Tout se passe ici.
// ---------------------------------------------------------------------------

const PUSH_SUPPORTE =
  'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;

// La clé publique arrive en base64 « URL-safe » ; l'API du navigateur la
// veut en octets bruts.
function base64EnOctets(base64) {
  const complete = (base64 + '='.repeat((4 - (base64.length % 4)) % 4))
    .replace(/-/g, '+')
    .replace(/_/g, '/');
  const binaire = atob(complete);
  return Uint8Array.from(binaire, (c) => c.charCodeAt(0));
}

async function etatPush() {
  if (!PUSH_SUPPORTE) {
    return { supporte: false, actif: false, refuse: false };
  }
  const enregistrement = await navigator.serviceWorker.getRegistration();
  const abonnement = await enregistrement?.pushManager.getSubscription();
  return {
    supporte: true,
    actif: Boolean(abonnement),
    refuse: Notification.permission === 'denied',
  };
}

async function activerPush() {
  if (!PUSH_SUPPORTE) {
    throw new Error("Ce navigateur ne sait pas recevoir de notifications hors de l'appli.");
  }

  const permission = await Notification.requestPermission();
  if (permission !== 'granted') {
    throw new Error(
      'Notifications refusées. Tu peux revenir sur ce choix dans les réglages du navigateur.',
    );
  }

  const enregistrement = await navigator.serviceWorker.register('sw.js');
  await navigator.serviceWorker.ready;

  const reponse = await fetch('/notifications/push/cle');
  if (!reponse.ok) {
    throw new Error('Connecte-toi pour activer les notifications.');
  }
  const { clePublique } = await reponse.json();

  const abonnement = await enregistrement.pushManager.subscribe({
    // Obligatoire : on s'engage à ce que chaque message envoyé soit visible
    // par la personne, jamais un message silencieux.
    userVisibleOnly: true,
    applicationServerKey: base64EnOctets(clePublique),
  });

  const envoi = await fetch('/notifications/push/abonnement', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(abonnement.toJSON()),
  });
  if (!envoi.ok) {
    throw new Error("L'abonnement n'a pas pu être enregistré.");
  }
}

async function desactiverPush() {
  const enregistrement = await navigator.serviceWorker.getRegistration();
  const abonnement = await enregistrement?.pushManager.getSubscription();
  if (!abonnement) {
    return;
  }
  await fetch('/notifications/push/abonnement', {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ endpoint: abonnement.endpoint }),
  }).catch(() => null);
  await abonnement.unsubscribe();
}
