import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { OwnershipModule } from '../auth/ownership.module';
import { BusinessFichiersController, FichiersController } from './fichiers.controller';
import { FichiersService } from './fichiers.service';
import { PieceJointe } from './piece-jointe.entity';

@Module({
  imports: [TypeOrmModule.forFeature([PieceJointe]), OwnershipModule],
  controllers: [BusinessFichiersController, FichiersController],
  providers: [FichiersService],
  exports: [FichiersService],
})
export class FichiersModule {}
