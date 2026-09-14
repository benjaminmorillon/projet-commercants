import { Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';
import { Adresse, lireAdresses } from './reponse-nominatim';

// Le service de recherche d'adresses d'OpenStreetMap. Gratuit et sans clé,
// mais avec des règles d'usage à respecter (voir plus bas).
//
// Configurable par variable d'environnement, pour pouvoir pointer vers une
// instance à soi le jour où le volume l'exigera — ou vers un service de
// remplacement pendant les tests.
const URL_PAR_DEFAUT = 'https://nominatim.openstreetmap.org/search';

// Les règles d'usage de Nominatim imposent deux choses : s'identifier, et ne
// pas dépasser une requête par seconde. Les ignorer fait bannir l'adresse IP
// du serveur — donc casser la fonctionnalité pour tout le monde.
const DELAI_MINIMUM_MS = 1100;
const NOM_APPELANT = 'ProjetCommercants/1.0 (back-office)';

const DELAI_EXPIRATION_MS = 8000;
const TAILLE_CACHE = 200;

@Injectable()
export class GeocodageService {
  private readonly logger = new Logger(GeocodageService.name);

  // Les mêmes adresses sont cherchées plusieurs fois de suite (on corrige une
  // faute de frappe, on relance). Le cache évite d'aller déranger un service
  // gratuit pour une réponse qu'on a déjà.
  private readonly cache = new Map<string, Adresse[]>();

  // Une seule file d'attente : les appels s'espacent d'au moins une seconde,
  // même si deux administrateurs cherchent en même temps.
  private dernierAppel = 0;
  private file: Promise<unknown> = Promise.resolve();

  private get url(): string {
    return process.env.GEOCODAGE_URL || URL_PAR_DEFAUT;
  }

  async chercher(adresse: string): Promise<Adresse[]> {
    const requete = adresse.trim();
    if (requete.length < 3) {
      return [];
    }

    const cle = requete.toLowerCase();
    const enCache = this.cache.get(cle);
    if (enCache) {
      return enCache;
    }

    const adresses = await this.enFile(() => this.appeler(requete));

    if (this.cache.size >= TAILLE_CACHE) {
      // Le cache tient en mémoire : on jette la plus ancienne entrée plutôt
      // que de le laisser grossir indéfiniment.
      this.cache.delete(this.cache.keys().next().value as string);
    }
    this.cache.set(cle, adresses);

    return adresses;
  }

  /** Fait passer les appels un par un, espacés du délai minimum. */
  private enFile<T>(action: () => Promise<T>): Promise<T> {
    const resultat = this.file.then(async () => {
      const attente = this.dernierAppel + DELAI_MINIMUM_MS - Date.now();
      if (attente > 0) {
        await new Promise((resoudre) => setTimeout(resoudre, attente));
      }
      this.dernierAppel = Date.now();
      return action();
    });

    // La file continue même si un appel échoue, sinon le premier échec
    // bloquerait tous les suivants.
    this.file = resultat.catch(() => undefined);
    return resultat;
  }

  private async appeler(requete: string): Promise<Adresse[]> {
    const url = new URL(this.url);
    url.searchParams.set('q', requete);
    url.searchParams.set('format', 'json');
    url.searchParams.set('limit', '5');
    url.searchParams.set('addressdetails', '0');

    const abandon = new AbortController();
    const minuteur = setTimeout(() => abandon.abort(), DELAI_EXPIRATION_MS);

    try {
      const reponse = await fetch(url, {
        headers: {
          'User-Agent': NOM_APPELANT,
          'Accept-Language': 'fr',
          Accept: 'application/json',
        },
        signal: abandon.signal,
      });

      if (!reponse.ok) {
        throw new Error(`réponse ${reponse.status}`);
      }

      return lireAdresses(await reponse.json());
    } catch (erreur) {
      // On dit ce qui s'est passé, en français, plutôt que de laisser une
      // erreur technique remonter jusqu'à l'écran.
      this.logger.warn(`Recherche d'adresse impossible : ${(erreur as Error).message}`);
      throw new ServiceUnavailableException(
        "La recherche d'adresse est momentanément indisponible. Réessayez dans un instant, " +
          'ou placez le point directement sur la carte.',
      );
    } finally {
      clearTimeout(minuteur);
    }
  }
}
