import { Test, TestingModule } from '@nestjs/testing';
import { GamificationService } from '../../src/modules/gamification/gamification.service';
import { PrismaService } from '../../src/prisma/prisma.service';
import { IUserRepository, USER_REPOSITORY } from '../../src/modules/users/repositories/user.repository.interface';
import { BadgeType } from '../../src/common/enums/badge-type.enum';
import { MoodLogCreatedEvent } from '../../src/common/events/mood-log-created.event';
import { ChallengeCompletedEvent } from '../../src/common/events/challenge-completed.event';

/**
 * Seção 6 (Fase 4) — Testes unitários GamificationService.
 * Mock de IUserRepository (DIP) e PrismaService.
 * Valida: award de XP via eventos, lógica de badge (idempotência), registro via BadgeType enum.
 */
describe('GamificationService', () => {
    let service: GamificationService;
    let userRepository: jest.Mocked<IUserRepository>;
    let prismaService: jest.Mocked<PrismaService>;

    const mockUser = { id: 'user-1', email: 'test@acme.com', xp: 50, level: 1 };

    beforeEach(async () => {
        const userRepoMock: Partial<IUserRepository> = {
            addXP: jest.fn().mockResolvedValue({ xp: 55, level: 1, email: 'test@acme.com' }),
        };

        const prismaMock = {
            badge: {
                findFirst: jest.fn(),
                create: jest.fn(),
            },
            moodLog: {
                count: jest.fn(),
            },
            userChallenge: {
                count: jest.fn(),
            },
        };

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                GamificationService,
                { provide: USER_REPOSITORY, useValue: userRepoMock },
                { provide: PrismaService, useValue: prismaMock },
            ],
        }).compile();

        service = module.get<GamificationService>(GamificationService);
        userRepository = module.get(USER_REPOSITORY) as jest.Mocked<IUserRepository>;
        prismaService = module.get(PrismaService) as jest.Mocked<PrismaService>;
    });

    describe('handleMoodLogCreated', () => {
        it('deve adicionar XP ao usuário quando mood log é criado', async () => {
            // Arrange
            const event = new MoodLogCreatedEvent('user-1', 'mood-1', 5);
            (prismaService.moodLog.count as jest.Mock).mockResolvedValue(2); // não é o primeiro

            // Act
            await service.handleMoodLogCreated(event);

            // Assert
            expect(userRepository.addXP).toHaveBeenCalledWith('user-1', 5);
        });

        it('deve conceder badge FIRST_STEP no primeiro mood log', async () => {
            // Arrange
            const event = new MoodLogCreatedEvent('user-1', 'mood-1', 5);
            (prismaService.moodLog.count as jest.Mock).mockResolvedValue(1); // primeiro!
            (prismaService.badge.findFirst as jest.Mock).mockResolvedValue(null); // badge ainda não existe
            (prismaService.badge.create as jest.Mock).mockResolvedValue({
                id: 'badge-1',
                name: BadgeType.FIRST_STEP,
            });

            // Act
            await service.handleMoodLogCreated(event);

            // Assert
            expect(prismaService.badge.create).toHaveBeenCalledWith({
                data: expect.objectContaining({
                    userId: 'user-1',
                    name: BadgeType.FIRST_STEP,
                }),
            });
        });

        it('não deve conceder badge duplicado (idempotência)', async () => {
            // Arrange
            const event = new MoodLogCreatedEvent('user-1', 'mood-2', 5);
            (prismaService.moodLog.count as jest.Mock).mockResolvedValue(1);
            // Badge já existe
            (prismaService.badge.findFirst as jest.Mock).mockResolvedValue({
                id: 'badge-existing',
                name: BadgeType.FIRST_STEP,
            });

            // Act
            await service.handleMoodLogCreated(event);

            // Assert — não cria badge duplicado
            expect(prismaService.badge.create).not.toHaveBeenCalled();
        });
    });

    describe('handleChallengeCompleted', () => {
        it('deve adicionar XP com o reward do desafio', async () => {
            // Arrange
            const event = new ChallengeCompletedEvent('user-1', 'challenge-1', 20);
            (prismaService.userChallenge.count as jest.Mock).mockResolvedValue(5); // não atingiu 100

            // Act
            await service.handleChallengeCompleted(event);

            // Assert
            expect(userRepository.addXP).toHaveBeenCalledWith('user-1', 20);
        });

        it('deve conceder badge WELLNESS_MASTER ao completar 100 desafios', async () => {
            // Arrange
            const event = new ChallengeCompletedEvent('user-1', 'challenge-100', 10);
            (prismaService.userChallenge.count as jest.Mock).mockResolvedValue(100);
            (prismaService.badge.findFirst as jest.Mock).mockResolvedValue(null);
            (prismaService.badge.create as jest.Mock).mockResolvedValue({
                id: 'badge-master',
                name: BadgeType.WELLNESS_MASTER,
            });

            // Act
            await service.handleChallengeCompleted(event);

            // Assert
            expect(prismaService.badge.create).toHaveBeenCalledWith({
                data: expect.objectContaining({
                    name: BadgeType.WELLNESS_MASTER,
                }),
            });
        });
    });

    describe('checkAndAwardBadge', () => {
        it('deve retornar null se usuário já possui o badge', async () => {
            // Arrange
            (prismaService.badge.findFirst as jest.Mock).mockResolvedValue({ id: 'badge-1' });

            // Act
            const result = await service.checkAndAwardBadge('user-1', BadgeType.FIRST_STEP);

            // Assert
            expect(result).toBeNull();
            expect(prismaService.badge.create).not.toHaveBeenCalled();
        });

        it('deve usar descrição do registry BadgeType (OCP — sem switch/case)', async () => {
            // Arrange — Seção 1.1: verifica que Open/Closed está funcionando
            (prismaService.badge.findFirst as jest.Mock).mockResolvedValue(null);
            (prismaService.badge.create as jest.Mock).mockResolvedValue({
                id: 'badge-new',
                name: BadgeType.CONSISTENT,
                description: '7 dias consecutivos de check-in',
            });

            // Act
            await service.checkAndAwardBadge('user-1', BadgeType.CONSISTENT);

            // Assert — descrição vem do registry, não de hardcode
            expect(prismaService.badge.create).toHaveBeenCalledWith({
                data: expect.objectContaining({
                    name: BadgeType.CONSISTENT,
                    description: '7 dias consecutivos de check-in',
                }),
            });
        });
    });
});
