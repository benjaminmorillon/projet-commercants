import { jetonDeLaRequete, lireCookie, lireJetonAutorisation } from './cookies';

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

describe('lireJetonAutorisation', () => {
  it('lit un jeton porté par l’en-tête Authorization', () => {
    expect(lireJetonAutorisation('Bearer abc123')).toBe('abc123');
  });

  it('accepte la casse habituelle des en-têtes', () => {
    expect(lireJetonAutorisation('bearer abc123')).toBe('abc123');
    expect(lireJetonAutorisation('BEARER abc123')).toBe('abc123');
  });

  it('tolère les espaces en trop', () => {
    expect(lireJetonAutorisation('  Bearer   abc123  ')).toBe('abc123');
  });

  it('refuse ce qui n’est pas un jeton porteur', () => {
    expect(lireJetonAutorisation('Basic abc123')).toBeNull();
    expect(lireJetonAutorisation('abc123')).toBeNull();
    expect(lireJetonAutorisation('Bearer')).toBeNull();
    expect(lireJetonAutorisation('Bearer a b')).toBeNull();
    expect(lireJetonAutorisation(undefined)).toBeNull();
    expect(lireJetonAutorisation('')).toBeNull();
  });
});

describe('jetonDeLaRequete', () => {
  it('prend le jeton de l’en-tête quand il y en a un', () => {
    expect(
      jetonDeLaRequete({ authorization: 'Bearer duTelephone', cookie: 'session=duNavigateur' }),
    ).toBe('duTelephone');
  });

  it('retombe sur le cookie sinon', () => {
    expect(jetonDeLaRequete({ cookie: 'session=duNavigateur' })).toBe('duNavigateur');
  });

  it('rend null quand la requête n’en porte aucun', () => {
    expect(jetonDeLaRequete({})).toBeNull();
    expect(jetonDeLaRequete({ authorization: 'Basic x', cookie: 'autre=chose' })).toBeNull();
  });
});
