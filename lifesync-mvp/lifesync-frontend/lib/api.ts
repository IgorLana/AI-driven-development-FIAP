import axios from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1';

const api = axios.create({
    baseURL: API_URL,
    headers: {
        'Content-Type': 'application/json',
    },
});

// Interceptor para adicionar token
api.interceptors.request.use((config) => {
    const token = localStorage.getItem('accessToken');
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

// Auth
export const authAPI = {
    login: (email: string, password: string) =>
        api.post('/auth/login', { email, password }),

    register: (name: string, email: string, password: string, companyDomain: string) =>
        api.post('/auth/register', { name, email, password, companyDomain }),

    refresh: (refreshToken: string) =>
        api.post('/auth/refresh', { refreshToken }),
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

    getHistory: (limit = 7) =>
        api.get('/mood-logs/history', { params: { limit } }),
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
