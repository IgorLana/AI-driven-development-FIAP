import { Module } from '@nestjs/common';
import { MoodLogsController } from './mood-logs.controller';
import { MoodLogsService } from './mood-logs.service';
import { MoodLogRepository } from './repositories/mood-log.repository';
import { PrismaService } from '../../prisma/prisma.service';
import { MOOD_LOG_REPOSITORY } from './repositories/mood-log.repository.interface';

@Module({
    // Seção 1.2 — Desacoplamento: removidos UsersModule e GamificationModule.
    // MoodLogsService agora emite eventos; Gamification reage via @OnEvent.
    imports: [],
    controllers: [MoodLogsController],
    providers: [
        MoodLogsService,
        PrismaService,
        {
            provide: MOOD_LOG_REPOSITORY,
            useClass: MoodLogRepository,
        },
    ],
})
export class MoodLogsModule { }
