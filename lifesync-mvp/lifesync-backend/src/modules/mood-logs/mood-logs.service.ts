import { Injectable, Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { MOOD_LOG_REPOSITORY, IMoodLogRepository } from './repositories/mood-log.repository.interface';
import { Inject } from '@nestjs/common';
import { CreateMoodLogDto } from './dto/create-mood-log.dto';
import { MoodLogCreatedEvent } from '../../common/events/mood-log-created.event';
import { tagsToString, stringToTags } from '../../common/utils/tags.utils';

/**
 * Seção 3 (Fase 5) — usa helpers tagsToString/stringToTags (elimina duplicação).
 * Seção 6 (Fase 5) — cursor-based pagination substituindo limit fixo.
 * Seção 1 (Fase 5) — readonly em todas as injeções.
 */
@Injectable()
export class MoodLogsService {
    private readonly logger = new Logger(MoodLogsService.name);

    constructor(
        @Inject(MOOD_LOG_REPOSITORY)
        private readonly moodLogRepository: IMoodLogRepository,
        private readonly eventEmitter: EventEmitter2,
    ) { }

    async create(userId: string, createMoodLogDto: CreateMoodLogDto) {
        const { mood, tags, note } = createMoodLogDto;
        // Seção 3 — helper centralizado (antes: tags.map(t => t.toLowerCase()).join(','))
        const tagsString = tagsToString(tags);

        const existingMoodLog = await this.moodLogRepository.findTodayByUser(userId);

        let moodLog;
        if (existingMoodLog) {
            moodLog = await this.moodLogRepository.update(existingMoodLog.id, {
                mood,
                tags: tagsString,
                note: note ?? null,
            });
            this.logger.log(`Mood log updated for user ${userId}`);
        } else {
            moodLog = await this.moodLogRepository.create({ userId, mood, tags: tagsString, note: note ?? null });
            this.logger.log(`Mood log created for user ${userId}`);
        }

        this.eventEmitter.emit(
            'mood-log.created',
            new MoodLogCreatedEvent(userId, moodLog.id, 5),
        );

        return {
            id: moodLog.id,
            userId: moodLog.userId,
            mood: moodLog.mood,
            tags: stringToTags(moodLog.tags), // Seção 3 — helper centralizado
            note: moodLog.note,
            loggedAt: moodLog.loggedAt.toISOString(),
            xpEarned: 5,
        };
    }

    /**
     * Seção 6 (Fase 5) — Cursor-based pagination.
     * Substitui limit fixo por cursor opaco (base64 de loggedAt + id).
     * Vantagem: não sofre page drift ao inserir novos registros mid-page.
     */
    async findHistory(
        userId: string,
        limit: number = 7,
        cursor?: string,
    ) {
        const take = Math.min(limit, 30);
        let cursorDate: Date | undefined;
        let cursorId: string | undefined;

        // Decodifica cursor opaco
        if (cursor) {
            try {
                const decoded = Buffer.from(cursor, 'base64').toString('utf-8');
                const { loggedAt, id } = JSON.parse(decoded);
                cursorDate = new Date(loggedAt);
                cursorId = id;
            } catch {
                // cursor inválido → ignora, retorna do início
            }
        }

        const moodLogs = await this.moodLogRepository.findHistoryWithCursor(
            userId,
            take,
            cursorDate,
            cursorId,
        );

        // Gera cursor para a próxima página
        let nextCursor: string | null = null;
        if (moodLogs.length === take) {
            const last = moodLogs[moodLogs.length - 1];
            nextCursor = Buffer.from(
                JSON.stringify({ loggedAt: last.loggedAt.toISOString(), id: last.id }),
            ).toString('base64');
        }

        return {
            data: moodLogs.map((log) => ({
                id: log.id,
                userId: log.userId,
                mood: log.mood,
                tags: stringToTags(log.tags), // Seção 3 — helper centralizado
                note: log.note,
                loggedAt: log.loggedAt.toISOString(),
                createdAt: log.createdAt.toISOString(),
            })),
            nextCursor,
        };
    }
}
