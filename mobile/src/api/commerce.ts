/**
 * L'établissement du commerçant connecté.
 *
 * Il est demandé une fois et gardé : tous les appels de l'espace commerçant
 * passent par son identifiant, et le redemander à chaque écran ferait une
 * requête de plus pour une réponse qui ne change pas.
 */
import { useCallback, useEffect, useState } from 'react';
import { appeler } from './client';
import { useSession } from './session';

export interface Commerce {
  id: string;
  nom: string;
  adresse: string;
  typeEtablissement: string;
}

export interface EtatCommerce {
  commerce: Commerce | null;
  chargement: boolean;
  /** Renseigné quand le compte n'a pas encore d'établissement. */
  erreur: string;
  recharger: () => Promise<void>;
}

export function useMonCommerce(): EtatCommerce {
  const { utilisateur } = useSession();
  const [commerce, setCommerce] = useState<Commerce | null>(null);
  const [chargement, setChargement] = useState(true);
  const [erreur, setErreur] = useState('');

  const recharger = useCallback(async () => {
    // Un joueur n'a pas d'établissement, et la question n'a pas à être posée
    // au serveur. Sur le web, le routeur monte brièvement les écrans du
    // commerçant pendant qu'il choisit sa destination : sans ce garde,
    // chaque ouverture de l'application produisait un 404 inutile.
    if (utilisateur?.type !== 'commercant') {
      setCommerce(null);
      setChargement(false);
      return;
    }

    setChargement(true);
    try {
      setCommerce(await appeler<Commerce>('/businesses/mien'));
      setErreur('');
    } catch (e) {
      setCommerce(null);
      setErreur((e as Error).message);
    } finally {
      setChargement(false);
    }
  }, [utilisateur?.type]);

  useEffect(() => {
    recharger();
  }, [recharger]);

  return { commerce, chargement, erreur, recharger };
}
