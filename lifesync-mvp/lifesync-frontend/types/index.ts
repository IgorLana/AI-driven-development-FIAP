// F9 + F10 — Role como união literal e campos obrigatórios corrigidos
export type UserRole = 'EMPLOYEE' | 'MANAGER' | 'ADMIN';

export interface User {
    id: string;
    name: string;
    email: string;
    role: UserRole;
    xp: number;
    level: number;
    createdAt: string;
    companyId: string;
}

export interface AuthResponse {
    accessToken: string;
    refreshToken: string;
    user: User;
}

export interface MoodLog {
    id: string;
    userId: string;
    mood: number;
    tags: string[];
    note: string | null;
    loggedAt: string;
    createdAt: string;
    xpEarned?: number;
    newLevel?: number;
}

export interface Challenge {
    id: string;
    companyId: string | null;
    title: string;
    description: string;
    category: string;
    xpReward: number;
    isGlobal: boolean;
    createdAt: string;
    updatedAt: string;
}

export interface MoodSummary {
    averageMood: number;
    totalCheckins: number;
    moodDistribution: {
        1: number;
        2: number;
        3: number;
        4: number;
        5: number;
    };
    engagementRate: number;
}

// F4 — Tipo explícito para erros da API (substitui err: any)
export interface ApiError {
    response?: {
        data?: {
            message?: string;
            statusCode?: number;
        };
        status?: number;
    };
    message?: string;
}

// F11 — Resposta paginada com cursor
export interface PaginatedMoodLogs {
    data: MoodLog[];
    nextCursor: string | null;
}
