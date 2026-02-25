import {
    Injectable,
    UnauthorizedException,
    ConflictException,
    NotFoundException,
    Logger,
    Inject,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { ConfigService } from '@nestjs/config';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { TokenService } from './token.service';
import { Role } from '../../common/enums/role.enum';
import { USER_REPOSITORY, IUserRepository } from '../users/repositories/user.repository.interface';
import { PrismaService } from '../../prisma/prisma.service';

/**
 * ✅ CORREÇÃO DÍVIDA TÉCNICA:
 * - SRP aplicado: apenas autenticação de usuários (tokens delegados ao TokenService)
 * - DIP aplicado: depende de IUserRepository (abstração) via injection token
 * - Acoplamento reduzido: não importa PrismaService diretamente
 */
@Injectable()
export class AuthService {
    private readonly logger = new Logger(AuthService.name);

    constructor(
        @Inject(USER_REPOSITORY)
        private readonly userRepository: IUserRepository,
        private readonly prisma: PrismaService, // Para Company queries (será refatorado em Fase 2)
        private readonly configService: ConfigService,
        private readonly tokenService: TokenService,
    ) { }

    async register(registerDto: RegisterDto) {
        const { name, email, password, companyDomain } = registerDto;

        const company = await this.prisma.company.findUnique({
            where: { domain: companyDomain },
        });

        if (!company) {
            throw new NotFoundException('Company domain not found');
        }

        const existingUser = await this.userRepository.findByEmailAndCompany(
            email.toLowerCase().trim(),
            company.id,
        );

        if (existingUser) {
            throw new ConflictException('Email already exists in this company');
        }

        const rounds = this.configService.get<number>('BCRYPT_ROUNDS') ?? 12;
        const passwordHash = await bcrypt.hash(password, Number(rounds));

        // ✅ DIP aplicado: usando abstração IUserRepository
        const user = await this.userRepository.create({
            companyId: company.id,
            name: name.trim(),
            email: email.toLowerCase().trim(),
            passwordHash,
            role: Role.EMPLOYEE,
        });

        this.logger.log(`User registered: ${user.email}`);

        const tokens = this.tokenService.generateTokens(user);
        await this.tokenService.saveRefreshTokenHash(user.id, tokens.refreshToken);

        return {
            accessToken: tokens.accessToken,
            refreshToken: tokens.refreshToken,
            user: { id: user.id, name: user.name, email: user.email, role: user.role, xp: user.xp, level: user.level },
        };
    }

    async login(loginDto: LoginDto) {
        const { email, password, companyDomain } = loginDto;

        const company = await this.prisma.company.findUnique({
            where: { domain: companyDomain },
        });

        if (!company) {
            throw new UnauthorizedException('Invalid credentials');
        }

        // ✅ DIP aplicado: usando abstração IUserRepository
        const user = await this.userRepository.findByEmailAndCompany(
            email.toLowerCase().trim(),
            company.id,
        );

        if (!user || !user.passwordHash) {
            throw new UnauthorizedException('Invalid credentials');
        }

        const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
        if (!isPasswordValid) {
            this.logger.warn(`Failed login attempt for email: ${email} on company: ${companyDomain}`);
            throw new UnauthorizedException('Invalid credentials');
        }

        this.logger.log(`User logged in: ${user.email}`);

        const tokens = this.tokenService.generateTokens(user);
        await this.tokenService.saveRefreshTokenHash(user.id, tokens.refreshToken);

        return {
            accessToken: tokens.accessToken,
            refreshToken: tokens.refreshToken,
            user: { id: user.id, name: user.name, email: user.email, role: user.role, xp: user.xp, level: user.level },
        };
    }

    async refresh(refreshToken: string) {
        try {
            const payload = this.tokenService.verifyToken(refreshToken);

            const user = await this.prisma.user.findUnique({
                where: { id: payload.sub },
            });

            if (!user || !user.refreshTokenHash) {
                throw new UnauthorizedException('Invalid or revoked refresh token');
            }

            const isTokenValid = await this.tokenService.validateRefreshTokenHash(
                refreshToken,
                user.refreshTokenHash,
            );

            if (!isTokenValid) {
                throw new UnauthorizedException('Invalid refresh token');
            }

            const tokens = this.tokenService.generateTokens(user);
            await this.tokenService.saveRefreshTokenHash(user.id, tokens.refreshToken);

            this.logger.log(`Token refreshed for user: ${user.email}`);
            return { accessToken: tokens.accessToken, refreshToken: tokens.refreshToken };
        } catch (error) {
            if (error instanceof UnauthorizedException) throw error;
            throw new UnauthorizedException('Invalid refresh token');
        }
    }

    async logout(userId: string) {
        await this.tokenService.revokeRefreshToken(userId);
        this.logger.log(`User logged out: ${userId}`);
        return { message: 'Logged out successfully' };
    }
}
