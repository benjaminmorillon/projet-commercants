import { verdictDAnnonce, libelleDisponibilite, ContexteAnnonce } from './annonce';

const base: ContexteAnnonce = {
  offreEnCours: true,
  dejaAnnoncee: false,
  joursDepuisDerniereAnnonce: null,
  delaiMinimalJours: 7,
  nombreDeClients: 12,
};

describe('annoncer une offre à ses clients', () => {
  it('accepte une offre en cours, jamais annoncée, avec des clients', () => {
    expect(verdictDAnnonce(base)).toEqual({ possible: true });
  });

  it("refuse une offre qui n'est plus en cours", () => {
    expect(verdictDAnnonce({ ...base, offreEnCours: false })).toMatchObject({
      possible: false,
      code: 'offre_terminee',
    });
  });

  it('refuse d’annoncer deux fois la même offre', () => {
    expect(verdictDAnnonce({ ...base, dejaAnnoncee: true })).toMatchObject({
      possible: false,
      code: 'deja_annoncee',
    });
  });

  it('refuse quand le commerce n’a encore aucun client', () => {
    expect(verdictDAnnonce({ ...base, nombreDeClients: 0 })).toMatchObject({
      possible: false,
      code: 'aucun_client',
    });
  });

  it('refuse une deuxième annonce trop rapprochée, et dit quand ce sera possible', () => {
    const verdict = verdictDAnnonce({ ...base, joursDepuisDerniereAnnonce: 2 });
    expect(verdict).toMatchObject({ possible: false, code: 'trop_tot' });
    expect((verdict as { raison: string }).raison).toContain('5 jours');
  });

  it('dit « aujourd’hui » plutôt que « il y a 0 jour »', () => {
    const verdict = verdictDAnnonce({ ...base, joursDepuisDerniereAnnonce: 0 });
    expect((verdict as { raison: string }).raison).toContain("aujourd'hui");
    expect((verdict as { raison: string }).raison).not.toContain('0 jour');
  });

  it('accepte dès que le délai est écoulé', () => {
    expect(verdictDAnnonce({ ...base, joursDepuisDerniereAnnonce: 7 })).toEqual({
      possible: true,
    });
  });

  it('suit le délai réglé dans le back-office', () => {
    const large = { ...base, joursDepuisDerniereAnnonce: 7, delaiMinimalJours: 30 };
    expect(verdictDAnnonce(large)).toMatchObject({ code: 'trop_tot' });
    const nul = { ...base, joursDepuisDerniereAnnonce: 0, delaiMinimalJours: 0 };
    expect(verdictDAnnonce(nul)).toEqual({ possible: true });
  });

  it('dit « offre terminée » avant « déjà annoncée » : c’est le blocage le plus fort', () => {
    const verdict = verdictDAnnonce({ ...base, offreEnCours: false, dejaAnnoncee: true });
    expect(verdict).toMatchObject({ code: 'offre_terminee' });
  });

  it('annonce sur le bouton ce qui va se passer', () => {
    expect(libelleDisponibilite({ possible: true }, 12)).toBe('Prévenir tes 12 clients');
    expect(libelleDisponibilite({ possible: true }, 1)).toBe('Prévenir ton client');
  });

  it('reste calme sur le bouton quand c’est simplement déjà fait', () => {
    // « Clients déjà prévenus » est un état normal. Recopier la phrase
    // d'explication sur le bouton la ferait lire comme une erreur.
    const verdict = verdictDAnnonce({ ...base, dejaAnnoncee: true });
    expect(libelleDisponibilite(verdict, 12)).toBe('Clients déjà prévenus');
  });

  it('donne un libellé court pour chaque refus', () => {
    const cas = [
      { ...base, offreEnCours: false },
      { ...base, dejaAnnoncee: true },
      { ...base, nombreDeClients: 0 },
      { ...base, joursDepuisDerniereAnnonce: 1 },
    ];
    for (const contexte of cas) {
      const libelle = libelleDisponibilite(verdictDAnnonce(contexte), contexte.nombreDeClients);
      expect(libelle.length).toBeGreaterThan(0);
      expect(libelle.length).toBeLessThan(40);
    }
  });
});
