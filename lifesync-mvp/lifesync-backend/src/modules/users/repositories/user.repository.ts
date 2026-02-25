import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { IUserRepository } from './user.repository.interface';
import { User } from '@prisma/client';

@Injectable()
export class UserRepository implements IUserRepository {
    constructor(private readonly prisma: PrismaService) { }

    async findById(id: string): Promise<Partial<User> | null> {
        return this.prisma.user.findUnique({
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
    }

    async findByEmailAndCompany(email: string, companyId: string): Promise<User | null> {
        return this.prisma.user.findUnique({
            where: { email_companyId: { email, companyId } },
        });
    }

    async findByEmailGlobal(email: string): Promise<User | null> {
        return this.prisma.user.findFirst({ where: { email } });
    }

    async findAllByCompany(
        companyId: string,
        skip: number,
        take: number,
        role?: string,
    ): Promise<[Partial<User>[], number]> {
        const where: { companyId: string; role?: string } = { companyId };
        if (role) where.role = role;

        return Promise.all([
            this.prisma.user.findMany({
                where,
                select: { id: true, name: true, email: true, role: true, xp: true, level: true, createdAt: true },
                skip,
                take,
                orderBy: { createdAt: 'desc' },
            }),
            this.prisma.user.count({ where }),
        ]);
    }

    async update(id: string, data: Partial<User>): Promise<Partial<User>> {
        return this.prisma.user.update({
            where: { id },
            data,
            select: { id: true, name: true, email: true, role: true, xp: true, level: true },
        });
    }

    async addXP(userId: string, xp: number): Promise<{ xp: number; level: number; email: string }> {
        const user = await this.prisma.user.findUniqueOrThrow({ where: { id: userId } });
        const newXP = user.xp + xp;
        const newLevel = Math.floor(newXP / 100) + 1;

        const updated = await this.prisma.user.update({
            where: { id: userId },
            data: { xp: newXP, level: newLevel },
            select: { xp: true, level: true, email: true },
        });

        return updated;
    }

    async create(data: {
        companyId: string;
        name: string;
        email: string;
        passwordHash: string;
        role: string;
    }): Promise<User> {
        return this.prisma.user.create({ data: { ...data, xp: 0, level: 1 } });
    }
}
