import { Module } from '@nestjs/common';
import { GamificationService } from './gamification.service';
import { PrismaService } from '../../prisma/prisma.service';

@Module({
    providers: [GamificationService, PrismaService],
    exports: [GamificationService],
})
export class GamificationModule { }
