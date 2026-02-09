import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class AnalyticsService {
    private readonly logger = new Logger(AnalyticsService.name);

    constructor(private prisma: PrismaService) { }

    async getMoodSummary(companyId: string, startDate?: string, endDate?: string) {
        // Construir filtro de data
        const where: any = {
            user: {
                companyId,
            },
        };

        if (startDate || endDate) {
            where.loggedAt = {};
            if (startDate) {
                where.loggedAt.gte = new Date(startDate);
            }
            if (endDate) {
                where.loggedAt.lte = new Date(endDate);
            }
        }

        // Buscar mood logs
        const moodLogs = await this.prisma.moodLog.findMany({
            where,
            select: {
                mood: true,
                userId: true,
            },
        });

        if (moodLogs.length === 0) {
            return {
                averageMood: 0,
                totalCheckins: 0,
                moodDistribution: {
                    1: 0,
                    2: 0,
                    3: 0,
                    4: 0,
                    5: 0,
                },
                engagementRate: 0,
            };
        }

        // Calcular média
        const totalMood = moodLogs.reduce((sum, log) => sum + log.mood, 0);
        const averageMood = totalMood / moodLogs.length;

        // Calcular distribuição
        const distribution = {
            1: 0,
            2: 0,
            3: 0,
            4: 0,
            5: 0,
        };

        moodLogs.forEach((log) => {
            (distribution as any)[log.mood]++;
        });

        // Converter para porcentagem
        const moodDistribution = {
            1: (distribution[1] / moodLogs.length) * 100,
            2: (distribution[2] / moodLogs.length) * 100,
            3: (distribution[3] / moodLogs.length) * 100,
            4: (distribution[4] / moodLogs.length) * 100,
            5: (distribution[5] / moodLogs.length) * 100,
        };

        // Calcular taxa de engajamento
        const uniqueUsers = new Set(moodLogs.map((log) => log.userId)).size;
        const totalUsers = await this.prisma.user.count({
            where: { companyId },
        });

        const engagementRate = (uniqueUsers / totalUsers) * 100;

        this.logger.log(`Mood summary generated for company ${companyId}`);

        return {
            averageMood: Math.round(averageMood * 100) / 100,
            totalCheckins: moodLogs.length,
            moodDistribution,
            engagementRate: Math.round(engagementRate * 100) / 100,
        };
    }
}
