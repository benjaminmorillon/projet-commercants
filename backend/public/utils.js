// ---------------------------------------------------------------------------
// Note sur `localStorage.playerId` / `localStorage.businessId`
//
// Ce n'est PAS ce qui prouve qui on est. L'identité tient dans le cookie de
// session, que le JavaScript de la page ne peut même pas lire, et le serveur
// refuse toute requête qui agirait au nom de quelqu'un d'autre. Ces deux
// valeurs ne servent qu'à une chose : éviter à la page de redemander « et moi,
// je suis qui ? » à chaque chargement. Les effacer ou les bricoler ne donne
// accès à rien.
// ---------------------------------------------------------------------------

// Échappe du texte avant de l'insérer dans du HTML (innerHTML), pour éviter
// qu'un titre/commentaire saisi par un commerçant ou un joueur ne soit
// interprété comme du code (injection XSS).
function escapeHtml(value) {
  if (value === null || value === undefined) {
    return '';
  }
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
