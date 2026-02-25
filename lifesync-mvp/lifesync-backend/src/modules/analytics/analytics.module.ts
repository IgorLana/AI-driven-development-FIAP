import { Module } from '@nestjs/common';
import { AnalyticsController } from './analytics.controller';
import { AnalyticsService } from './analytics.service';
import { PrismaService } from '../../prisma/prisma.service';

// RedisService é injetado automaticamente via CacheModule @Global()
@Module({
    controllers: [AnalyticsController],
    providers: [AnalyticsService, PrismaService],
    exports: [AnalyticsService],
})
export class AnalyticsModule { }
