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

@Controller('mood-logs')
@UseGuards(JwtAuthGuard)
export class MoodLogsController {
    constructor(private readonly moodLogsService: MoodLogsService) { }

    @Post()
    @HttpCode(HttpStatus.CREATED)
    async create(@CurrentUser() user: any, @Body() createMoodLogDto: CreateMoodLogDto) {
        return this.moodLogsService.create(user.id, createMoodLogDto);
    }

    @Get('history')
    @HttpCode(HttpStatus.OK)
    async getHistory(@CurrentUser() user: any, @Query('limit') limit?: number) {
        return this.moodLogsService.findHistory(user.id, limit ? Number(limit) : 7);
    }
}
