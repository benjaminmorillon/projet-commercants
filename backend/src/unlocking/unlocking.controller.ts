import { Controller, Get, Param } from '@nestjs/common';
import { UnlockingService } from './unlocking.service';

@Controller('players')
export class UnlockingController {
  constructor(private readonly unlocking: UnlockingService) {}

  // Où en est le joueur dans son tutoriel, ce qui lui est ouvert, et combien
  // de missions il peut encore lancer aujourd'hui.
  @Get(':id/deblocage')
  get(@Param('id') id: string) {
    return this.unlocking.getDeblocage(id);
  }
}
