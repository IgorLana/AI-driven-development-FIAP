import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { TokenService } from './token.service';
import { JwtStrategy } from './strategies/jwt.strategy';
import { PrismaService } from '../../prisma/prisma.service';
import { USER_REPOSITORY } from '../users/repositories/user.repository.interface';
import { UserRepository } from '../users/repositories/user.repository';

@Module({
    imports: [
        PassportModule,
        JwtModule.registerAsync({
            imports: [ConfigModule],
            useFactory: async (configService: ConfigService) => ({
                secret: configService.get<string>('JWT_SECRET'),
                signOptions: {
                    expiresIn: configService.get<string>('JWT_EXPIRATION'),
                },
            }),
            inject: [ConfigService],
        }),
    ],
    controllers: [AuthController],
    // ✅ CORREÇÃO DÍVIDA TÉCNICA:
    // - Repository Pattern aplicado: AuthService depende de IUserRepository (abstração)
    // - DIP compliance: injection token conecta interface à implementação
    providers: [
        AuthService, 
        TokenService, 
        JwtStrategy, 
        PrismaService,
        {
            provide: USER_REPOSITORY,
            useClass: UserRepository,
        },
    ],
    exports: [AuthService, TokenService],
})
export class AuthModule { }
