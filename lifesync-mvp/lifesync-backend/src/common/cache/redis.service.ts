import { Injectable, OnModuleDestroy, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

/**
 * Seção 5 (Fase 3) — Cache Redis.
 * Wrapper sobre ioredis para operações de get/set/invalidate com TTL.
 * Implementado como módulo global para uso em qualquer serviço.
 */
@Injectable()
export class RedisService implements OnModuleDestroy {
    private readonly client: Redis;
    private readonly logger = new Logger(RedisService.name);

    constructor(private readonly configService: ConfigService) {
        this.client = new Redis({
            host: this.configService.get<string>('REDIS_HOST', 'localhost'),
            port: this.configService.get<number>('REDIS_PORT', 6379),
            password: this.configService.get<string>('REDIS_PASSWORD') || undefined,
            lazyConnect: true,
            // Silencia erros de conexão em desenvolvimento (Redis opcional)
            enableAutoPipelining: false,
        });

        this.client.on('connect', () => this.logger.log('Redis connected'));
        this.client.on('error', (err) => this.logger.warn(`Redis error: ${err.message}`));
    }

    async get<T>(key: string): Promise<T | null> {
        try {
            const value = await this.client.get(key);
            return value ? (JSON.parse(value) as T) : null;
        } catch {
            return null; // Cache miss graceful: nunca bloqueia a operação principal
        }
    }

    async set(key: string, value: unknown, ttlSeconds: number): Promise<void> {
        try {
            await this.client.set(key, JSON.stringify(value), 'EX', ttlSeconds);
        } catch (err) {
            this.logger.warn(`Redis set failed for key ${key}: ${(err as Error).message}`);
        }
    }

    async del(key: string): Promise<void> {
        try {
            await this.client.del(key);
        } catch {
            // silencioso
        }
    }

    async delByPattern(pattern: string): Promise<void> {
        try {
            const keys = await this.client.keys(pattern);
            if (keys.length > 0) {
                await this.client.del(...keys);
                this.logger.log(`Invalidated ${keys.length} cache keys matching "${pattern}"`);
            }
        } catch {
            // silencioso
        }
    }

    onModuleDestroy() {
        this.client.disconnect();
    }
}
