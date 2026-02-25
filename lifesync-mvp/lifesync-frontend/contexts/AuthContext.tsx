'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { authAPI, usersAPI } from '@/lib/api';
import { User, AuthResponse, ApiError } from '@/types';

interface AuthContextType {
    user: User | null;
    loading: boolean;
    // F1 (Fase A) — companyDomain obrigatório no login
    login: (email: string, password: string, companyDomain: string) => Promise<void>;
    register: (name: string, email: string, password: string, companyDomain: string) => Promise<void>;
    logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);
    const router = useRouter();

    useEffect(() => {
        const token = localStorage.getItem('accessToken');
        if (token) {
            loadUser();
        } else {
            setLoading(false);
        }
    }, []);

    const loadUser = async () => {
        try {
            const response = await usersAPI.getMe();
            setUser(response.data);
        } catch {
            // Token inválido ou expirado sem refresh disponível
            localStorage.removeItem('accessToken');
            localStorage.removeItem('refreshToken');
        } finally {
            setLoading(false);
        }
    };

    // F1 (Fase A) — companyDomain obrigatório para isolamento multi-tenant
    const login = async (email: string, password: string, companyDomain: string) => {
        const response = await authAPI.login(email, password, companyDomain);
        const data: AuthResponse = response.data;

        localStorage.setItem('accessToken', data.accessToken);
        localStorage.setItem('refreshToken', data.refreshToken);
        setUser(data.user);

        router.push('/dashboard');
    };

    const register = async (name: string, email: string, password: string, companyDomain: string) => {
        const response = await authAPI.register(name, email, password, companyDomain);
        const data: AuthResponse = response.data;

        localStorage.setItem('accessToken', data.accessToken);
        localStorage.setItem('refreshToken', data.refreshToken);
        setUser(data.user);

        router.push('/dashboard');
    };

    /**
     * F2 (Fase A) — Revogação ativa do token no servidor.
     * Best-effort: falha silenciosa, logout local sempre ocorre.
     * Seção 1.2 + Seção 4 do REFACTORING-frontend.md
     */
    const logout = async () => {
        const refreshToken = localStorage.getItem('refreshToken');
        if (refreshToken) {
            try {
                await authAPI.logout(refreshToken);
            } catch (err) {
                // best-effort: não bloqueia o logout local
                const apiErr = err as ApiError;
                console.warn('Logout remoto falhou:', apiErr.message);
            }
        }
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        setUser(null);
        router.push('/login');
    };

    return (
        <AuthContext.Provider value={{ user, loading, login, register, logout }}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
}
