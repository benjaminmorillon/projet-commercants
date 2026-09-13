import { changements, resumer } from './diff';

const LIBELLES = {
  nom: 'nom',
  capaciteEstimee: 'capacité',
  noteGoogle: 'note Google',
  dateDebut: 'date de début',
};

describe('changements', () => {
  const existant = {
    nom: 'Le Café des Arts',
    capaciteEstimee: 50,
    noteGoogle: null,
    dateDebut: new Date('2026-04-10T18:00:00.000Z'),
  };

  it('ne retient que ce qui a vraiment changé', () => {
    const liste = changements(
      existant,
      { nom: 'Le Café des Arts', capaciteEstimee: 80 },
      LIBELLES,
    );
    expect(liste).toEqual([
      { champ: 'capaciteEstimee', libelle: 'capacité', avant: 50, apres: 80 },
    ]);
  });

  it('ignore les champs absents de la soumission', () => {
    expect(changements(existant, {}, LIBELLES)).toEqual([]);
  });

  // Le formulaire renvoie du texte, la base rend des nombres : sans cette
  // règle, « 50 » et 50 seraient vus comme une modification à chaque envoi.
  it('ne voit pas de changement entre le texte et le nombre équivalents', () => {
    expect(changements(existant, { capaciteEstimee: '50' }, LIBELLES)).toEqual([]);
  });

  it('compare les dates sur l’instant, pas sur leur écriture', () => {
    expect(changements(existant, { dateDebut: '2026-04-10T18:00:00.000Z' }, LIBELLES)).toEqual([]);
    expect(changements(existant, { dateDebut: '2026-04-11T18:00:00.000Z' }, LIBELLES)).toHaveLength(1);
  });

  it('traite null et undefined comme la même absence de valeur', () => {
    expect(changements(existant, { noteGoogle: null }, LIBELLES)).toEqual([]);
  });

  it('voit bien qu’on renseigne une valeur qui était vide', () => {
    const liste = changements(existant, { noteGoogle: 4.5 }, LIBELLES);
    expect(liste).toEqual([
      { champ: 'noteGoogle', libelle: 'note Google', avant: null, apres: 4.5 },
    ]);
  });

  it('ignore un champ qui ne fait pas partie des champs modifiables', () => {
    // `id` n'est pas dans LIBELLES : une soumission qui le contient ne doit
    // pas pouvoir le faire passer pour une modification légitime.
    expect(changements(existant, { id: 'autre-chose' }, LIBELLES)).toEqual([]);
  });
});

describe('resumer', () => {
  it('écrit une phrase lisible', () => {
    expect(
      resumer('Le Café des Arts', [
        { champ: 'capaciteEstimee', libelle: 'capacité', avant: 50, apres: 80 },
      ]),
    ).toBe('Le Café des Arts — capacité : 50 → 80');
  });

  it('sépare plusieurs changements', () => {
    expect(
      resumer('Le Café des Arts', [
        { champ: 'nom', libelle: 'nom', avant: 'A', apres: 'B' },
        { champ: 'capaciteEstimee', libelle: 'capacité', avant: 50, apres: 80 },
      ]),
    ).toBe('Le Café des Arts — nom : A → B ; capacité : 50 → 80');
  });

  it('écrit « (vide) » plutôt que « null »', () => {
    expect(
      resumer('X', [{ champ: 'noteGoogle', libelle: 'note', avant: null, apres: 4.5 }]),
    ).toBe('X — note : (vide) → 4.5');
  });

  it('coupe un texte long pour garder le journal lisible', () => {
    const long = 'a'.repeat(200);
    const phrase = resumer('X', [
      { champ: 'description', libelle: 'description', avant: 'court', apres: long },
    ]);
    expect(phrase).toContain('…');
    expect(phrase.length).toBeLessThan(100);
  });

  it('le dit quand rien n’a changé', () => {
    expect(resumer('Le Café des Arts', [])).toBe('Le Café des Arts — aucune modification');
  });
});

describe('affichage des dates dans le journal', () => {
  // Le formulaire renvoie « 2026-12-24T20:00 », la base rend un objet Date.
  // Les deux côtés doivent s'écrire pareil, sinon on croit lire un changement
  // de format là où seule l'heure a bougé.
  it('écrit les deux côtés d’un changement de date de la même façon', () => {
    const phrase = resumer('Événement « Matin lecture »', [
      {
        champ: 'dateDebut',
        libelle: 'date de début',
        avant: new Date('2026-09-19T20:00:00.000Z'),
        apres: '2026-12-24T20:00',
      },
    ]);
    expect(phrase).toBe(
      'Événement « Matin lecture » — date de début : 2026-09-19 20:00 → 2026-12-24 20:00',
    );
  });

  it('ne touche pas à un texte qui ressemble de loin à une date', () => {
    const phrase = resumer('X', [
      { champ: 'titre', libelle: 'titre', avant: 'a', apres: 'Soirée du 24-12-2026' },
    ]);
    expect(phrase).toContain('Soirée du 24-12-2026');
  });
});
