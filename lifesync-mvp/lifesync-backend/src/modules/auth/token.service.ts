import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import { PrismaService } from '../../prisma/prisma.service';
import { JwtPayload } from './interfaces/jwt-payload.interface';

/**
 * Seção 1.3 (SRP) + Seção 7 — Single Responsibility Principle.
 * Extraído de AuthService para isolar toda lógica de geração,
 * verificação e revogação de tokens JWT.
 */
@Injectable()
export class TokenService {
    constructor(
        private readonly jwtService: JwtService,
        private readonly configService: ConfigService,
        private readonly prisma: PrismaService,
    ) { }

    generateTokens(user: { id: string; email: string; role: string; companyId: string }) {
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

    verifyToken(token: string): JwtPayload {
        return this.jwtService.verify(token, {
            secret: this.configService.get<string>('JWT_SECRET'),
        });
    }

    async saveRefreshTokenHash(userId: string, refreshToken: string): Promise<void> {
        const tokenHash = this.hashToken(refreshToken);
        const rounds = this.configService.get<number>('BCRYPT_ROUNDS') ?? 12;
        const hashedToken = await bcrypt.hash(tokenHash, Number(rounds));

        await this.prisma.user.update({
            where: { id: userId },
            data: { refreshTokenHash: hashedToken },
        });
    }

    async validateRefreshTokenHash(refreshToken: string, storedHash: string): Promise<boolean> {
        const tokenHash = this.hashToken(refreshToken);
        return bcrypt.compare(tokenHash, storedHash);
    }

    async revokeRefreshToken(userId: string): Promise<void> {
        await this.prisma.user.update({
            where: { id: userId },
            data: { refreshTokenHash: null },
        });
    }

    private hashToken(token: string): string {
        return crypto.createHash('sha256').update(token).digest('hex');
    }
}
