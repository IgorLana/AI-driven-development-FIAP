'use client';

import { useState, useEffect } from 'react';
import { usersAPI } from '@/lib/api';
import { User } from '@/types';

export default function RankingPage() {
    const [users, setUsers] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadRanking();
    }, []);

    const loadRanking = async () => {
        try {
            const response = await usersAPI.getAll(1, 100);
            // Ordenar por XP (maior para menor)
            const sortedUsers = response.data.data.sort((a: User, b: User) => b.xp - a.xp);
            setUsers(sortedUsers);
        } catch (err) {
            console.error('Erro ao carregar ranking:', err);
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <div className="text-xl text-gray-600">Carregando ranking...</div>
            </div>
        );
    }

    const getMedalEmoji = (position: number) => {
        if (position === 1) return '🥇';
        if (position === 2) return '🥈';
        if (position === 3) return '🥉';
        return `${position}º`;
    };

    const getRoleColor = (role: string) => {
        if (role === 'ADMIN') return 'bg-red-100 text-red-800';
        if (role === 'MANAGER') return 'bg-purple-100 text-purple-800';
        return 'bg-blue-100 text-blue-800';
    };

    return (
        <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-8">🏆 Ranking de Participantes</h1>

            <div className="bg-white rounded-xl shadow-md overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead className="bg-gray-50 border-b border-gray-200">
                            <tr>
                                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                                    Posição
                                </th>
                                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                                    Nome
                                </th>
                                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                                    Email
                                </th>
                                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                                    Função
                                </th>
                                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                                    Level
                                </th>
                                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                                    XP Total
                                </th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                            {users.map((user, index) => (
                                <tr
                                    key={user.id}
                                    className={`hover:bg-gray-50 transition-colors ${index < 3 ? 'bg-yellow-50' : ''
                                        }`}
                                >
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="text-2xl font-bold">
                                            {getMedalEmoji(index + 1)}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="text-sm font-semibold text-gray-900">{user.name}</div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="text-sm text-gray-600">{user.email}</div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <span className={`px-3 py-1 text-xs font-semibold rounded-full ${getRoleColor(user.role)}`}>
                                            {user.role}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="flex items-center gap-2">
                                            <span className="text-lg">🏆</span>
                                            <span className="text-sm font-bold text-gray-900">{user.level}</span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="flex items-center gap-2">
                                            <span className="text-lg">⭐</span>
                                            <span className="text-sm font-bold text-blue-600">{user.xp}</span>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {users.length === 0 && (
                <div className="text-center py-12 text-gray-600">
                    Nenhum participante encontrado.
                </div>
            )}

            <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
                <p className="text-sm text-blue-800">
                    <strong>💡 Dica:</strong> Complete desafios e registre seu humor diariamente para ganhar XP e subir no ranking!
                </p>
            </div>
        </div>
    );
}
