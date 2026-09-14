import { Global, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { OwnershipModule } from '../auth/ownership.module';
import { Photo } from './photo.entity';
import { PhotosController } from './photos.controller';
import { PhotosService } from './photos.service';

/**
 * Module global : à peu près toutes les listes du site veulent savoir qui a
 * une photo (les amis, les duos, les lieux, la carte, le back-office). Le
 * déclarer global évite d'ajouter un import dans chacun de ces modules.
 */
@Global()
@Module({
  imports: [TypeOrmModule.forFeature([Photo]), OwnershipModule],
  controllers: [PhotosController],
  providers: [PhotosService],
  exports: [PhotosService],
})
export class PhotosModule {}
