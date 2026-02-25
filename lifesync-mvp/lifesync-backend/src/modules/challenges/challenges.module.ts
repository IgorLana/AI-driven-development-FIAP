import { Module } from '@nestjs/common';
import { ChallengesController } from './challenges.controller';
import { ChallengesService } from './challenges.service';
import { ChallengeRepository } from './repositories/challenge.repository';
import { PrismaService } from '../../prisma/prisma.service';
import { CHALLENGE_REPOSITORY } from './repositories/challenge.repository.interface';

@Module({
    // Seção 1.2 — Desacoplamento: removidos UsersModule e GamificationModule.
    // ChallengesService emite eventos; Gamification reage via @OnEvent.
    imports: [],
    controllers: [ChallengesController],
    providers: [
        ChallengesService,
        PrismaService,
        {
            provide: CHALLENGE_REPOSITORY,
            useClass: ChallengeRepository,
        },
    ],
})
export class ChallengesModule { }
