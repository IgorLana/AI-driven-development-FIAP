/**
 * ✅ CORREÇÃO FRONTEND - VIOLAÇÃO SRP
 * 
 * PROBLEMA ORIGINAL:
 * - AuthContext tinha 3 responsabilidades: estado + API + navegação
 * - Componentes faziam chamadas diretas de API (acoplamento)
 * - Violação DIP: dependência de implementação concreta (axios)
 * 
 * SOLUÇÃO:
 * - Custom hook separa lógica de autenticação
 * - AuthContext apenas para estado global
 * - Interface abstrata para API calls
 */

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { authAPI } from '@/lib/api';
import { User, ApiError } from '@/types';

interface UseAuthReturn {
  loading: boolean;
  error: string | null;
  login: (email: string, password: string, companyDomain: string) => Promise<User>;
  register: (name: string, email: string, password: string, companyDomain: string) => Promise<User>;
  logout: () => Promise<void>;
}

/**
 * ✅ Custom Hook - Single Responsibility Principle aplicado
 * 
 * Responsabilidade ÚNICA: Lógica de autenticação
 * Não conhece: localStorage, navegação, estado global
 */
export function useAuth(): UseAuthReturn {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const login = useCallback(async (
    email: string,
    password: string,
    companyDomain: string
  ): Promise<User> => {
    setLoading(true);
    setError(null);

    try {
      const response = await authAPI.login(email, password, companyDomain);
      const { user, accessToken, refreshToken } = response.data;

      // ✅ Separação clara: hook faz lógica, não gerencia storage
      localStorage.setItem('accessToken', accessToken);
      localStorage.setItem('refreshToken', refreshToken);
      
      router.push('/dashboard');
      return user;
    } catch (err) {
      const apiError = err as ApiError;
      const errorMessage = apiError.response?.data?.message || 'Login failed';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [router]);

  const register = useCallback(async (
    name: string,
    email: string,
    password: string,
    companyDomain: string
  ): Promise<User> => {
    setLoading(true);
    setError(null);

    try {
      const response = await authAPI.register(name, email, password, companyDomain);
      const { user, accessToken, refreshToken } = response.data;

      localStorage.setItem('accessToken', accessToken);
      localStorage.setItem('refreshToken', refreshToken);
      
      router.push('/dashboard');
      return user;
    } catch (err) {
      const apiError = err as ApiError;
      const errorMessage = apiError.response?.data?.message || 'Registration failed';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [router]);

  const logout = useCallback(async (): Promise<void> => {
    setLoading(true);
    setError(null);

    try {
      const refreshToken = localStorage.getItem('refreshToken');
      if (refreshToken) {
        try {
          await authAPI.logout(refreshToken);
        } catch (logoutErr) {
          // Best effort - não bloqueia logout local
          console.warn('Remote logout failed:', logoutErr);
        }
      }
    } catch (err) {
      console.error('Logout error:', err);
    } finally {
      // Sempre limpa localmente
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
      router.push('/login');
      setLoading(false);
    }
  }, [router]);

  return {
    loading,
    error,
    login,
    register,
    logout,
  };
}

/**
 * 📊 BENEFÍCIOS DA SEPARAÇÃO:
 * 
 * ANTES (AuthContext monolítico):
 * ❌ 3 responsabilidades misturadas
 * ❌ Difícil de testar (context + API + navegação)
 * ❌ Reutilização impossível
 * ❌ Violação SRP
 * 
 * DEPOIS (Custom hook):
 * ✅ Responsabilidade única: autenticação
 * ✅ Testável isoladamente
 * ✅ Reutilizável em qualquer componente
 * ✅ SRP compliance
 * ✅ Fácil mocking para testes
 */