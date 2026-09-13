import { rendreNotification, TYPES_NOTIFICATION } from './notification-rules';

describe('rendu des notifications', () => {
  it('chaque type sait se présenter', () => {
    TYPES_NOTIFICATION.forEach((type) => {
      const rendu = rendreNotification(type, {});
      expect(rendu.titre.length).toBeGreaterThan(0);
      expect(rendu.lien).toMatch(/\.html$/);
    });
  });

  it('nomme la personne et la mission concernées', () => {
    const rendu = rendreNotification('validation_demandee', {
      pseudo: 'Nina',
      mission: 'La rue cachée',
    });
    expect(rendu.corps).toContain('Nina');
    expect(rendu.corps).toContain('La rue cachée');
    expect(rendu.lien).toBe('validation.html');
  });

  it('reste lisible quand on ne sait pas de qui il s’agit', () => {
    const rendu = rendreNotification('ami_demande', {});
    expect(rendu.corps).toContain('Un joueur');
    expect(rendu.corps).not.toContain('undefined');
  });

  it('accorde le pluriel des jetons', () => {
    expect(rendreNotification('mission_validee', { credits: 1 }).corps).toContain('1 jeton ');
    expect(rendreNotification('mission_validee', { credits: 3 }).corps).toContain('3 jetons');
  });

  it('distingue une invitation acceptée d’une refusée', () => {
    expect(rendreNotification('invitation_repondue', { reponse: 'acceptee' }).corps).toContain(
      'accepté',
    );
    expect(rendreNotification('invitation_repondue', { reponse: 'refusee' }).corps).toContain(
      'refusé',
    );
  });

  it('ne tombe pas sur un type inconnu', () => {
    const rendu = rendreNotification('type_qui_nexiste_pas' as never, {});
    expect(rendu.titre).toBe('Notification');
    expect(rendu.lien).toBe('index.html');
  });
});
