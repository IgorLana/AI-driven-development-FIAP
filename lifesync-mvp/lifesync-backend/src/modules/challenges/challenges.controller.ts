import {
    Controller,
    Post,
    Get,
    Body,
    Param,
    UseGuards,
    HttpCode,
    HttpStatus,
} from '@nestjs/common';
import { ChallengesService } from './challenges.service';
import { CreateChallengeDto } from './dto/create-challenge.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { Role } from '../../common/enums/role.enum';
import { AuthenticatedUser } from '../../common/interfaces/authenticated-user.interface';

// Seção 1 (Fase 5) — Substitui `user: any` por `AuthenticatedUser` tipado
@Controller('challenges')
@UseGuards(JwtAuthGuard)
export class ChallengesController {
    constructor(private readonly challengesService: ChallengesService) { }

    @Post()
    @UseGuards(RolesGuard)
    @Roles(Role.MANAGER, Role.ADMIN)
    @HttpCode(HttpStatus.CREATED)
    async create(
        @CurrentUser() user: AuthenticatedUser,
        @Body() createChallengeDto: CreateChallengeDto,
    ) {
        return this.challengesService.create(user.companyId, createChallengeDto);
    }

    @Get('daily')
    @HttpCode(HttpStatus.OK)
    async getDaily(@CurrentUser() user: AuthenticatedUser) {
        return this.challengesService.findDaily(user.id, user.companyId);
    }

    @Post(':id/complete')
    @HttpCode(HttpStatus.OK)
    async complete(
        @CurrentUser() user: AuthenticatedUser,
        @Param('id') id: string,
    ) {
        return this.challengesService.complete(user.id, id);
    }
}
