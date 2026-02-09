import {
    Injectable,
    UnauthorizedException,
    ConflictException,
    NotFoundException,
    Logger,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../../prisma/prisma.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { JwtPayload } from './interfaces/jwt-payload.interface';

@Injectable()
export class AuthService {
    private readonly logger = new Logger(AuthService.name);

    constructor(
        private prisma: PrismaService,
        private jwtService: JwtService,
        private configService: ConfigService,
    ) { }

    async register(registerDto: RegisterDto) {
        const { name, email, password, companyDomain } = registerDto;

        // Verificar se empresa existe
        const company = await this.prisma.company.findUnique({
            where: { domain: companyDomain },
        });

        if (!company) {
            throw new NotFoundException('Company domain not found');
        }

        // Verificar se email já existe na empresa
        const existingUser = await this.prisma.user.findUnique({
            where: {
                email_companyId: {
                    email: email.toLowerCase().trim(),
                    companyId: company.id,
                },
            },
        });

        if (existingUser) {
            throw new ConflictException('Email already exists in this company');
        }

        // Hash password
        const passwordHash = await bcrypt.hash(password, 10);

        // Criar usuário
        const user = await this.prisma.user.create({
            data: {
                companyId: company.id,
                name: name.trim(),
                email: email.toLowerCase().trim(),
                passwordHash,
                role: 'EMPLOYEE',
                xp: 0,
                level: 1,
            },
        });

        this.logger.log(`User registered: ${user.email}`);

        // Gerar tokens
        const tokens = await this.generateTokens(user);

        return {
            accessToken: tokens.accessToken,
            refreshToken: tokens.refreshToken,
            user: {
                id: user.id,
                name: user.name,
                email: user.email,
                role: user.role,
                xp: user.xp,
                level: user.level,
            },
        };
    }

    async login(loginDto: LoginDto) {
        const { email, password } = loginDto;

        // Buscar usuário por email
        const user = await this.prisma.user.findFirst({
            where: {
                email: email.toLowerCase().trim(),
            },
        });

        if (!user || !user.passwordHash) {
            throw new UnauthorizedException('Invalid credentials');
        }

        // Verificar password
        const isPasswordValid = await bcrypt.compare(password, user.passwordHash);

        if (!isPasswordValid) {
            this.logger.warn(`Failed login attempt for email: ${email}`);
            throw new UnauthorizedException('Invalid credentials');
        }

        this.logger.log(`User logged in: ${user.email}`);

        // Gerar tokens
        const tokens = await this.generateTokens(user);

        return {
            accessToken: tokens.accessToken,
            refreshToken: tokens.refreshToken,
            user: {
                id: user.id,
                name: user.name,
                email: user.email,
                role: user.role,
                xp: user.xp,
                level: user.level,
            },
        };
    }

    async refresh(refreshToken: string) {
        try {
            const payload = this.jwtService.verify(refreshToken, {
                secret: this.configService.get<string>('JWT_SECRET'),
            });

            const user = await this.prisma.user.findUnique({
                where: { id: payload.sub },
            });

            if (!user) {
                throw new UnauthorizedException('Invalid refresh token');
            }

            const tokens = await this.generateTokens(user);

            this.logger.log(`Token refreshed for user: ${user.email}`);

            return {
                accessToken: tokens.accessToken,
                refreshToken: tokens.refreshToken,
            };
        } catch (error) {
            throw new UnauthorizedException('Invalid refresh token');
        }
    }

    private async generateTokens(user: any) {
        const payload: JwtPayload = {
            sub: user.id,
            email: user.email,
            role: user.role,
            companyId: user.companyId,
        };

        const accessToken = this.jwtService.sign(payload, {
            expiresIn: this.configService.get<string>('JWT_EXPIRATION'),
        });

        const refreshToken = this.jwtService.sign(payload, {
            expiresIn: this.configService.get<string>('JWT_REFRESH_EXPIRATION'),
        });

        return { accessToken, refreshToken };
    }
}
