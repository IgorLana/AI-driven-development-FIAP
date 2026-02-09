import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateMoodLogDto } from './dto/create-mood-log.dto';
import { UsersService } from '../users/users.service';
import { GamificationService } from '../gamification/gamification.service';
import { startOfDay, endOfDay } from 'date-fns';

@Injectable()
export class MoodLogsService {
    private readonly logger = new Logger(MoodLogsService.name);

    constructor(
        private prisma: PrismaService,
        private usersService: UsersService,
        private gamificationService: GamificationService,
    ) { }

    async create(userId: string, createMoodLogDto: CreateMoodLogDto) {
        const { mood, tags, note } = createMoodLogDto;

        // Verificar se já existe mood log hoje
        const today = new Date();
        const existingMoodLog = await this.prisma.moodLog.findFirst({
            where: {
                userId,
                loggedAt: {
                    gte: startOfDay(today),
                    lte: endOfDay(today),
                },
            },
        });

        let moodLog;
        const tagsString = tags ? tags.map((t) => t.toLowerCase()).join(',') : '';

        if (existingMoodLog) {
            // Sobrescrever mood log existente
            moodLog = await this.prisma.moodLog.update({
                where: { id: existingMoodLog.id },
                data: {
                    mood,
                    tags: tagsString,
                    note: note || null,
                },
            });
            this.logger.log(`Mood log updated for user ${userId}`);
        } else {
            // Criar novo mood log
            moodLog = await this.prisma.moodLog.create({
                data: {
                    userId,
                    mood,
                    tags: tagsString,
                    note: note || null,
                },
            });
            this.logger.log(`Mood log created for user ${userId}`);
        }

        // Adicionar +5 XP
        const updatedUser = await this.usersService.addXP(userId, 5);

        // Verificar badge "Primeiro Passo"
        await this.gamificationService.checkFirstMoodLogBadge(userId);

        return {
            id: moodLog.id,
            userId: moodLog.userId,
            mood: moodLog.mood,
            tags: moodLog.tags ? moodLog.tags.split(',') : [],
            note: moodLog.note,
            loggedAt: moodLog.loggedAt.toISOString(),
            xpEarned: 5,
            newLevel: updatedUser.level,
        };
    }

    async findHistory(userId: string, limit: number = 7) {
        const maxLimit = Math.min(limit, 30);

        const moodLogs = await this.prisma.moodLog.findMany({
            where: { userId },
            orderBy: { loggedAt: 'desc' },
            take: maxLimit,
        });

        return {
            data: moodLogs.map((log) => ({
                id: log.id,
                userId: log.userId,
                mood: log.mood,
                tags: log.tags ? log.tags.split(',') : [],
                note: log.note,
                loggedAt: log.loggedAt.toISOString(),
                createdAt: log.createdAt.toISOString(),
            })),
        };
    }
}
