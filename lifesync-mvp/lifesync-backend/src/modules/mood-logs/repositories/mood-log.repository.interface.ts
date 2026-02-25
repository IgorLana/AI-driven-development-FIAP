import { MoodLog } from '@prisma/client';

export interface IMoodLogRepository {
    create(data: {
        userId: string;
        mood: number;
        tags: string;
        note?: string | null;
    }): Promise<MoodLog>;
    update(id: string, data: Partial<MoodLog>): Promise<MoodLog>;
    findTodayByUser(userId: string): Promise<MoodLog | null>;
    findHistory(userId: string, take: number): Promise<MoodLog[]>;
    findHistoryWithCursor(
        userId: string,
        take: number,
        cursorDate?: Date,
        cursorId?: string,
    ): Promise<MoodLog[]>;
    countByUser(userId: string): Promise<number>;
}

export const MOOD_LOG_REPOSITORY = 'MOOD_LOG_REPOSITORY';
