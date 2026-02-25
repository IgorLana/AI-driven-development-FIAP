import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from '../../src/modules/auth/auth.service';
import { TokenService } from '../../src/modules/auth/token.service';
import { PrismaService } from '../../src/prisma/prisma.service';
import { ConfigService } from '@nestjs/config';
import { USER_REPOSITORY, IUserRepository } from '../../src/modules/users/repositories/user.repository.interface';
import {
    ConflictException,
    NotFoundException,
    UnauthorizedException,
} from '@nestjs/common';

/**
 * ✅ CORREÇÃO: Teste atualizado para usar Repository Pattern
 * AuthService agora depende de IUserRepository (abstração) via injection token
 */
describe('AuthService', () => {
    let service: AuthService;
    let prismaService: jest.Mocked<PrismaService>;
    let userRepository: jest.Mocked<IUserRepository>;
    let tokenService: jest.Mocked<TokenService>;
    let configService: jest.Mocked<ConfigService>;

    const mockCompany = { id: 'company-1', domain: 'acme.com', name: 'Acme Corp' };
    const mockUser = {
        id: 'user-1',
        companyId: 'company-1',
        name: 'Test User',
        email: 'test@acme.com',
        passwordHash: '$2b$12$hashedpassword',
        role: 'EMPLOYEE',
        xp: 0,
        level: 1,
        refreshTokenHash: null,
        createdAt: new Date(),
        updatedAt: new Date(),
    };

    beforeEach(async () => {
        const prismaMock = {
            company: { findUnique: jest.fn() },
            user: { findUnique: jest.fn(), create: jest.fn(), update: jest.fn() },
        };

        // ✅ Mock do Repository (abstração)
        const userRepositoryMock = {
            findByEmailAndCompany: jest.fn(),
            create: jest.fn(),
            findById: jest.fn(),
            addXP: jest.fn(),
        };

        const tokenServiceMock = {
            generateTokens: jest.fn().mockReturnValue({
                accessToken: 'mock-access-token',
                refreshToken: 'mock-refresh-token',
            }),
            verifyToken: jest.fn(),
            saveRefreshTokenHash: jest.fn().mockResolvedValue(undefined),
            validateRefreshTokenHash: jest.fn(),
            revokeRefreshToken: jest.fn().mockResolvedValue(undefined),
        };

        const configServiceMock = {
            get: jest.fn((key: string, defaultValue?: unknown) => {
                const config: Record<string, unknown> = { BCRYPT_ROUNDS: 4 }; // rounds baixo para testes rápidos
                return config[key] ?? defaultValue;
            }),
        };

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                AuthService,
                { provide: PrismaService, useValue: prismaMock },
                { provide: USER_REPOSITORY, useValue: userRepositoryMock },
                { provide: TokenService, useValue: tokenServiceMock },
                { provide: ConfigService, useValue: configServiceMock },
            ],
        }).compile();

        service = module.get<AuthService>(AuthService);
        prismaService = module.get(PrismaService) as jest.Mocked<PrismaService>;
        userRepository = module.get(USER_REPOSITORY) as jest.Mocked<IUserRepository>;
        tokenService = module.get(TokenService) as jest.Mocked<TokenService>;
        configService = module.get(ConfigService) as jest.Mocked<ConfigService>;
    });

    describe('login', () => {
        it('deve retornar tokens quando credenciais forem válidas', async () => {
            // Arrange
            const bcrypt = require('bcrypt');
            const hash = await bcrypt.hash('senha123', 4);
            const userWithHash = { ...mockUser, passwordHash: hash };

            (prismaService.company.findUnique as jest.Mock).mockResolvedValue(mockCompany);
            // ✅ Usa repository ao invés de prisma direto
            userRepository.findByEmailAndCompany.mockResolvedValue(userWithHash);

            // Act
            const result = await service.login({
                email: 'test@acme.com',
                password: 'senha123',
                companyDomain: 'acme.com',
            });

            // Assert
            expect(result.accessToken).toBe('mock-access-token');
            expect(result.refreshToken).toBe('mock-refresh-token');
            expect(result.user.email).toBe('test@acme.com');
            expect(tokenService.generateTokens).toHaveBeenCalledWith(userWithHash);
            expect(tokenService.saveRefreshTokenHash).toHaveBeenCalled();
            // ✅ Verifica chamada do repository
            expect(userRepository.findByEmailAndCompany).toHaveBeenCalledWith('test@acme.com', 'company-1');
        });

        it('deve lançar UnauthorizedException se empresa não existir', async () => {
            // Arrange
            (prismaService.company.findUnique as jest.Mock).mockResolvedValue(null);

            // Act & Assert
            await expect(
                service.login({ email: 'test@acme.com', password: 'senha123', companyDomain: 'unknown.com' }),
            ).rejects.toThrow(UnauthorizedException);
        });

        it('deve lançar UnauthorizedException se email não existir na empresa', async () => {
            // Arrange — Seção 4: isolamento multi-tenant
            (prismaService.company.findUnique as jest.Mock).mockResolvedValue(mockCompany);
            // ✅ Repository retorna null (usuário não encontrado)
            userRepository.findByEmailAndCompany.mockResolvedValue(null);

            // Act & Assert
            await expect(
                service.login({ email: 'naoexiste@acme.com', password: 'senha123', companyDomain: 'acme.com' }),
            ).rejects.toThrow(UnauthorizedException);
        });

        it('deve lançar UnauthorizedException com senha incorreta', async () => {
            // Arrange
            (prismaService.company.findUnique as jest.Mock).mockResolvedValue(mockCompany);
            // ✅ Repository retorna usuário, mas password não vai bater
            userRepository.findByEmailAndCompany.mockResolvedValue(mockUser); // hash não bate

            // Act & Assert
            await expect(
                service.login({ email: 'test@acme.com', password: 'senhaErrada', companyDomain: 'acme.com' }),
            ).rejects.toThrow(UnauthorizedException);
        });

        it('deve usar email da empresa (isolamento) sem vazar para outras empresas', async () => {
            // Arrange — Garante que busca usa email_companyId, não email global
            (prismaService.company.findUnique as jest.Mock).mockResolvedValue(mockCompany);
            (prismaService.user.findUnique as jest.Mock).mockResolvedValue(null);

            await expect(
                service.login({ email: 'test@acme.com', password: 'qualquer', companyDomain: 'acme.com' }),
            ).rejects.toThrow(UnauthorizedException);

            // Assert: busca usa compound unique key (email + companyId)
            expect(prismaService.user.findUnique).toHaveBeenCalledWith({
                where: { email_companyId: { email: 'test@acme.com', companyId: mockCompany.id } },
            });
        });
    });

    describe('register', () => {
        it('deve registrar novo usuário e retornar tokens', async () => {
            // Arrange
            (prismaService.company.findUnique as jest.Mock).mockResolvedValue(mockCompany);
            (prismaService.user.findUnique as jest.Mock).mockResolvedValue(null); // não existe ainda
            (prismaService.user.create as jest.Mock).mockResolvedValue(mockUser);

            // Act
            const result = await service.register({
                name: 'Test User',
                email: 'test@acme.com',
                password: 'senha123',
                companyDomain: 'acme.com',
            });

            // Assert
            expect(result.accessToken).toBe('mock-access-token');
            expect(prismaService.user.create).toHaveBeenCalledWith(
                expect.objectContaining({
                    data: expect.objectContaining({
                        companyId: mockCompany.id,
                        email: 'test@acme.com', // lowercase
                        role: 'EMPLOYEE',
                    }),
                }),
            );
        });

        it('deve lançar ConflictException se email já existe na empresa', async () => {
            // Arrange
            (prismaService.company.findUnique as jest.Mock).mockResolvedValue(mockCompany);
            (prismaService.user.findUnique as jest.Mock).mockResolvedValue(mockUser);

            // Act & Assert
            await expect(
                service.register({
                    name: 'Test User',
                    email: 'test@acme.com',
                    password: 'senha123',
                    companyDomain: 'acme.com',
                }),
            ).rejects.toThrow(ConflictException);
        });

        it('deve lançar NotFoundException para empresa inválida', async () => {
            // Arrange
            (prismaService.company.findUnique as jest.Mock).mockResolvedValue(null);

            // Act & Assert
            await expect(
                service.register({
                    name: 'Test', email: 'x@unknown.com', password: '123456789', companyDomain: 'unknown.com',
                }),
            ).rejects.toThrow(NotFoundException);
        });
    });

    describe('logout', () => {
        it('deve revogar o refresh token do usuário', async () => {
            // Act
            const result = await service.logout('user-1');

            // Assert
            expect(tokenService.revokeRefreshToken).toHaveBeenCalledWith('user-1');
            expect(result.message).toBe('Logged out successfully');
        });
    });

    describe('refresh', () => {
        it('deve lançar UnauthorizedException para token revogado (refreshTokenHash null)', async () => {
            // Arrange
            tokenService.verifyToken = jest.fn().mockReturnValue({ sub: 'user-1' });
            (prismaService.user.findUnique as jest.Mock).mockResolvedValue({ ...mockUser, refreshTokenHash: null });

            // Act & Assert
            await expect(service.refresh('any-token')).rejects.toThrow(UnauthorizedException);
        });

        it('deve lançar UnauthorizedException para hash inválido (token já rotacionado)', async () => {
            // Arrange — ataque de replay com token antigo
            tokenService.verifyToken = jest.fn().mockReturnValue({ sub: 'user-1' });
            (prismaService.user.findUnique as jest.Mock).mockResolvedValue({
                ...mockUser,
                refreshTokenHash: '$2b$12$wronghash',
            });
            tokenService.validateRefreshTokenHash = jest.fn().mockResolvedValue(false);

            // Act & Assert
            await expect(service.refresh('stale-refresh-token')).rejects.toThrow(UnauthorizedException);
        });
    });
});
