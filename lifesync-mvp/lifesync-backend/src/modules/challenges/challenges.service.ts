import { Injectable, NotFoundException, BadRequestException, Logger, Inject } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { CHALLENGE_REPOSITORY, IChallengeRepository } from './repositories/challenge.repository.interface';
import { CreateChallengeDto } from './dto/create-challenge.dto';
import { ChallengeCompletedEvent } from '../../common/events/challenge-completed.event';

/**
 * Seção 1.2 — Desacoplamento via EventEmitter.
 * ChallengesService não importa mais UsersService nem GamificationService.
 */
@Injectable()
export class ChallengesService {
    private readonly logger = new Logger(ChallengesService.name);

    constructor(
        @Inject(CHALLENGE_REPOSITORY)
        private readonly challengeRepository: IChallengeRepository,
        private readonly eventEmitter: EventEmitter2,
    ) { }

    async create(companyId: string, createChallengeDto: CreateChallengeDto) {
        const challenge = await this.challengeRepository.create({
            companyId,
            title: createChallengeDto.title,
            description: createChallengeDto.description,
            category: createChallengeDto.category,
            xpReward: createChallengeDto.xpReward,
        });

        this.logger.log(`Challenge created: ${challenge.title} for company ${companyId}`);
        return challenge;
    }

    async findDaily(userId: string, companyId: string) {
        const challenges = await this.challengeRepository.findAvailable(companyId);
        const completedToday = await this.challengeRepository.findCompletedTodayByUser(userId);

        const completedIds = new Set(completedToday.map((uc) => uc.challengeId));
        const availableChallenges = challenges.filter((c) => !completedIds.has(c.id));

        return { challenges: availableChallenges };
    }

    async complete(userId: string, challengeId: string) {
        const challenge = await this.challengeRepository.findById(challengeId);
        if (!challenge) {
            throw new NotFoundException('Challenge not found');
        }

        const completedToday = await this.challengeRepository.findCompletedTodayByUser(userId);
        const alreadyCompleted = completedToday.some((uc) => uc.challengeId === challengeId);
        if (alreadyCompleted) {
            throw new BadRequestException('Challenge already completed today');
        }

        await this.challengeRepository.createCompletion(userId, challengeId);

        // Seção 1.2 — Emite evento: Gamification e Users reagem de forma desacoplada
        this.eventEmitter.emit(
            'challenge.completed',
            new ChallengeCompletedEvent(userId, challengeId, challenge.xpReward),
        );

        this.logger.log(`Challenge completed: ${challenge.title} by user ${userId}`);

        return {
            challenge,
            xpEarned: challenge.xpReward,
        };
    }
}
