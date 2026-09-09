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
