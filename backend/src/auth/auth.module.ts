import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PlayerProfile } from '../players/player-profile.entity';
import { User } from '../users/user.entity';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { EXPEDITEUR_EMAIL } from './expediteur-email';
import { ExpediteurConsole } from './expediteur-console';
import { DemandeReinitialisation } from './reinitialisation.entity';
import { Session } from './session.entity';

@Module({
  imports: [TypeOrmModule.forFeature([User, Session, PlayerProfile, DemandeReinitialisation])],
  controllers: [AuthController],
  providers: [
    AuthService,
    // Une ligne à changer le jour où un vrai service d'emails arrive.
    { provide: EXPEDITEUR_EMAIL, useClass: ExpediteurConsole },
  ],
  exports: [AuthService],
})
export class AuthModule {}
