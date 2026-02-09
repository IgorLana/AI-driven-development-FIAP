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

@Controller('challenges')
@UseGuards(JwtAuthGuard)
export class ChallengesController {
    constructor(private readonly challengesService: ChallengesService) { }

    @Post()
    @UseGuards(RolesGuard)
    @Roles(Role.MANAGER, Role.ADMIN)
    @HttpCode(HttpStatus.CREATED)
    async create(@CurrentUser() user: any, @Body() createChallengeDto: CreateChallengeDto) {
        return this.challengesService.create(user.companyId, createChallengeDto);
    }

    @Get('daily')
    @HttpCode(HttpStatus.OK)
    async getDaily(@CurrentUser() user: any) {
        return this.challengesService.findDaily(user.id, user.companyId);
    }

    @Post(':id/complete')
    @HttpCode(HttpStatus.OK)
    async complete(@CurrentUser() user: any, @Param('id') id: string) {
        return this.challengesService.complete(user.id, id);
    }
}
