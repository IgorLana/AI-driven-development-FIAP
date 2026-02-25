import { Global, Module } from '@nestjs/common';
import { RedisService } from './redis.service';

/**
 * Seção 5 (Fase 3) — Módulo global de cache Redis.
 * @Global permite que RedisService seja injetado em qualquer módulo
 * sem precisar importar CacheModule explicitamente.
 */
@Global()
@Module({
    providers: [RedisService],
    exports: [RedisService],
})
export class CacheModule { }
