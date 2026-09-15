import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ReglagesService } from '../admin/reglages.service';
import {
  PIECES_MAXIMUM,
  lireFichier,
  poidsLisible,
  typeDe,
} from './fichier-rules';
import { PieceJointe } from './piece-jointe.entity';

/** Ce qu'une liste montre : jamais les octets. */
export interface PieceJointeAffichee {
  id: string;
  nom: string;
  format: string;
  taille: number;
  poids: string;
  /** Le fichier s'affiche dans la page, ou se télécharge ? */
  affichable: boolean;
  ajouteeLe: Date;
}

@Injectable()
export class FichiersService {
  constructor(
    @InjectRepository(PieceJointe)
    private readonly pieces: Repository<PieceJointe>,
    private readonly reglages: ReglagesService,
  ) {}

  private plafond(): number {
    return this.reglages.entier('fichiers.parCommerce') || PIECES_MAXIMUM;
  }

  /**
   * Les pièces jointes d'un commerce.
   *
   * `select` explicite : sans lui, TypeORM ramène aussi la colonne des
   * octets, et lister trois cartes de restaurant ferait passer quinze
   * méga-octets par le réseau pour afficher trois noms.
   */
  async lister(businessId: string): Promise<PieceJointeAffichee[]> {
    const pieces = await this.pieces.find({
      where: { businessId },
      select: { id: true, nom: true, format: true, taille: true, ajouteeLe: true },
      order: { ajouteeLe: 'ASC' },
    });

    return pieces.map((piece) => ({
      id: piece.id,
      nom: piece.nom,
      format: piece.format,
      taille: piece.taille,
      poids: poidsLisible(piece.taille),
      affichable: typeDe(piece.format)?.affichable ?? false,
      ajouteeLe: piece.ajouteeLe,
    }));
  }

  async ajouter(
    businessId: string,
    contenu: unknown,
    nomPropose: unknown,
  ): Promise<PieceJointeAffichee> {
    const lecture = lireFichier(contenu, nomPropose);
    if (!lecture.ok) {
      throw new BadRequestException(lecture.erreur);
    }

    // Le plafond n'est pas une coquetterie : sans lui, un commerçant pourrait
    // déposer mille cartes de restaurant et remplir la base à lui tout seul.
    const deja = await this.pieces.count({ where: { businessId } });
    const maximum = this.plafond();
    if (deja >= maximum) {
      throw new BadRequestException(
        `Tu as déjà ${maximum} pièces jointes, c'est le maximum. Retires-en une avant d'en ajouter une autre.`,
      );
    }

    const { fichier } = lecture;
    const piece = await this.pieces.save(
      this.pieces.create({
        businessId,
        nom: fichier.nom,
        format: fichier.format,
        taille: fichier.donnees.length,
        donnees: fichier.donnees,
        ajouteeLe: new Date(),
      }),
    );

    return {
      id: piece.id,
      nom: piece.nom,
      format: piece.format,
      taille: piece.taille,
      poids: poidsLisible(piece.taille),
      affichable: typeDe(piece.format)?.affichable ?? false,
      ajouteeLe: piece.ajouteeLe,
    };
  }

  /**
   * Le contenu d'une pièce jointe.
   *
   * `businessId` est exigé alors que l'identifiant suffirait à la retrouver :
   * c'est ce qui permet au contrôleur du commerçant de vérifier qu'une pièce
   * lui appartient avant de la supprimer. Sans ça, changer un identifiant
   * dans l'adresse suffirait à effacer la carte du voisin.
   */
  async lire(id: string, businessId?: string): Promise<PieceJointe> {
    const piece = await this.pieces.findOne({ where: { id } });
    if (!piece || (businessId !== undefined && piece.businessId !== businessId)) {
      throw new NotFoundException('Pièce jointe introuvable.');
    }
    return piece;
  }

  async supprimer(id: string, businessId: string): Promise<{ supprimee: true }> {
    await this.lire(id, businessId);
    await this.pieces.delete({ id });
    return { supprimee: true };
  }

  /** Combien de pièces jointes chaque commerce a. Pour les listes de lieux. */
  async comptesParCommerce(businessIds: string[]): Promise<Map<string, number>> {
    if (businessIds.length === 0) return new Map();

    const lignes = await this.pieces
      .createQueryBuilder('p')
      .select('p.businessId', 'businessId')
      .addSelect('COUNT(p.id)', 'total')
      .where('p.businessId IN (:...businessIds)', { businessIds })
      .groupBy('p.businessId')
      .getRawMany<{ businessId: string; total: string }>();

    return new Map(lignes.map((l) => [l.businessId, Number(l.total)]));
  }
}
