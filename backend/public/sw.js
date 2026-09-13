// Service worker : le petit programme que le navigateur garde en vie même
// quand l'appli est fermée. C'est lui qui affiche les notifications reçues.

self.addEventListener('push', (evenement) => {
  let charge = { titre: 'Projet Commerçant', corps: '', lien: 'index.html' };
  try {
    charge = { ...charge, ...evenement.data.json() };
  } catch {
    // Message sans contenu lisible : on affiche quand même quelque chose.
  }

  evenement.waitUntil(
    self.registration.showNotification(charge.titre, {
      body: charge.corps,
      icon: 'icone-192.png',
      badge: 'icone-192.png',
      tag: charge.id,
      data: { lien: charge.lien },
    }),
  );
});

// Cliquer sur la notification ouvre la bonne page, ou revient sur l'onglet
// déjà ouvert plutôt que d'en ouvrir un deuxième.
self.addEventListener('notificationclick', (evenement) => {
  evenement.notification.close();
  const lien = evenement.notification.data?.lien ?? 'index.html';
  const cible = new URL(lien, self.location.origin).href;

  evenement.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((fenetres) => {
      for (const fenetre of fenetres) {
        if (fenetre.url === cible && 'focus' in fenetre) {
          return fenetre.focus();
        }
      }
      return self.clients.openWindow(cible);
    }),
  );
});
