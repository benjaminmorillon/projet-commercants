import { Injectable } from '@nestjs/common';
import { randomBytes } from 'crypto';
import {
  PrestatairePaiement,
  ResultatPaiement,
} from './prestataire-paiement';

/**
 * Prestataire de démonstration : aucune somme ne circule réellement, aucun
 * compte bancaire n'est sollicité. Il accepte le paiement et rend une
 * référence reconnaissable à son préfixe « sim_ ».
 *
 * Il sait aussi échouer : un montant de 13 exactement est refusé, ce qui
 * permet de voir le parcours d'erreur sans attendre un vrai incident.
 */
@Injectable()
export class PrestataireSimule implements PrestatairePaiement {
  readonly nom = 'simulation';
  readonly simule = true;

  static readonly MONTANT_QUI_ECHOUE = 13;

  async encaisser(montant: number): Promise<ResultatPaiement> {
    if (montant === PrestataireSimule.MONTANT_QUI_ECHOUE) {
      return {
        reference: `sim_refus_${randomBytes(6).toString('hex')}`,
        statut: 'echoue',
        message: 'Paiement refusé par la banque (simulation).',
      };
    }

    return {
      reference: `sim_${randomBytes(10).toString('hex')}`,
      statut: 'reussi',
    };
  }
}
