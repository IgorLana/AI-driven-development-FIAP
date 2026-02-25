'use client';

import { useState, useEffect } from 'react';
import { analyticsAPI } from '@/lib/api';
import { MoodSummary } from '@/types';

export default function AnalyticsPage() {
    const [summary, setSummary] = useState<MoodSummary | null>(null);
    const [loading, setLoading] = useState(true);
    // F7 (Fase B) — erro visível ao usuário em vez de console.error silencioso
    const [error, setError] = useState('');

    useEffect(() => {
        loadSummary();
    }, []);

    const loadSummary = async () => {
        try {
            const response = await analyticsAPI.getMoodSummary();
            setSummary(response.data);
        } catch {
            setError('Não foi possível carregar os dados de analytics. Verifique sua conexão.');
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <div className="text-xl text-gray-600">Carregando analytics...</div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-8 rounded-xl text-center">
                {error}
            </div>
        );
    }

    if (!summary) return null;

    const moodEmojis = ['😢', '😕', '😐', '🙂', '😄'];

    return (
        <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-8">Analytics da Empresa</h1>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                {/* Card Média de Mood */}
                <div className="bg-white rounded-xl shadow-md p-6">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-gray-600">Média de Mood</p>
                            <p className="text-3xl font-bold text-blue-600">{summary.averageMood.toFixed(2)}</p>
                        </div>
                        <div className="text-4xl">{moodEmojis[Math.round(summary.averageMood) - 1]}</div>
                    </div>
                </div>

                {/* Card Total de Check-ins */}
                <div className="bg-white rounded-xl shadow-md p-6">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-gray-600">Total de Check-ins</p>
                            <p className="text-3xl font-bold text-green-600">{summary.totalCheckins}</p>
                        </div>
                        <div className="text-4xl">📊</div>
                    </div>
                </div>

                {/* Card Taxa de Engajamento */}
                <div className="bg-white rounded-xl shadow-md p-6">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-gray-600">Taxa de Engajamento</p>
                            <p className="text-3xl font-bold text-purple-600">{summary.engagementRate.toFixed(1)}%</p>
                        </div>
                        <div className="text-4xl">🎯</div>
                    </div>
                </div>
            </div>

            {/* Distribuição de Mood */}
            <div className="bg-white rounded-xl shadow-md p-6">
                <h2 className="text-xl font-bold text-gray-900 mb-6">Distribuição de Mood</h2>

                <div className="space-y-4">
                    {[1, 2, 3, 4, 5].map((mood) => {
                        const percentage = summary.moodDistribution[mood as keyof typeof summary.moodDistribution];
                        return (
                            <div key={mood}>
                                <div className="flex items-center justify-between mb-2">
                                    <div className="flex items-center gap-2">
                                        <span className="text-2xl">{moodEmojis[mood - 1]}</span>
                                        <span className="text-sm font-medium text-gray-700">Nível {mood}</span>
                                    </div>
                                    <span className="text-sm font-bold text-gray-900">{percentage.toFixed(1)}%</span>
                                </div>
                                <div className="w-full bg-gray-200 rounded-full h-3">
                                    <div
                                        className="bg-blue-600 h-3 rounded-full transition-all"
                                        style={{ width: `${percentage}%` }}
                                    />
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}
