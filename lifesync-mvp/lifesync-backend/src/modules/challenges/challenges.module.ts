import { Module } from '@nestjs/common';
import { ChallengesController } from './challenges.controller';
import { ChallengesService } from './challenges.service';
import { PrismaService } from '../../prisma/prisma.service';
import { UsersModule } from '../users/users.module';
import { GamificationModule } from '../gamification/gamification.module';

@Module({
    imports: [UsersModule, GamificationModule],
    controllers: [ChallengesController],
    providers: [ChallengesService, PrismaService],
})
export class ChallengesModule { }
