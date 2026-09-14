/**
 * Qui est connecté, et comment ça change.
 *
 * Un seul endroit décide de l'état de la session, et toute l'application le
 * lit depuis là. Aucun écran ne range ni ne lit le jeton lui-même : ils
 * appellent `connecter`, `inscrire` ou `deconnecter` et regardent
 * `utilisateur`.
 */
import { createContext, ReactNode, useContext, useEffect, useMemo, useState } from 'react';
import { appeler, oublierJeton, rangerJeton } from './client';

export interface Utilisateur {
  id: string;
  pseudo: string;
  email: string;
  type: 'particulier' | 'commercant';
  administrateur: boolean;
  photoVersion: number | null;
}

interface Session {
  utilisateur: Utilisateur | null;
  /** Vrai tant qu'on n'a pas encore pu dire si quelqu'un est connecté. */
  chargement: boolean;
  connecter: (email: string, motDePasse: string) => Promise<void>;
  inscrire: (pseudo: string, email: string, motDePasse: string) => Promise<void>;
  deconnecter: () => Promise<void>;
  rafraichir: () => Promise<void>;
}

const Contexte = createContext<Session | null>(null);

export function FournisseurDeSession({ children }: { children: ReactNode }) {
  const [utilisateur, setUtilisateur] = useState<Utilisateur | null>(null);
  const [chargement, setChargement] = useState(true);

  /**
   * C'est le SERVEUR qui dit qui est connecté, pas ce que le téléphone a en
   * mémoire : un jeton peut avoir expiré ou avoir été révoqué depuis la
   * dernière ouverture.
   */
  async function rafraichir() {
    try {
      setUtilisateur(await appeler<Utilisateur>('/auth/moi'));
    } catch {
      setUtilisateur(null);
    } finally {
      setChargement(false);
    }
  }

  useEffect(() => {
    rafraichir();
  }, []);

  async function ouvrirSession(chemin: string, corps: unknown) {
    const { utilisateur: compte, jeton } = await appeler<{
      utilisateur: Utilisateur;
      jeton: string;
    }>(chemin, { methode: 'POST', corps, sansJeton: true });

    await rangerJeton(jeton);
    setUtilisateur(compte);
  }

  const valeur = useMemo<Session>(
    () => ({
      utilisateur,
      chargement,
      connecter: (email, motDePasse) =>
        ouvrirSession('/auth/connexion', { email, motDePasse }),
      inscrire: (pseudo, email, motDePasse) =>
        ouvrirSession('/auth/inscription', { pseudo, email, motDePasse, type: 'particulier' }),
      deconnecter: async () => {
        // On prévient le serveur pour qu'il invalide le jeton, mais on oublie
        // la session dans tous les cas : une déconnexion ne doit jamais
        // échouer parce que le réseau est coupé.
        await appeler('/auth/deconnexion', { methode: 'POST' }).catch(() => null);
        await oublierJeton();
        setUtilisateur(null);
      },
      rafraichir,
    }),
    [utilisateur, chargement],
  );

  return <Contexte.Provider value={valeur}>{children}</Contexte.Provider>;
}

export function useSession(): Session {
  const session = useContext(Contexte);
  if (!session) {
    throw new Error('useSession doit être utilisé dans <FournisseurDeSession>.');
  }
  return session;
}
