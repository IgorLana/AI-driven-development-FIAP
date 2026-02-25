import { Challenge, UserChallenge } from '@prisma/client';

export interface IChallengeRepository {
    create(data: {
        companyId: string;
        title: string;
        description: string;
        category: string;
        xpReward: number;
    }): Promise<Challenge>;
    findAvailable(companyId: string): Promise<Challenge[]>;
    findById(id: string): Promise<Challenge | null>;
    findCompletedTodayByUser(userId: string): Promise<{ challengeId: string }[]>;
    createCompletion(userId: string, challengeId: string): Promise<UserChallenge>;
    countCompletedByUser(userId: string): Promise<number>;
}

export const CHALLENGE_REPOSITORY = 'CHALLENGE_REPOSITORY';
