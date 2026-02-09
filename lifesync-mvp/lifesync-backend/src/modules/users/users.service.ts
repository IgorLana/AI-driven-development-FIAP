import { Injectable, NotFoundException, ForbiddenException, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { UpdateUserDto } from './dto/update-user.dto';

@Injectable()
export class UsersService {
    private readonly logger = new Logger(UsersService.name);

    constructor(private prisma: PrismaService) { }

    async findOne(id: string) {
        const user = await this.prisma.user.findUnique({
            where: { id },
            select: {
                id: true,
                name: true,
                email: true,
                role: true,
                xp: true,
                level: true,
                createdAt: true,
                companyId: true,
            },
        });

        if (!user) {
            throw new NotFoundException('User not found');
        }

        return user;
    }

    async findAll(companyId: string, page: number = 1, limit: number = 20, role?: string) {
        const skip = (page - 1) * limit;
        const take = Math.min(limit, 100);

        const where: any = { companyId };
        if (role) {
            where.role = role;
        }

        const [users, total] = await Promise.all([
            this.prisma.user.findMany({
                where,
                select: {
                    id: true,
                    name: true,
                    email: true,
                    role: true,
                    xp: true,
                    level: true,
                    createdAt: true,
                },
                skip,
                take,
                orderBy: { createdAt: 'desc' },
            }),
            this.prisma.user.count({ where }),
        ]);

        return {
            data: users,
            meta: {
                page,
                limit: take,
                total,
                totalPages: Math.ceil(total / take),
            },
        };
    }

    async update(id: string, updateUserDto: UpdateUserDto, currentUserId: string, currentUserRole: string) {
        // Verificar se usuário existe
        const user = await this.prisma.user.findUnique({
            where: { id },
        });

        if (!user) {
            throw new NotFoundException('User not found');
        }

        // Verificar permissão: apenas o próprio usuário ou ADMIN pode atualizar
        if (id !== currentUserId && currentUserRole !== 'ADMIN') {
            throw new ForbiddenException('You can only update your own profile');
        }

        const updatedUser = await this.prisma.user.update({
            where: { id },
            data: {
                name: updateUserDto.name?.trim(),
            },
            select: {
                id: true,
                name: true,
                email: true,
                role: true,
                xp: true,
                level: true,
            },
        });

        this.logger.log(`User updated: ${updatedUser.email}`);

        return updatedUser;
    }

    calculateLevel(xp: number): number {
        return Math.floor(xp / 100) + 1;
    }

    async addXP(userId: string, xp: number) {
        const user = await this.prisma.user.findUnique({
            where: { id: userId },
        });

        if (!user) {
            throw new NotFoundException('User not found');
        }

        const newXP = user.xp + xp;
        const newLevel = this.calculateLevel(newXP);

        const updatedUser = await this.prisma.user.update({
            where: { id: userId },
            data: {
                xp: newXP,
                level: newLevel,
            },
        });

        this.logger.log(`User ${user.email} gained ${xp} XP. Total: ${newXP}, Level: ${newLevel}`);

        return updatedUser;
    }
}
