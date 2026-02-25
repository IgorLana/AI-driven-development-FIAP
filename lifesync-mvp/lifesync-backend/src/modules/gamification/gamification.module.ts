import { Module } from '@nestjs/common';
import { GamificationService } from './gamification.service';
import { PrismaService } from '../../prisma/prisma.service';
import { UserRepository } from '../users/repositories/user.repository';
import { USER_REPOSITORY } from '../users/repositories/user.repository.interface';

@Module({
    // Seção 5 — GamificationModule agora injeta IUserRepository para addXP
    // e escuta eventos via @OnEvent (desacoplado de MoodLogs e Challenges)
    providers: [
        GamificationService,
        PrismaService,
        {
            provide: USER_REPOSITORY,
            useClass: UserRepository,
        },
    ],
    exports: [GamificationService],
})
export class GamificationModule { }
