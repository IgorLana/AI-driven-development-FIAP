import { Injectable, Logger, Inject } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { PrismaService } from '../../prisma/prisma.service';
import { BadgeType } from '../../common/enums/badge-type.enum';
import { MoodLogCreatedEvent } from '../../common/events/mood-log-created.event';
import { ChallengeCompletedEvent } from '../../common/events/challenge-completed.event';
import { USER_REPOSITORY, IUserRepository } from '../users/repositories/user.repository.interface';

/**
 * Seção 1.3 (SRP + OCP) + Seção 1.4 (Acoplamento).
 * GamificationService agora escuta eventos de domínio ao invés de ser chamado diretamente.
 * BadgeType enum substitui magic strings (OCP: adicionar badge = adicionar ao enum, não modificar switch).
 */
@Injectable()
export class GamificationService {
    private readonly logger = new Logger(GamificationService.name);

    // Registry de badges: Open/Closed Principle aplicado
    private readonly badgeDescriptions: Record<BadgeType, string> = {
        [BadgeType.FIRST_STEP]: 'Completou o primeiro mood log',
        [BadgeType.CONSISTENT]: '7 dias consecutivos de check-in',
        [BadgeType.DEDICATED]: '30 dias consecutivos de check-in',
        [BadgeType.WELLNESS_MASTER]: '100 desafios completados',
    };

    constructor(
        private readonly prisma: PrismaService,
        @Inject(USER_REPOSITORY)
        private readonly userRepository: IUserRepository,
    ) { }

    // Seção 5 — EventEmitter: ouve evento de mood log criado
    @OnEvent('mood-log.created')
    async handleMoodLogCreated(event: MoodLogCreatedEvent) {
        this.logger.log(`Handling mood-log.created for user ${event.userId}`);

        await this.userRepository.addXP(event.userId, event.xpToAward);
        await this.checkFirstMoodLogBadge(event.userId);
    }

    // Seção 5 — EventEmitter: ouve evento de desafio completado
    @OnEvent('challenge.completed')
    async handleChallengeCompleted(event: ChallengeCompletedEvent) {
        this.logger.log(`Handling challenge.completed for user ${event.userId}`);

        await this.userRepository.addXP(event.userId, event.xpReward);
        await this.checkChallengesMasterBadge(event.userId);
    }

    async checkAndAwardBadge(userId: string, badgeName: BadgeType) {
        const existingBadge = await this.prisma.badge.findFirst({
            where: { userId, name: badgeName },
        });

        if (existingBadge) return null;

        // Seção 1.3 (OCP): descrição vem do registry tipado, não de switch/case hardcoded
        const description = this.badgeDescriptions[badgeName] ?? badgeName;

        const badge = await this.prisma.badge.create({
            data: { userId, name: badgeName, description, iconUrl: null },
        });

        this.logger.log(`Badge awarded: ${badgeName} to user ${userId}`);
        return badge;
    }

    private async checkFirstMoodLogBadge(userId: string) {
        const count = await this.prisma.moodLog.count({ where: { userId } });
        if (count === 1) {
            return this.checkAndAwardBadge(userId, BadgeType.FIRST_STEP);
        }
        return null;
    }

    private async checkChallengesMasterBadge(userId: string) {
        const count = await this.prisma.userChallenge.count({
            where: { userId, completedAt: { not: null } },
        });
        if (count >= 100) {
            return this.checkAndAwardBadge(userId, BadgeType.WELLNESS_MASTER);
        }
        return null;
    }
}
