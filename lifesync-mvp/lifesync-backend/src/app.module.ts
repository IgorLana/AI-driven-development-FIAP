import { Module, NestModule, MiddlewareConsumer } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { APP_FILTER, APP_INTERCEPTOR } from '@nestjs/core';
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { MoodLogsModule } from './modules/mood-logs/mood-logs.module';
import { ChallengesModule } from './modules/challenges/challenges.module';
import { AnalyticsModule } from './modules/analytics/analytics.module';
import { GamificationModule } from './modules/gamification/gamification.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { PrismaService } from './prisma/prisma.service';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { LoggingInterceptor } from './common/interceptors/logging.interceptor';
import { TenantMiddleware } from './common/middleware/tenant.middleware';
import { AppController } from './app.controller';
import { CacheModule } from './common/cache/cache.module';

@Module({
    imports: [
        ConfigModule.forRoot({
            isGlobal: true,
        }),
        // Seção 4 — Rate limiting global: 100 req/min por padrão
        // Endpoints críticos de auth sobrescrevem com @Throttle()
        ThrottlerModule.forRoot([{
            ttl: 60000,
            limit: 100,
        }]),
        // Seção 5 — EventEmitter para desacoplamento entre módulos
        EventEmitterModule.forRoot(),
        // Fase 3 — Cache Redis global
        CacheModule,
        AuthModule,
        UsersModule,
        MoodLogsModule,
        ChallengesModule,
        AnalyticsModule,
        GamificationModule,
        NotificationsModule,
    ],
    controllers: [AppController],
    providers: [
        PrismaService,
        {
            provide: APP_FILTER,
            useClass: HttpExceptionFilter,
        },
        {
            provide: APP_INTERCEPTOR,
            useClass: LoggingInterceptor,
        },
    ],
})
export class AppModule implements NestModule {
    configure(consumer: MiddlewareConsumer) {
        consumer.apply(TenantMiddleware).forRoutes('*');
    }
}
