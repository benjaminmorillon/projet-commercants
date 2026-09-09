import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../users/user.entity';
import { PlayerProfile } from './player-profile.entity';
import { CreatePlayerDto } from './dto/create-player.dto';
import { SubmitQuestionnaireDto } from './dto/submit-questionnaire.dto';
import { computeInitialArchetypeScores } from './archetype-scoring';

@Injectable()
export class PlayersService {
  constructor(
    @InjectRepository(User)
    private readonly users: Repository<User>,
    @InjectRepository(PlayerProfile)
    private readonly profiles: Repository<PlayerProfile>,
  ) {}

  async createPlayer(dto: CreatePlayerDto): Promise<User> {
    const existing = await this.users.findOne({ where: { email: dto.email } });
    if (existing) {
      throw new ConflictException('Un compte existe déjà avec cet email.');
    }

    const user = await this.users.save(
      this.users.create({ email: dto.email, pseudo: dto.pseudo }),
    );
    await this.profiles.save(this.profiles.create({ userId: user.id }));
    return user;
  }

  async getProfile(userId: string): Promise<PlayerProfile> {
    const profile = await this.profiles.findOne({ where: { userId } });
    if (!profile) {
      throw new NotFoundException('Joueur introuvable.');
    }
    return profile;
  }

  async submitQuestionnaire(
    userId: string,
    dto: SubmitQuestionnaireDto,
  ): Promise<PlayerProfile> {
    const profile = await this.getProfile(userId);
    const scores = computeInitialArchetypeScores(dto);

    Object.assign(profile, scores, {
      sliderAnswersJson: JSON.stringify(dto),
      questionnaireCompletedAt: new Date(),
      updatedAt: new Date(),
    });

    return this.profiles.save(profile);
  }
}
