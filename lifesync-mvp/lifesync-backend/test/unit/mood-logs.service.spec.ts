import { Test, TestingModule } from '@nestjs/testing';
import { MoodLogsService } from '../../src/modules/mood-logs/mood-logs.service';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { IMoodLogRepository, MOOD_LOG_REPOSITORY } from '../../src/modules/mood-logs/repositories/mood-log.repository.interface';
import { MoodLogCreatedEvent } from '../../src/common/events/mood-log-created.event';
import { MoodLog } from '@prisma/client';

/**
 * Seção 6 (Fase 4) — Testes unitários MoodLogsService.
 * Mock de IMoodLogRepository (não MoodLogRepository concreto) — DIP em ação.
 * DateService mockado para testar lógica "hoje" de forma determinística.
 */
describe('MoodLogsService', () => {
    let service: MoodLogsService;
    let moodLogRepository: jest.Mocked<IMoodLogRepository>;
    let eventEmitter: jest.Mocked<EventEmitter2>;

    const today = new Date();
    const mockMoodLog: MoodLog = {
        id: 'mood-1',
        userId: 'user-1',
        mood: 4,
        tags: 'foco,produtivo',
        note: 'Ótimo dia',
        loggedAt: today,
        createdAt: today,
    };

    beforeEach(async () => {
        const moodLogRepoMock: Partial<IMoodLogRepository> = {
            create: jest.fn(),
            update: jest.fn(),
            findTodayByUser: jest.fn(),
            findHistory: jest.fn(),
            findHistoryWithCursor: jest.fn(), // Fase 5 — cursor pagination
            countByUser: jest.fn(),
        };

        const eventEmitterMock = {
            emit: jest.fn(),
        };

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                MoodLogsService,
                { provide: MOOD_LOG_REPOSITORY, useValue: moodLogRepoMock },
                { provide: EventEmitter2, useValue: eventEmitterMock },
            ],
        }).compile();

        service = module.get<MoodLogsService>(MoodLogsService);
        moodLogRepository = module.get(MOOD_LOG_REPOSITORY) as jest.Mocked<IMoodLogRepository>;
        eventEmitter = module.get(EventEmitter2) as jest.Mocked<EventEmitter2>;
    });

    describe('create', () => {
        it('deve criar novo mood log e emitir MoodLogCreatedEvent', async () => {
            // Arrange
            (moodLogRepository.findTodayByUser as jest.Mock).mockResolvedValue(null);
            (moodLogRepository.create as jest.Mock).mockResolvedValue(mockMoodLog);

            // Act
            const result = await service.create('user-1', {
                mood: 4,
                tags: ['foco', 'produtivo'],
                note: 'Ótimo dia',
            });

            // Assert
            expect(moodLogRepository.create).toHaveBeenCalledWith({
                userId: 'user-1',
                mood: 4,
                tags: 'foco,produtivo',
                note: 'Ótimo dia',
            });
            expect(result.mood).toBe(4);
            expect(result.tags).toEqual(['foco', 'produtivo']);
            expect(result.xpEarned).toBe(5);

            // Seção 5 — EventEmitter: verifica que evento correto foi emitido
            expect(eventEmitter.emit).toHaveBeenCalledWith(
                'mood-log.created',
                expect.any(MoodLogCreatedEvent),
            );
        });

        it('deve atualizar mood log existente no mesmo dia', async () => {
            // Arrange — já existe log de hoje
            const existingLog = { ...mockMoodLog, mood: 2 };
            const updatedLog = { ...mockMoodLog, mood: 4, tags: 'ansioso' };

            (moodLogRepository.findTodayByUser as jest.Mock).mockResolvedValue(existingLog);
            (moodLogRepository.update as jest.Mock).mockResolvedValue(updatedLog);

            // Act
            const result = await service.create('user-1', { mood: 4, tags: ['ansioso'], note: undefined });

            // Assert
            expect(moodLogRepository.update).toHaveBeenCalledWith(existingLog.id, {
                mood: 4,
                tags: 'ansioso',
                note: null, // service usa note ?? null
            });
            expect(moodLogRepository.create).not.toHaveBeenCalled();

            // Evento ainda deve ser emitido mesmo no update
            expect(eventEmitter.emit).toHaveBeenCalledWith(
                'mood-log.created',
                expect.any(MoodLogCreatedEvent),
            );
        });

        it('deve converter tags array para string com vírgulas', async () => {
            // Arrange
            (moodLogRepository.findTodayByUser as jest.Mock).mockResolvedValue(null);
            (moodLogRepository.create as jest.Mock).mockResolvedValue({
                ...mockMoodLog,
                tags: 'energia,foco,tranquilo',
            });

            // Act
            const result = await service.create('user-1', {
                mood: 5,
                tags: ['Energia', 'FOCO', 'Tranquilo'], // deve normalizar para lowercase
            });

            // Assert
            expect(moodLogRepository.create).toHaveBeenCalledWith(
                expect.objectContaining({ tags: 'energia,foco,tranquilo' }),
            );
        });

        it('deve tratar tags undefined como string vazia', async () => {
            // Arrange
            (moodLogRepository.findTodayByUser as jest.Mock).mockResolvedValue(null);
            (moodLogRepository.create as jest.Mock).mockResolvedValue({ ...mockMoodLog, tags: '' });

            // Act
            await service.create('user-1', { mood: 3, note: 'sem tags' });

            // Assert
            expect(moodLogRepository.create).toHaveBeenCalledWith(
                expect.objectContaining({ tags: '' }),
            );
        });
    });

    describe('findHistory', () => {
        it('deve retornar histórico limitado a 7 por padrão', async () => {
            // Arrange
            const logs = Array.from({ length: 5 }, (_, i) => ({
                ...mockMoodLog,
                id: `mood-${i}`,
                mood: i + 1,
            }));
            (moodLogRepository.findHistoryWithCursor as jest.Mock).mockResolvedValue(logs);

            // Act
            const result = await service.findHistory('user-1');

            // Assert
            expect(moodLogRepository.findHistoryWithCursor).toHaveBeenCalledWith('user-1', 7, undefined, undefined);
            expect(result.data).toHaveLength(5);
        });

        it('não deve ultrapassar limite máximo de 30', async () => {
            // Arrange
            (moodLogRepository.findHistoryWithCursor as jest.Mock).mockResolvedValue([]);

            // Act
            await service.findHistory('user-1', 999);

            // Assert — cap em 30
            expect(moodLogRepository.findHistoryWithCursor).toHaveBeenCalledWith('user-1', 30, undefined, undefined);
        });

        it('deve serializar loggedAt como ISO string', async () => {
            // Arrange
            const fixedDate = new Date('2026-02-25T14:00:00.000Z');
            (moodLogRepository.findHistoryWithCursor as jest.Mock).mockResolvedValue([
                { ...mockMoodLog, loggedAt: fixedDate },
            ]);

            // Act
            const result = await service.findHistory('user-1');

            // Assert
            expect(result.data[0].loggedAt).toBe('2026-02-25T14:00:00.000Z');
        });
    });
});
