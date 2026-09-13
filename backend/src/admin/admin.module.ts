import { Global, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AdminController } from './admin.controller';
import { AdminGuard } from './admin.guard';
import { JournalAdmin } from './journal-admin.entity';
import { JournalService } from './journal.service';
import { Reglage } from './reglage.entity';
import { ReglagesService } from './reglages.service';

/**
 * Module global : ReglagesService est lu depuis à peu près partout
 * (check-in, missions, XP, jetons...). Le déclarer global évite d'ajouter
 * un import dans chaque module du projet, et surtout évite d'oublier.
 */
@Global()
@Module({
  imports: [TypeOrmModule.forFeature([Reglage, JournalAdmin])],
  controllers: [AdminController],
  providers: [ReglagesService, JournalService, AdminGuard],
  exports: [ReglagesService, JournalService],
})
export class AdminModule {}
