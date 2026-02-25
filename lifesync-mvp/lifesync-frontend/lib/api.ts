import axios from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1';

const api = axios.create({
    baseURL: API_URL,
    headers: {
        'Content-Type': 'application/json',
    },
});

// Interceptor de request: injeta accessToken em todas as chamadas
api.interceptors.request.use((config) => {
    const token = localStorage.getItem('accessToken');
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

/**
 * F3 (Fase A) — Interceptor de renovação automática (401).
 * Fila de requests pendentes evita múltiplos refreshes simultâneos.
 * Flag _retry impede loop infinito caso o refresh também falhe.
 */
let isRefreshing = false;
let failedQueue: Array<{
    resolve: (value: unknown) => void;
    reject: (reason?: unknown) => void;
}> = [];

function processQueue(error: unknown, token: string | null = null) {
    failedQueue.forEach(({ resolve, reject }) => {
        if (error) {
            reject(error);
        } else {
            resolve(token);
        }
    });
    failedQueue = [];
}

api.interceptors.response.use(
    (response) => response,
    async (error) => {
        const originalRequest = error.config;

        if (error.response?.status === 401 && !originalRequest._retry) {
            if (isRefreshing) {
                // Outros requests aguardam o refresh em andamento
                return new Promise((resolve, reject) => {
                    failedQueue.push({ resolve, reject });
                }).then((token) => {
                    originalRequest.headers.Authorization = `Bearer ${token}`;
                    return api(originalRequest);
                });
            }

            originalRequest._retry = true;
            isRefreshing = true;

            const storedRefresh = localStorage.getItem('refreshToken');

            if (!storedRefresh) {
                // Sem refresh token → força logout
                localStorage.clear();
                window.location.href = '/login';
                return Promise.reject(error);
            }

            try {
                const { data } = await axios.post(`${API_URL}/auth/refresh`, {
                    refreshToken: storedRefresh,
                });
                const newToken: string = data.accessToken;
                localStorage.setItem('accessToken', newToken);
                if (data.refreshToken) {
                    localStorage.setItem('refreshToken', data.refreshToken);
                }
                processQueue(null, newToken);
                originalRequest.headers.Authorization = `Bearer ${newToken}`;
                return api(originalRequest);
            } catch (refreshError) {
                processQueue(refreshError, null);
                localStorage.clear();
                window.location.href = '/login';
                return Promise.reject(refreshError);
            } finally {
                isRefreshing = false;
            }
        }

        return Promise.reject(error);
    },
);

// Auth
export const authAPI = {
    // F1 (Fase A) — companyDomain obrigatório para isolamento multi-tenant
    login: (email: string, password: string, companyDomain: string) =>
        api.post('/auth/login', { email, password, companyDomain }),

    register: (name: string, email: string, password: string, companyDomain: string) =>
        api.post('/auth/register', { name, email, password, companyDomain }),

    refresh: (refreshToken: string) =>
        api.post('/auth/refresh', { refreshToken }),

    // F2 (Fase A) — revogação ativa do refresh token no servidor
    logout: (refreshToken: string) =>
        api.post('/auth/logout', { refreshToken }),
};

// Users
export const usersAPI = {
    getMe: () => api.get('/users/me'),

    getAll: (page = 1, limit = 20, role?: string) =>
        api.get('/users', { params: { page, limit, role } }),

    update: (id: string, data: { name?: string }) =>
        api.patch(`/users/${id}`, data),
};

// Mood Logs
export const moodLogsAPI = {
    create: (mood: number, tags?: string[], note?: string) =>
        api.post('/mood-logs', { mood, tags, note }),

    // F11 (Fase C) — suporte a cursor-based pagination
    getHistory: (limit = 7, cursor?: string) =>
        api.get('/mood-logs/history', { params: { limit, ...(cursor ? { cursor } : {}) } }),
};

// Challenges
export const challengesAPI = {
    getDaily: () => api.get('/challenges/daily'),

    complete: (id: string) => api.post(`/challenges/${id}/complete`),

    create: (data: {
        title: string;
        description: string;
        category: string;
        xpReward: number;
    }) => api.post('/challenges', data),
};

// Analytics
export const analyticsAPI = {
    getMoodSummary: (startDate?: string, endDate?: string) =>
        api.get('/analytics/mood-summary', { params: { startDate, endDate } }),
};

export default api;
