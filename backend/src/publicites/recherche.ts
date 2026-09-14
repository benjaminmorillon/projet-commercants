// ---------------------------------------------------------------------------
// Retrouver une publicité à partir de ce qu'on cherche.
//
// Un joueur tape « pizza », « coupe de cheveux », « réparation vélo » — et
// doit tomber sur les commerces qui en font. Pas sur une correspondance de
// caractères : sur des MOTS.
//
// Tout est ici en fonctions pures, sans base de données : c'est la partie qui
// décide de ce qu'on voit, elle doit pouvoir être testée mot à mot.
// ---------------------------------------------------------------------------

/**
 * Les mots vides : ils n'apportent rien à une recherche et, laissés en place,
 * feraient remonter n'importe quoi (« de » apparaît dans toutes les annonces).
 */
const MOTS_VIDES = new Set([
  'le', 'la', 'les', 'un', 'une', 'des', 'du', 'de', 'd', 'l',
  'et', 'ou', 'a', 'au', 'aux', 'en', 'dans', 'sur', 'pour', 'par',
  'avec', 'sans', 'chez', 'ce', 'cet', 'cette', 'ces', 'mon', 'ma', 'mes',
  'est', 'sont', 'plus', 'tout', 'tous', 'toute', 'toutes',
]);

/** La longueur minimale d'un mot retenu. « ok » ou « vs » ne cherchent rien. */
const LONGUEUR_MINIMALE = 3;

/**
 * Découpe un texte en mots comparables.
 *
 * On enlève les accents : quelqu'un qui tape « creperie » doit trouver
 * « Crêperie ». Sur un téléphone, personne ne va chercher l'accent circonflexe.
 */
export function motsDe(texte: string): string[] {
  return String(texte ?? '')
    .toLowerCase()
    .normalize('NFD')
    // Retire les signes diacritiques (accents, cédilles) laissés par NFD.
    .replace(/[̀-ͯ]/g, '')
    .split(/[^a-z0-9]+/)
    .filter((mot) => mot.length >= LONGUEUR_MINIMALE && !MOTS_VIDES.has(mot));
}

/** Ce qu'on cherche dans une publicité, découpé une fois pour toutes. */
export interface TextesPublicite {
  titre: string;
  motsCles: string;
  description: string;
  nomDuCommerce: string;
}

/**
 * À quel point une publicité répond à une recherche.
 *
 * Le score n'a pas de sens absolu : il ne sert qu'à classer. Ce qui compte,
 * c'est l'ORDRE des poids :
 *
 *  - les mots-clés du commerçant pèsent le plus. C'est là qu'il écrit ce
 *    qu'il vend ; c'est le champ fait pour être cherché ;
 *  - le titre ensuite ;
 *  - le nom du commerce, pour que « chez Paul » trouve la boulangerie Paul ;
 *  - la description en dernier : elle est longue, et un mot qui y traîne
 *    ne veut pas dire que l'annonce parle de ça.
 *
 * Une publicité qui ne répond à AUCUN mot rend 0 : elle ne sera pas montrée.
 * On préfère une liste vide à une liste hors sujet — c'est ce qui fait qu'on
 * garde confiance dans une recherche.
 */
export function pertinence(textes: TextesPublicite, requete: string): number {
  const cherches = motsDe(requete);
  if (cherches.length === 0) {
    return 0;
  }

  const champs: [string[], number][] = [
    [motsDe(textes.motsCles), 10],
    [motsDe(textes.titre), 6],
    [motsDe(textes.nomDuCommerce), 4],
    [motsDe(textes.description), 1],
  ];

  let score = 0;
  for (const cherche of cherches) {
    for (const [mots, poids] of champs) {
      if (mots.includes(cherche)) {
        // Le mot exact : le poids plein.
        score += poids;
      } else if (mots.some((mot) => mot.startsWith(cherche) || cherche.startsWith(mot))) {
        // Un début commun : « pizz » trouve « pizzeria », « boulanger »
        // trouve « boulangerie ». Compté moitié moins, parce que c'est une
        // supposition, pas une correspondance.
        score += poids / 2;
      }
    }
  }

  return score;
}
