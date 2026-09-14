import { motsDe, pertinence, TextesPublicite } from './recherche';

describe('motsDe', () => {
  it('découpe une phrase en mots comparables', () => {
    expect(motsDe('Pizza au feu de bois')).toEqual(['pizza', 'feu', 'bois']);
  });

  // Personne ne cherche l'accent circonflexe sur un téléphone.
  it('ignore les accents', () => {
    expect(motsDe('Crêperie bretonne')).toEqual(['creperie', 'bretonne']);
    expect(motsDe('Côté déjeuner')).toEqual(['cote', 'dejeuner']);
  });

  it('écarte les mots vides et les mots trop courts', () => {
    expect(motsDe('le menu du midi')).toEqual(['menu', 'midi']);
    expect(motsDe('a b cd')).toEqual([]);
  });

  it('sépare sur la ponctuation et les tirets', () => {
    expect(motsDe('coupe-cheveux, barbe : 20€')).toEqual(['coupe', 'cheveux', 'barbe']);
  });

  it('ne casse pas sur du vide', () => {
    expect(motsDe('')).toEqual([]);
    expect(motsDe(null as unknown as string)).toEqual([]);
  });
});

const pizzeria: TextesPublicite = {
  titre: 'Le midi, la pizza à 9 euros',
  motsCles: 'pizza, pizzeria, italien, restaurant',
  description: 'Toutes nos pizzas au feu de bois à 9 euros du lundi au vendredi entre midi et 14h.',
  nomDuCommerce: 'Chez Marco',
};

const coiffeur: TextesPublicite = {
  titre: 'Coupe et barbe',
  motsCles: 'coiffeur, coupe, barbe, cheveux',
  description: 'Coupe homme et taille de barbe, sans rendez-vous.',
  nomDuCommerce: 'Barbier du Marais',
};

describe('pertinence', () => {
  it('trouve par le mot-clé du commerçant', () => {
    expect(pertinence(pizzeria, 'pizza')).toBeGreaterThan(0);
    expect(pertinence(coiffeur, 'pizza')).toBe(0);
  });

  it('trouve par le nom du commerce', () => {
    expect(pertinence(pizzeria, 'marco')).toBeGreaterThan(0);
  });

  // Une recherche qui rend des résultats hors sujet détruit la confiance :
  // on préfère une liste vide.
  it('rend zéro quand rien ne correspond', () => {
    expect(pertinence(pizzeria, 'réparation de vélo')).toBe(0);
    expect(pertinence(pizzeria, '')).toBe(0);
    expect(pertinence(pizzeria, 'le du de')).toBe(0);
  });

  it('classe le mot-clé au-dessus de la description', () => {
    const parMotCle = pertinence(coiffeur, 'coiffeur');
    const parDescription = pertinence(coiffeur, 'rendez-vous');
    expect(parMotCle).toBeGreaterThan(parDescription);
  });

  it('accepte un début de mot, mais compte moins', () => {
    const exact = pertinence(pizzeria, 'pizza');
    const debut = pertinence(pizzeria, 'pizz');
    expect(debut).toBeGreaterThan(0);
    expect(debut).toBeLessThan(exact);
  });

  it('trouve le singulier depuis le pluriel et l’inverse', () => {
    expect(pertinence(coiffeur, 'cheveu')).toBeGreaterThan(0);
    expect(pertinence(pizzeria, 'pizzas')).toBeGreaterThan(0);
  });

  it('additionne quand plusieurs mots correspondent', () => {
    const unMot = pertinence(coiffeur, 'coupe');
    const deuxMots = pertinence(coiffeur, 'coupe barbe');
    expect(deuxMots).toBeGreaterThan(unMot);
  });

  it('classe la meilleure réponse en premier', () => {
    const resultats = [pizzeria, coiffeur]
      .map((t) => ({ t, score: pertinence(t, 'barbe') }))
      .sort((a, b) => b.score - a.score);
    expect(resultats[0].t.nomDuCommerce).toBe('Barbier du Marais');
    expect(resultats[1].score).toBe(0);
  });
});
