import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { IMoodLogRepository } from './mood-log.repository.interface';
import { MoodLog } from '@prisma/client';
import { startOfDay, endOfDay } from 'date-fns';

@Injectable()
export class MoodLogRepository implements IMoodLogRepository {
    constructor(private readonly prisma: PrismaService) { }

    async create(data: { userId: string; mood: number; tags: string; note?: string | null }): Promise<MoodLog> {
        return this.prisma.moodLog.create({ data });
    }

    async update(id: string, data: Partial<MoodLog>): Promise<MoodLog> {
        return this.prisma.moodLog.update({ where: { id }, data });
    }

    async findTodayByUser(userId: string): Promise<MoodLog | null> {
        const today = new Date();
        return this.prisma.moodLog.findFirst({
            where: {
                userId,
                loggedAt: { gte: startOfDay(today), lte: endOfDay(today) },
            },
        });
    }

    async findHistory(userId: string, take: number): Promise<MoodLog[]> {
        return this.prisma.moodLog.findMany({
            where: { userId },
            orderBy: { loggedAt: 'desc' },
            take,
        });
    }

    /**
     * Seção 6 (Fase 5) — Cursor-based pagination com keyset (loggedAt + id).
     * Mais performático que OFFSET em datasets grandes: O(log n) via índice.
     * Não sofre page drift ao inserir novos registros durante navegação.
     */
    async findHistoryWithCursor(
        userId: string,
        take: number,
        cursorDate?: Date,
        cursorId?: string,
    ): Promise<MoodLog[]> {
        return this.prisma.moodLog.findMany({
            where: {
                userId,
                ...(cursorDate && cursorId
                    ? {
                        OR: [
                            { loggedAt: { lt: cursorDate } },
                            { loggedAt: cursorDate, id: { lt: cursorId } },
                        ],
                    }
                    : {}),
            },
            orderBy: [{ loggedAt: 'desc' }, { id: 'desc' }],
            take,
        });
    }

    async countByUser(userId: string): Promise<number> {
        return this.prisma.moodLog.count({ where: { userId } });
    }
}

