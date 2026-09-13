import { Controller, Param, Post } from '@nestjs/common';
import { UtilisateurConnecte } from '../auth/auth.service';
import { Utilisateur } from '../auth/utilisateur.decorator';
import { ValidationsService } from './validations.service';

@Controller('validations')
export class ValidationsController {
  constructor(private readonly validations: ValidationsService) {}

  @Post(':id/valider')
  valider(@Param('id') id: string, @Utilisateur() utilisateur: UtilisateurConnecte) {
    return this.validations.resolve(id, 'validee', utilisateur.id);
  }

  @Post(':id/refuser')
  refuser(@Param('id') id: string, @Utilisateur() utilisateur: UtilisateurConnecte) {
    return this.validations.resolve(id, 'refusee', utilisateur.id);
  }
}
