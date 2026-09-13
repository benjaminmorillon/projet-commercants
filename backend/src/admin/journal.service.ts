import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UtilisateurConnecte } from '../auth/auth.service';
import { JournalAdmin } from './journal-admin.entity';

export interface EcritureJournal {
  action: string;
  cible?: string | null;
  resume: string;
  avant?: unknown;
  apres?: unknown;
}

@Injectable()
export class JournalService {
  constructor(
    @InjectRepository(JournalAdmin)
    private readonly journal: Repository<JournalAdmin>,
  ) {}

  async enregistrer(auteur: UtilisateurConnecte, ecriture: EcritureJournal): Promise<void> {
    await this.journal.save({
      auteurId: auteur.id,
      auteurEmail: auteur.email,
      action: ecriture.action,
      cible: ecriture.cible ?? null,
      resume: ecriture.resume,
      avant: ecriture.avant === undefined ? null : String(ecriture.avant),
      apres: ecriture.apres === undefined ? null : String(ecriture.apres),
    });
  }

  /** Les dernières actions, les plus récentes d'abord. */
  async dernieres(combien = 100): Promise<JournalAdmin[]> {
    return this.journal.find({
      order: { faitLe: 'DESC' },
      take: Math.min(Math.max(combien, 1), 500),
    });
  }
}
