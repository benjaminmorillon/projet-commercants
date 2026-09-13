import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Business } from '../businesses/business.entity';
import { BusinessOwnerGuard } from './business-owner.guard';

/** Fournit le garde de propriété d'un établissement aux modules qui en ont besoin. */
@Module({
  imports: [TypeOrmModule.forFeature([Business])],
  providers: [BusinessOwnerGuard],
  exports: [BusinessOwnerGuard],
})
export class OwnershipModule {}
