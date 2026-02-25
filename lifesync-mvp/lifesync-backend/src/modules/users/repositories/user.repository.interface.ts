import { User } from '@prisma/client';

export interface IUserRepository {
    findById(id: string): Promise<Partial<User> | null>;
    findByEmailAndCompany(email: string, companyId: string): Promise<User | null>;
    findByEmailGlobal(email: string): Promise<User | null>;
    findAllByCompany(
        companyId: string,
        skip: number,
        take: number,
        role?: string,
    ): Promise<[Partial<User>[], number]>;
    update(id: string, data: Partial<User>): Promise<Partial<User>>;
    addXP(userId: string, xp: number): Promise<{ xp: number; level: number; email: string }>;
    create(data: {
        companyId: string;
        name: string;
        email: string;
        passwordHash: string;
        role: string;
    }): Promise<User>;
}

export const USER_REPOSITORY = 'USER_REPOSITORY';
