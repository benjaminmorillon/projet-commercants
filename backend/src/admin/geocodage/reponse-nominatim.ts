// ---------------------------------------------------------------------------
// Lire la réponse du service de recherche d'adresses.
//
// C'est la partie qui casse en premier quand un service distant change : on
// l'isole ici, en fonction pure, pour pouvoir la tester sans réseau.
//
// Le service employé est Nominatim (celui d'OpenStreetMap). Il renvoie un
// tableau d'adresses candidates, chacune avec ses coordonnées en TEXTE — et
// c'est justement le genre de détail qui fait tomber une application quand on
// l'oublie.
// ---------------------------------------------------------------------------

export interface Adresse {
  /** L'adresse telle qu'on la montre à l'écran. */
  libelle: string;
  latitude: number;
  longitude: number;
}

/** Une réponse brute, telle que Nominatim l'envoie. */
interface LigneNominatim {
  lat?: unknown;
  lon?: unknown;
  display_name?: unknown;
  [autre: string]: unknown;
}

function nombreValide(brut: unknown, min: number, max: number): number | null {
  if (typeof brut === 'number') {
    return Number.isFinite(brut) && brut >= min && brut <= max ? brut : null;
  }

  // Nominatim envoie « 48.8601 », pas 48.8601.
  //
  // Le test du vide n'est PAS une précaution de principe : `Number('')` vaut
  // zéro, et zéro est une longitude parfaitement valide — au large de
  // l'Afrique. Une coordonnée manquante placerait donc le commerce dans
  // l'océan sans que rien ne proteste.
  if (typeof brut !== 'string') {
    return null;
  }
  const texte = brut.trim();
  if (texte === '') {
    return null;
  }

  const valeur = Number(texte);
  if (!Number.isFinite(valeur) || valeur < min || valeur > max) {
    return null;
  }
  return valeur;
}

/**
 * Les adresses exploitables d'une réponse.
 *
 * Tout ce qui est incomplet ou aberrant est écarté silencieusement : mieux
 * vaut proposer trois adresses sûres que cinq dont deux placeraient le
 * commerce dans l'océan.
 */
export function lireAdresses(brut: unknown, combien = 5): Adresse[] {
  if (!Array.isArray(brut)) {
    return [];
  }

  const adresses: Adresse[] = [];

  for (const ligne of brut as LigneNominatim[]) {
    if (!ligne || typeof ligne !== 'object') continue;

    const latitude = nombreValide(ligne.lat, -90, 90);
    const longitude = nombreValide(ligne.lon, -180, 180);
    const libelle = typeof ligne.display_name === 'string' ? ligne.display_name.trim() : '';

    if (latitude === null || longitude === null || libelle === '') {
      continue;
    }

    adresses.push({ libelle, latitude, longitude });
    if (adresses.length >= combien) break;
  }

  return adresses;
}

/**
 * Raccourcit l'adresse pour l'affichage.
 *
 * Nominatim répond « 12, Rue de Turenne, Quartier des Archives, Paris 3e
 * Arrondissement, Paris, Île-de-France, France métropolitaine, 75003, France ».
 * Personne n'a besoin de lire ça en entier pour reconnaître son commerce : on
 * garde le début (le numéro et la rue) et la fin utile (le code postal et la
 * ville), et on jette l'administratif du milieu.
 */
export function abreger(libelle: string): string {
  const morceaux = libelle
    .split(',')
    .map((m) => m.trim())
    .filter(Boolean);

  if (morceaux.length <= 4) {
    return morceaux.join(', ');
  }

  // Le code postal français est un bloc de 5 chiffres : quand on le trouve,
  // il donne le bon point de coupe pour la fin.
  const indexCodePostal = morceaux.findIndex((m) => /^\d{5}$/.test(m));
  const fin =
    indexCodePostal > 0
      ? [morceaux[indexCodePostal], morceaux[indexCodePostal - 1]].join(' ')
      : morceaux[morceaux.length - 1];

  return `${morceaux.slice(0, 2).join(', ')} — ${fin}`;
}
