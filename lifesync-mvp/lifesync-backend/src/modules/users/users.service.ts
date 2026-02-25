import { Injectable, NotFoundException, ForbiddenException, Logger, Inject } from '@nestjs/common';
import { IUserRepository, USER_REPOSITORY } from './repositories/user.repository.interface';
import { UpdateUserDto } from './dto/update-user.dto';
import { Role } from '../../common/enums/role.enum';

/**
 * Seção 1.3 (DIP) — UsersService depende de IUserRepository (abstração),
 * não de PrismaService diretamente.
 * Seção 1.1 (Magic Strings) — usa Role enum ao invés de strings literais.
 */
@Injectable()
export class UsersService {
    private readonly logger = new Logger(UsersService.name);

    constructor(
        @Inject(USER_REPOSITORY)
        private readonly userRepository: IUserRepository,
    ) { }

    async findOne(id: string) {
        const user = await this.userRepository.findById(id);
        if (!user) throw new NotFoundException('User not found');
        return user;
    }

    async findAll(companyId: string, page: number = 1, limit: number = 20, role?: string) {
        const take = Math.min(limit, 100);
        const skip = (page - 1) * take;

        const [users, total] = await this.userRepository.findAllByCompany(companyId, skip, take, role);

        return {
            data: users,
            meta: { page, limit: take, total, totalPages: Math.ceil(total / take) },
        };
    }

    async update(
        id: string,
        updateUserDto: UpdateUserDto,
        currentUserId: string,
        currentUserRole: string,
    ) {
        const user = await this.userRepository.findById(id);
        if (!user) throw new NotFoundException('User not found');

        // Seção 1.1 — Usa Role enum ao invés de 'ADMIN' string literal
        if (id !== currentUserId && currentUserRole !== Role.ADMIN) {
            throw new ForbiddenException('You can only update your own profile');
        }

        const updatedUser = await this.userRepository.update(id, {
            name: updateUserDto.name?.trim(),
        });

        this.logger.log(`User updated: ${updatedUser.email}`);
        return updatedUser;
    }

    async addXP(userId: string, xp: number) {
        const result = await this.userRepository.addXP(userId, xp);
        this.logger.log(`User ${result.email} gained ${xp} XP`);
        return result;
    }
}
