import { Body, Controller, Get, Param, Put } from '@nestjs/common';
import { CollectionService } from './collection.service';
import { EquiperTitreDto } from './dto/equiper-titre.dto';

@Controller('players')
export class CollectionController {
  constructor(private readonly collection: CollectionService) {}

  @Get(':id/collection')
  get(@Param('id') id: string) {
    return this.collection.getCollection(id);
  }

  @Put(':id/titre')
  equiper(@Param('id') id: string, @Body() dto: EquiperTitreDto) {
    return this.collection.equiperTitre(id, dto.titreId ?? null);
  }
}
