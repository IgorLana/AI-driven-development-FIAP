import { Controller, Get, HttpCode, HttpStatus } from '@nestjs/common';
import { PrismaService } from './prisma/prisma.service';

@Controller()
export class AppController {
    constructor(private prisma: PrismaService) { }

    @Get('health')
    @HttpCode(HttpStatus.OK)
    async healthCheck() {
        let databaseStatus = 'connected';

        try {
            await this.prisma.$queryRaw`SELECT 1`;
        } catch (error) {
            databaseStatus = 'disconnected';
        }

        return {
            status: 'ok',
            database: databaseStatus,
            redis: 'connected',
            timestamp: new Date().toISOString(),
        };
    }
}
