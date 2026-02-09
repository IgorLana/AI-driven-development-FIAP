import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
    // Criar empresa
    const company = await prisma.company.create({
        data: {
            name: 'ACME Corporation',
            domain: 'acme.com',
        },
    });

    // Criar usuários
    const passwordHash = await bcrypt.hash('password123', 10);

    const admin = await prisma.user.create({
        data: {
            companyId: company.id,
            name: 'Admin User',
            email: 'admin@acme.com',
            passwordHash,
            role: 'ADMIN',
            xp: 500,
            level: 6,
        },
    });

    const manager = await prisma.user.create({
        data: {
            companyId: company.id,
            name: 'Maria Gestora',
            email: 'manager@acme.com',
            passwordHash,
            role: 'MANAGER',
            xp: 350,
            level: 4,
        },
    });

    const employee = await prisma.user.create({
        data: {
            companyId: company.id,
            name: 'João Silva',
            email: 'joao@acme.com',
            passwordHash,
            role: 'EMPLOYEE',
            xp: 250,
            level: 3,
        },
    });

    // Criar desafios globais
    const challenges = await prisma.challenge.createMany({
        data: [
            {
                title: 'Pausa de 5 minutos',
                description: 'Levante e estique o corpo',
                category: 'PHYSICAL',
                xpReward: 15,
                isGlobal: true,
            },
            {
                title: 'Beber 2L de água',
                description: 'Mantenha-se hidratado ao longo do dia',
                category: 'NUTRITION',
                xpReward: 10,
                isGlobal: true,
            },
            {
                title: 'Meditação guiada',
                description: '5 minutos de meditação',
                category: 'MENTAL',
                xpReward: 30,
                isGlobal: true,
            },
            {
                title: 'Conversa com colega',
                description: 'Tenha uma conversa significativa',
                category: 'SOCIAL',
                xpReward: 15,
                isGlobal: true,
            },
        ],
    });

    // Criar mood logs
    await prisma.moodLog.create({
        data: {
            userId: employee.id,
            mood: 4,
            tags: 'productive,motivated',
            note: 'Dia produtivo!',
        },
    });

    console.log('Seed completed successfully');
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
