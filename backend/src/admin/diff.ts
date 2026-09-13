// ---------------------------------------------------------------------------
// Ce qui a changé, et comment le raconter.
//
// Quand on modifie un commerce ou une mission depuis le back-office, le
// formulaire renvoie TOUS les champs, y compris ceux auxquels on n'a pas
// touché. Écrire « 7 champs modifiés » au journal alors qu'on a seulement
// corrigé une faute de frappe le rendrait inutile.
//
// Ces fonctions sont pures : elles comparent deux objets et rendent du texte.
// Aucune base de données, donc faciles à tester.
// ---------------------------------------------------------------------------

export interface Changement {
  champ: string;
  /** Le nom lisible du champ, tel qu'il apparaît dans le journal. */
  libelle: string;
  avant: unknown;
  apres: unknown;
}

/** Le nom lisible de chaque champ modifiable, par entité. */
export type Libelles = Record<string, string>;

function egal(a: unknown, b: unknown): boolean {
  // `null` et `undefined` veulent dire la même chose ici : « rien ».
  if (a === null || a === undefined) return b === null || b === undefined;
  if (b === null || b === undefined) return false;

  // Les dates arrivent en texte depuis le formulaire et en objet Date depuis
  // la base : on les compare sur l'instant, pas sur la représentation.
  if (a instanceof Date || b instanceof Date) {
    const ta = new Date(a as string | Date).getTime();
    const tb = new Date(b as string | Date).getTime();
    return Number.isNaN(ta) && Number.isNaN(tb) ? String(a) === String(b) : ta === tb;
  }

  if (typeof a === 'number' || typeof b === 'number') {
    return Number(a) === Number(b);
  }

  return String(a) === String(b);
}

/**
 * Compare l'existant aux valeurs soumises, en ne regardant que les champs
 * effectivement présents dans la soumission.
 */
export function changements(
  existant: Record<string, unknown>,
  soumis: Record<string, unknown>,
  libelles: Libelles,
): Changement[] {
  const resultat: Changement[] = [];

  for (const champ of Object.keys(libelles)) {
    if (!(champ in soumis) || soumis[champ] === undefined) {
      continue;
    }
    if (egal(existant[champ], soumis[champ])) {
      continue;
    }
    resultat.push({
      champ,
      libelle: libelles[champ],
      avant: existant[champ],
      apres: soumis[champ],
    });
  }

  return resultat;
}

// « 2026-12-24T20:00 » est une écriture de machine. Les deux côtés d'une
// comparaison doivent s'afficher pareil, sinon on croit lire un changement
// de format là où seule l'heure a bougé.
const ECRITURE_MACHINE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/;

function afficher(valeur: unknown): string {
  if (valeur === null || valeur === undefined || valeur === '') return '(vide)';
  if (valeur instanceof Date) return valeur.toISOString().slice(0, 16).replace('T', ' ');

  const texte = String(valeur);
  if (ECRITURE_MACHINE.test(texte)) {
    return texte.slice(0, 16).replace('T', ' ');
  }
  // Un texte long (une description) rendrait le journal illisible : on le
  // coupe, la valeur complète reste dans les colonnes avant/après.
  return texte.length > 60 ? `${texte.slice(0, 57)}…` : texte;
}

/** La phrase du journal : « Le Café des Arts — capacité : 50 → 80 ». */
export function resumer(sujet: string, liste: Changement[]): string {
  if (liste.length === 0) {
    return `${sujet} — aucune modification`;
  }

  const details = liste
    .map((c) => `${c.libelle} : ${afficher(c.avant)} → ${afficher(c.apres)}`)
    .join(' ; ');

  return `${sujet} — ${details}`;
}
