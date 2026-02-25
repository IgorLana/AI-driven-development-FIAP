import {
    Controller,
    Get,
    Patch,
    Body,
    Param,
    Query,
    UseGuards,
    HttpCode,
    HttpStatus,
} from '@nestjs/common';
import { UsersService } from './users.service';
import { UpdateUserDto } from './dto/update-user.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { AuthenticatedUser } from '../../common/interfaces/authenticated-user.interface';

// Seção 1 (Fase 5) — Substitui `user: any` por `AuthenticatedUser` tipado
@Controller('users')
@UseGuards(JwtAuthGuard)
export class UsersController {
    constructor(private readonly usersService: UsersService) { }

    @Get('me')
    @HttpCode(HttpStatus.OK)
    async getMe(@CurrentUser() user: AuthenticatedUser) {
        return this.usersService.findOne(user.id);
    }

    @Get()
    @HttpCode(HttpStatus.OK)
    async findAll(
        @CurrentUser() user: AuthenticatedUser,
        @Query('page') page?: string,
        @Query('limit') limit?: string,
        @Query('role') role?: string,
    ) {
        return this.usersService.findAll(
            user.companyId,
            page ? Number(page) : 1,
            limit ? Number(limit) : 20,
            role,
        );
    }

    @Patch(':id')
    @HttpCode(HttpStatus.OK)
    async update(
        @Param('id') id: string,
        @Body() updateUserDto: UpdateUserDto,
        @CurrentUser() user: AuthenticatedUser,
    ) {
        return this.usersService.update(id, updateUserDto, user.id, user.role);
    }
}
