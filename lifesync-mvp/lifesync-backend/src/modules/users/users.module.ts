import { Module } from '@nestjs/common';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';
import { UserRepository } from './repositories/user.repository';
import { PrismaService } from '../../prisma/prisma.service';
import { USER_REPOSITORY } from './repositories/user.repository.interface';

@Module({
    controllers: [UsersController],
    providers: [
        UsersService,
        PrismaService,
        // Seção 6 — Repository Pattern: injection token para IUserRepository
        {
            provide: USER_REPOSITORY,
            useClass: UserRepository,
        },
    ],
    exports: [UsersService, USER_REPOSITORY],
})
export class UsersModule { }
