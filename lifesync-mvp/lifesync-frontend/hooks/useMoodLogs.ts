/**
 * ✅ CORREÇÃO FRONTEND - VIOLAÇÃO DIP
 * 
 * PROBLEMA ORIGINAL:
 * - Componentes acoplados diretamente ao moodLogsAPI (implementação concreta)
 * - Impossível trocar implementação (axios → SWR/React Query) sem modificar componentes
 * - Violação DIP: dependência de implementação ao invés de abstração
 * 
 * SOLUÇÃO:
 * - Custom hook abstrai a lógica de dados
 * - Componentes dependem apenas da interface do hook
 * - Fácil substituição da implementação interna
 */

import { useState, useEffect, useCallback } from 'react';
import { moodLogsAPI } from '@/lib/api';
import { MoodLog, ApiError } from '@/types';

// Temporary type until backend DTO is imported
interface CreateMoodLogDto {
  mood: string;
  tags: string[];
  note?: string;
}

interface UseMoodLogsReturn {
  // Data
  moodLogs: MoodLog[];
  todayMoodLog: MoodLog | null;
  
  // States
  loading: boolean;
  submitting: boolean;
  error: string | null;
  
  // Actions
  createMoodLog: (data: CreateMoodLogDto) => Promise<void>;
  loadHistory: (limit?: number, cursor?: string) => Promise<void>;
  loadMore: () => Promise<void>;
  
  // Pagination
  hasMore: boolean;
  nextCursor: string | null;
}

/**
 * ✅ Custom Hook - Dependency Inversion Principle aplicado
 * 
 * ABSTRAÇÃO: Hook fornece interface estável para componentes
 * IMPLEMENTAÇÃO: Pode ser trocada internamente (axios → SWR → GraphQL)
 */
export function useMoodLogs(): UseMoodLogsReturn {
  const [moodLogs, setMoodLogs] = useState<MoodLog[]>([]);
  const [todayMoodLog, setTodayMoodLog] = useState<MoodLog | null>(null);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);

  const loadHistory = useCallback(async (limit = 7, cursor?: string) => {
    setLoading(true);
    setError(null);

    try {
      const response = await moodLogsAPI.getHistory(limit, cursor);
      const { data, nextCursor: newCursor } = response.data;

      if (cursor) {
        // Load more - append to existing
        setMoodLogs(prev => [...prev, ...data]);
      } else {
        // Initial load - replace
        setMoodLogs(data);
        
        // ✅ CORREÇÃO: Identifica mood log de hoje
        const today = new Date().toISOString().split('T')[0];
        const todaysLog = data.find((log: MoodLog) => 
          log.loggedAt.startsWith(today)
        );
        setTodayMoodLog(todaysLog || null);
      }

      setNextCursor(newCursor);
      setHasMore(!!newCursor);
    } catch (err) {
      const apiError = err as ApiError;
      setError(apiError.response?.data?.message || 'Failed to load mood logs');
    } finally {
      setLoading(false);
    }
  }, []);

  const loadMore = useCallback(async () => {
    if (!nextCursor || loading) return;
    await loadHistory(7, nextCursor);
  }, [nextCursor, loading, loadHistory]);

  const createMoodLog = useCallback(async (data: CreateMoodLogDto) => {
    setSubmitting(true);
    setError(null);

    try {
      const response = await moodLogsAPI.create(data.mood as any, data.tags, data.note);
      const newMoodLog = response.data;

      // ✅ Otimistic update: atualiza UI imediatamente
      setTodayMoodLog(newMoodLog);
      
      // Update list if exists
      setMoodLogs(prev => {
        const filtered = prev.filter(log => log.id !== newMoodLog.id);
        return [newMoodLog, ...filtered];
      });

    } catch (err) {
      const apiError = err as ApiError;
      setError(apiError.response?.data?.message || 'Failed to create mood log');
      throw err; // Re-throw para componente tratar
    } finally {
      setSubmitting(false);
    }
  }, []);

  // Load initial data
  useEffect(() => {
    loadHistory();
  }, [loadHistory]);

  return {
    // Data
    moodLogs,
    todayMoodLog,
    
    // States  
    loading,
    submitting,
    error,
    
    // Actions
    createMoodLog,
    loadHistory,
    loadMore,
    
    // Pagination
    hasMore,
    nextCursor,
  };
}

/**
 * 🔄 EXEMPLO DE USO NO COMPONENTE (DIP compliance):
 * 
 * // ANTES - Violação DIP (acoplamento direto):
 * function MoodLogsPage() {
 *   const [moodLogs, setMoodLogs] = useState([]);
 *   
 *   useEffect(() => {
 *     moodLogsAPI.getHistory().then(response => {  ← Acoplamento direto
 *       setMoodLogs(response.data.data);
 *     });
 *   }, []);
 * }
 * 
 * // DEPOIS - DIP aplicado (dependência de abstração):
 * function MoodLogsPage() {
 *   const { moodLogs, loading, createMoodLog } = useMoodLogs();  ← Abstração
 *   
 *   // Componente não sabe COMO os dados são buscados
 *   // Pode ser axios, SWR, GraphQL, localStorage, etc.
 * }
 * 
 * 📊 BENEFÍCIOS:
 * ✅ Troca fácil de implementação (axios → SWR)
 * ✅ Testes isolados do hook (mock da API)
 * ✅ Componentes mais simples (apenas UI)
 * ✅ Reutilização em múltiplos componentes
 * ✅ Otimizações centralizadas (cache, debounce)
 */