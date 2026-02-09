import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class GamificationService {
    private readonly logger = new Logger(GamificationService.name);

    constructor(private prisma: PrismaService) { }

    async checkAndAwardBadge(userId: string, badgeName: string) {
        // Verificar se usuário já tem o badge
        const existingBadge = await this.prisma.badge.findFirst({
            where: {
                userId,
                name: badgeName,
            },
        });

        if (existingBadge) {
            return null;
        }

        // Criar badge baseado no nome
        let description = '';
        let iconUrl = null;

        switch (badgeName) {
            case 'Primeiro Passo':
                description = 'Completou o primeiro mood log';
                break;
            case 'Consistente':
                description = '7 dias consecutivos de check-in';
                break;
            case 'Dedicado':
                description = '30 dias consecutivos de check-in';
                break;
            case 'Mestre do Bem-Estar':
                description = '100 desafios completados';
                break;
            default:
                description = badgeName;
        }

        const badge = await this.prisma.badge.create({
            data: {
                userId,
                name: badgeName,
                description,
                iconUrl,
            },
        });

        this.logger.log(`Badge awarded: ${badgeName} to user ${userId}`);

        return badge;
    }

    async checkFirstMoodLogBadge(userId: string) {
        const moodLogCount = await this.prisma.moodLog.count({
            where: { userId },
        });

        if (moodLogCount === 1) {
            return this.checkAndAwardBadge(userId, 'Primeiro Passo');
        }

        return null;
    }

    async checkChallengesMasterBadge(userId: string) {
        const completedChallenges = await this.prisma.userChallenge.count({
            where: {
                userId,
                completedAt: { not: null },
            },
        });

        if (completedChallenges >= 100) {
            return this.checkAndAwardBadge(userId, 'Mestre do Bem-Estar');
        }

        return null;
    }
}
