'use client';

import { useState, useEffect } from 'react';
import { challengesAPI } from '@/lib/api';
import { Challenge } from '@/types';

const CATEGORY_EMOJIS: Record<string, string> = {
    PHYSICAL: '💪',
    MENTAL: '🧠',
    SOCIAL: '👥',
    NUTRITION: '🥗',
};

export default function ChallengesPage() {
    const [challenges, setChallenges] = useState<Challenge[]>([]);
    const [loading, setLoading] = useState(true);
    const [completing, setCompleting] = useState<string | null>(null);
    const [success, setSuccess] = useState('');

    useEffect(() => {
        loadChallenges();
    }, []);

    const loadChallenges = async () => {
        try {
            const response = await challengesAPI.getDaily();
            setChallenges(response.data.challenges);
        } catch (err) {
            console.error('Erro ao carregar desafios:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleComplete = async (id: string) => {
        setCompleting(id);
        setSuccess('');

        try {
            const response = await challengesAPI.complete(id);
            setSuccess(`Desafio completado! +${response.data.xpEarned} XP`);

            // Remover desafio da lista
            setChallenges(challenges.filter((c) => c.id !== id));

            // Limpar mensagem após 3s
            setTimeout(() => setSuccess(''), 3000);
        } catch (err: any) {
            alert(err.response?.data?.message || 'Erro ao completar desafio');
        } finally {
            setCompleting(null);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <div className="text-xl text-gray-600">Carregando desafios...</div>
            </div>
        );
    }

    return (
        <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-8">Desafios Diários</h1>

            {success && (
                <div className="mb-6 bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg">
                    {success}
                </div>
            )}

            {challenges.length === 0 ? (
                <div className="bg-white rounded-xl shadow-md p-8 text-center">
                    <div className="text-6xl mb-4">🎉</div>
                    <h2 className="text-2xl font-bold text-gray-900 mb-2">
                        Todos os desafios completados!
                    </h2>
                    <p className="text-gray-600">
                        Parabéns! Você completou todos os desafios disponíveis hoje.
                    </p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {challenges.map((challenge) => (
                        <div
                            key={challenge.id}
                            className="bg-white rounded-xl shadow-md p-6 hover:shadow-lg transition-shadow"
                        >
                            <div className="flex items-start justify-between mb-4">
                                <div className="flex items-center gap-3">
                                    <span className="text-4xl">{CATEGORY_EMOJIS[challenge.category]}</span>
                                    <div>
                                        <h3 className="text-lg font-bold text-gray-900">{challenge.title}</h3>
                                        <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full">
                                            {challenge.category}
                                        </span>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <div className="text-2xl font-bold text-green-600">+{challenge.xpReward}</div>
                                    <div className="text-xs text-gray-600">XP</div>
                                </div>
                            </div>

                            <p className="text-gray-600 mb-4">{challenge.description}</p>

                            <button
                                onClick={() => handleComplete(challenge.id)}
                                disabled={completing === challenge.id}
                                className="w-full bg-blue-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {completing === challenge.id ? 'Completando...' : 'Completar Desafio'}
                            </button>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
