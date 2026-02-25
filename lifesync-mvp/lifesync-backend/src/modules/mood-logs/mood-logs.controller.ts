import {
    Controller,
    Post,
    Get,
    Body,
    Query,
    UseGuards,
    HttpCode,
    HttpStatus,
} from '@nestjs/common';
import { MoodLogsService } from './mood-logs.service';
import { CreateMoodLogDto } from './dto/create-mood-log.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { AuthenticatedUser } from '../../common/interfaces/authenticated-user.interface';

/**
 * Seção 1 (Fase 5) — Substitui `user: any` por `AuthenticatedUser` tipado.
 * Seção 6 (Fase 5) — Suporte a cursor-based pagination via query param.
 */
@Controller('mood-logs')
@UseGuards(JwtAuthGuard)
export class MoodLogsController {
    constructor(private readonly moodLogsService: MoodLogsService) { }

    @Post()
    @HttpCode(HttpStatus.CREATED)
    async create(
        @CurrentUser() user: AuthenticatedUser,
        @Body() createMoodLogDto: CreateMoodLogDto,
    ) {
        return this.moodLogsService.create(user.id, createMoodLogDto);
    }

    @Get('history')
    @HttpCode(HttpStatus.OK)
    async getHistory(
        @CurrentUser() user: AuthenticatedUser,
        @Query('limit') limit?: string,
        @Query('cursor') cursor?: string,
    ) {
        return this.moodLogsService.findHistory(
            user.id,
            limit ? Number(limit) : 7,
            cursor,
        );
    }
}
