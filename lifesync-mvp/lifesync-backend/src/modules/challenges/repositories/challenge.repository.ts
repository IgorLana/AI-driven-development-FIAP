import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { IChallengeRepository } from './challenge.repository.interface';
import { Challenge, UserChallenge } from '@prisma/client';
import { startOfDay, endOfDay } from 'date-fns';

@Injectable()
export class ChallengeRepository implements IChallengeRepository {
    constructor(private readonly prisma: PrismaService) { }

    async create(data: {
        companyId: string;
        title: string;
        description: string;
        category: string;
        xpReward: number;
    }): Promise<Challenge> {
        return this.prisma.challenge.create({
            data: { ...data, isGlobal: false },
        });
    }

    async findAvailable(companyId: string): Promise<Challenge[]> {
        return this.prisma.challenge.findMany({
            where: { OR: [{ isGlobal: true }, { companyId }] },
            orderBy: [{ category: 'asc' }, { xpReward: 'desc' }],
        });
    }

    async findById(id: string): Promise<Challenge | null> {
        return this.prisma.challenge.findUnique({ where: { id } });
    }

    async findCompletedTodayByUser(userId: string): Promise<{ challengeId: string }[]> {
        const today = new Date();
        return this.prisma.userChallenge.findMany({
            where: {
                userId,
                completedAt: { gte: startOfDay(today), lte: endOfDay(today) },
            },
            select: { challengeId: true },
        });
    }

    async createCompletion(userId: string, challengeId: string): Promise<UserChallenge> {
        return this.prisma.userChallenge.create({
            data: { userId, challengeId, completedAt: new Date() },
        });
    }

    async countCompletedByUser(userId: string): Promise<number> {
        return this.prisma.userChallenge.count({
            where: { userId, completedAt: { not: null } },
        });
    }
}
