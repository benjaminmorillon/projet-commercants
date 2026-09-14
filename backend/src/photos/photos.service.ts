import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { lireImage } from './photo-rules';
import { Photo, SujetPhoto } from './photo.entity';

@Injectable()
export class PhotosService {
  constructor(
    @InjectRepository(Photo)
    private readonly photos: Repository<Photo>,
  ) {}

  async enregistrer(sujet: SujetPhoto, proprietaireId: string, brut: unknown): Promise<Date> {
    const lecture = lireImage(brut);
    if (!lecture.ok) {
      throw new BadRequestException(lecture.erreur);
    }

    const existante = await this.photos.findOne({
      where: { sujet, proprietaireId },
      select: { id: true },
    });

    const maintenant = new Date();

    if (existante) {
      await this.photos.update(
        { id: existante.id },
        { format: lecture.format, donnees: lecture.donnees, updatedAt: maintenant },
      );
    } else {
      await this.photos.save(
        this.photos.create({
          sujet,
          proprietaireId,
          format: lecture.format,
          donnees: lecture.donnees,
          updatedAt: maintenant,
        }),
      );
    }

    return maintenant;
  }

  async supprimer(sujet: SujetPhoto, proprietaireId: string): Promise<void> {
    await this.photos.delete({ sujet, proprietaireId });
  }

  /** L'image elle-même, pour la servir. */
  async lire(sujet: SujetPhoto, proprietaireId: string): Promise<Photo> {
    const photo = await this.photos.findOne({ where: { sujet, proprietaireId } });
    if (!photo) {
      throw new NotFoundException('Pas de photo.');
    }
    return photo;
  }

  /**
   * Qui a une photo, et de quand elle date — sans charger une seule image.
   *
   * C'est la méthode que les listes appellent : la date sert à fabriquer une
   * adresse qui change quand la photo change, pour que le navigateur ne
   * ressorte pas l'ancienne de son cache.
   */
  async versions(sujet: SujetPhoto, proprietaireIds: string[]): Promise<Map<string, number>> {
    if (proprietaireIds.length === 0) {
      return new Map();
    }

    const lignes = await this.photos.find({
      where: { sujet, proprietaireId: In(proprietaireIds) },
      select: { proprietaireId: true, updatedAt: true },
    });

    return new Map(lignes.map((l) => [l.proprietaireId, new Date(l.updatedAt).getTime()]));
  }

  /** La version d'une seule photo, ou null s'il n'y en a pas. */
  async version(sujet: SujetPhoto, proprietaireId: string): Promise<number | null> {
    return (await this.versions(sujet, [proprietaireId])).get(proprietaireId) ?? null;
  }
}
