import { lireCookie } from './cookies';

describe('lireCookie', () => {
  it('trouve le cookie demandé parmi les autres', () => {
    expect(lireCookie('theme=clair; session=abc123; langue=fr', 'session')).toBe('abc123');
  });

  it('tolère les espaces et l’ordre', () => {
    expect(lireCookie('session=abc123', 'session')).toBe('abc123');
    expect(lireCookie('  session = abc123 ; a=b', 'session')).toBe('abc123');
  });

  it('ne confond pas un cookie dont le nom contient le nôtre', () => {
    expect(lireCookie('ma-session=piege; autre=1', 'session')).toBeNull();
  });

  it('renvoie null quand il n’y a rien à lire', () => {
    expect(lireCookie(undefined, 'session')).toBeNull();
    expect(lireCookie('', 'session')).toBeNull();
    expect(lireCookie('theme=clair', 'session')).toBeNull();
  });

  it('décode une valeur échappée', () => {
    expect(lireCookie('session=a%20b', 'session')).toBe('a b');
  });
});
