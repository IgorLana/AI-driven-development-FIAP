import { Module } from '@nestjs/common';
import { MoodLogsController } from './mood-logs.controller';
import { MoodLogsService } from './mood-logs.service';
import { PrismaService } from '../../prisma/prisma.service';
import { UsersModule } from '../users/users.module';
import { GamificationModule } from '../gamification/gamification.module';

@Module({
    imports: [UsersModule, GamificationModule],
    controllers: [MoodLogsController],
    providers: [MoodLogsService, PrismaService],
})
export class MoodLogsModule { }
