import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateChallengeDto } from './dto/create-challenge.dto';
import { UsersService } from '../users/users.service';
import { GamificationService } from '../gamification/gamification.service';
import { startOfDay, endOfDay } from 'date-fns';

@Injectable()
export class ChallengesService {
    private readonly logger = new Logger(ChallengesService.name);

    constructor(
        private prisma: PrismaService,
        private usersService: UsersService,
        private gamificationService: GamificationService,
    ) { }

    async create(companyId: string, createChallengeDto: CreateChallengeDto) {
        const challenge = await this.prisma.challenge.create({
            data: {
                companyId,
                title: createChallengeDto.title,
                description: createChallengeDto.description,
                category: createChallengeDto.category,
                xpReward: createChallengeDto.xpReward,
                isGlobal: false,
            },
        });

        this.logger.log(`Challenge created: ${challenge.title} for company ${companyId}`);

        return challenge;
    }

    async findDaily(userId: string, companyId: string) {
        // Buscar desafios globais e da empresa
        const challenges = await this.prisma.challenge.findMany({
            where: {
                OR: [
                    { isGlobal: true },
                    { companyId },
                ],
            },
            orderBy: [
                { category: 'asc' },
                { xpReward: 'desc' },
            ],
        });

        // Buscar desafios já completados hoje
        const today = new Date();
        const completedToday = await this.prisma.userChallenge.findMany({
            where: {
                userId,
                completedAt: {
                    gte: startOfDay(today),
                    lte: endOfDay(today),
                },
            },
            select: {
                challengeId: true,
            },
        });

        const completedChallengeIds = new Set(completedToday.map((uc) => uc.challengeId));

        // Filtrar desafios já completados
        const availableChallenges = challenges.filter(
            (challenge) => !completedChallengeIds.has(challenge.id),
        );

        return {
            challenges: availableChallenges,
        };
    }

    async complete(userId: string, challengeId: string) {
        // Verificar se desafio existe
        const challenge = await this.prisma.challenge.findUnique({
            where: { id: challengeId },
        });

        if (!challenge) {
            throw new NotFoundException('Challenge not found');
        }

        // Verificar se já completou hoje
        const today = new Date();
        const existingCompletion = await this.prisma.userChallenge.findFirst({
            where: {
                userId,
                challengeId,
                completedAt: {
                    gte: startOfDay(today),
                    lte: endOfDay(today),
                },
            },
        });

        if (existingCompletion) {
            throw new BadRequestException('Challenge already completed today');
        }

        // Criar UserChallenge
        await this.prisma.userChallenge.create({
            data: {
                userId,
                challengeId,
                completedAt: new Date(),
            },
        });

        // Adicionar XP
        const updatedUser = await this.usersService.addXP(userId, challenge.xpReward);

        // Verificar badge "Mestre do Bem-Estar"
        await this.gamificationService.checkChallengesMasterBadge(userId);

        this.logger.log(`Challenge completed: ${challenge.title} by user ${userId}`);

        return {
            challenge,
            xpEarned: challenge.xpReward,
            totalXP: updatedUser.xp,
            newLevel: updatedUser.level,
        };
    }
}
