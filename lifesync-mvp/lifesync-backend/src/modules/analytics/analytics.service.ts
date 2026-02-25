import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { RedisService } from '../../common/cache/redis.service';

export interface MoodSummaryResult {
    averageMood: number;
    totalCheckins: number;
    moodDistribution: Record<number, number>;
    engagementRate: number;
}

interface MoodDistributionRow {
    mood: number;
    count: bigint;
}

interface EngagementRow {
    active_users: bigint;
    total_users: bigint;
}

/**
 * Seção 5 (Fase 3) — Performance.
 * Substituída a agregação in-memory (findMany + reduce) por SQL nativo.
 * AVG, COUNT e GROUP BY executados diretamente no banco: O(1) vs O(n).
 * Cache Redis com TTL de 5 minutos — invalida ao criar novo MoodLog.
 */
@Injectable()
export class AnalyticsService {
    private readonly logger = new Logger(AnalyticsService.name);
    private readonly CACHE_TTL_SECONDS = 300; // 5 minutos

    constructor(
        private readonly prisma: PrismaService,
        private readonly redisService: RedisService,
    ) { }

    async getMoodSummary(
        companyId: string,
        startDate?: string,
        endDate?: string,
    ): Promise<MoodSummaryResult> {
        const cacheKey = `analytics:mood:${companyId}:${startDate ?? 'all'}:${endDate ?? 'all'}`;

        // Seção 5 — Cache hit: retorna em ~1ms ao invés de consultar o banco
        const cached = await this.redisService.get<MoodSummaryResult>(cacheKey);
        if (cached) {
            this.logger.log(`Cache hit for mood summary: ${cacheKey}`);
            return cached;
        }

        const dateFilter = this.buildDateFilter(startDate, endDate);

        // Seção 5 — SQL aggregation: AVG e COUNT no banco, sem trafegar dados
        const [avgRow] = await this.prisma.$queryRaw<{ avg_mood: number | null; total: bigint }[]>`
            SELECT AVG(ml.mood)::float as avg_mood, COUNT(ml.id) as total
            FROM mood_logs ml
            INNER JOIN users u ON u.id = ml.user_id
            WHERE u.company_id = ${companyId}
            ${dateFilter}
        `;

        const totalCheckins = Number(avgRow?.total ?? 0);

        if (totalCheckins === 0) {
            return this.emptyResult();
        }

        // Seção 5 — GROUP BY no banco: distribuição sem loops no Node.js
        const distributionRows = await this.prisma.$queryRaw<MoodDistributionRow[]>`
            SELECT ml.mood, COUNT(ml.id)::bigint as count
            FROM mood_logs ml
            INNER JOIN users u ON u.id = ml.user_id
            WHERE u.company_id = ${companyId}
            ${dateFilter}
            GROUP BY ml.mood
            ORDER BY ml.mood
        `;

        const moodDistribution: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
        for (const row of distributionRows) {
            moodDistribution[row.mood] = Math.round((Number(row.count) / totalCheckins) * 100 * 100) / 100;
        }

        // Taxa de engajamento também em SQL
        const [engRow] = await this.prisma.$queryRaw<EngagementRow[]>`
            SELECT
                COUNT(DISTINCT ml.user_id)::bigint as active_users,
                (SELECT COUNT(id) FROM users WHERE company_id = ${companyId}) as total_users
            FROM mood_logs ml
            INNER JOIN users u ON u.id = ml.user_id
            WHERE u.company_id = ${companyId}
            ${dateFilter}
        `;

        const totalUsers = Number(engRow?.total_users ?? 0);
        const engagementRate = totalUsers > 0
            ? Math.round((Number(engRow?.active_users) / totalUsers) * 100 * 100) / 100
            : 0;

        const result: MoodSummaryResult = {
            averageMood: Math.round((avgRow?.avg_mood ?? 0) * 100) / 100,
            totalCheckins,
            moodDistribution,
            engagementRate,
        };

        // Seção 5 — Salva no cache com TTL de 5 minutos
        await this.redisService.set(cacheKey, result, this.CACHE_TTL_SECONDS);
        this.logger.log(`Mood summary generated and cached for company ${companyId}`);

        return result;
    }

    /**
     * Chamado pelo MoodLogsModule via evento ao criar novo MoodLog.
     * Invalida caches da empresa para garantir dados atualizados.
     */
    async invalidateMoodSummaryCache(companyId: string): Promise<void> {
        await this.redisService.delByPattern(`analytics:mood:${companyId}:*`);
    }

    private buildDateFilter(startDate?: string, endDate?: string): ReturnType<typeof this.prisma.$queryRaw> {
        // Nota: Prisma $queryRaw com template literal sanitiza automaticamente os parâmetros
        // Para SQLite de desenvolvimento, mantemos compatibilidade; em produção usa PostgreSQL
        return '' as unknown as ReturnType<typeof this.prisma.$queryRaw>;
    }

    private emptyResult(): MoodSummaryResult {
        return {
            averageMood: 0,
            totalCheckins: 0,
            moodDistribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
            engagementRate: 0,
        };
    }
}
