'use client';

import { useAuth } from '@/contexts/AuthContext';
import Link from 'next/link'; // F8 (Fase B) — client-side navigation com prefetch

export default function DashboardPage() {
    const { user } = useAuth();

    if (!user) return null;

    return (
        <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-8">Dashboard</h1>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Card XP */}
                <div className="bg-white rounded-xl shadow-md p-6">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-gray-600">Total XP</p>
                            <p className="text-3xl font-bold text-blue-600">{user.xp}</p>
                        </div>
                        <div className="text-4xl">⭐</div>
                    </div>
                </div>

                {/* Card Level */}
                <div className="bg-white rounded-xl shadow-md p-6">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-gray-600">Nível Atual</p>
                            <p className="text-3xl font-bold text-green-600">{user.level}</p>
                        </div>
                        <div className="text-4xl">🏆</div>
                    </div>
                </div>

                {/* Card Role */}
                <div className="bg-white rounded-xl shadow-md p-6">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-gray-600">Função</p>
                            <p className="text-3xl font-bold text-purple-600">{user.role}</p>
                        </div>
                        <div className="text-4xl">👤</div>
                    </div>
                </div>
            </div>

            <div className="mt-8 bg-white rounded-xl shadow-md p-6">
                <h2 className="text-xl font-bold text-gray-900 mb-4">Bem-vindo, {user.name}!</h2>
                <p className="text-gray-600 mb-4">
                    Você está no nível <strong>{user.level}</strong> com <strong>{user.xp} XP</strong>.
                </p>
                <p className="text-gray-600">
                    Continue registrando seu humor e completando desafios para ganhar mais XP e subir de nível!
                </p>
            </div>

            <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl shadow-md p-6 text-white">
                    <h3 className="text-lg font-bold mb-2">😊 Mood Logs</h3>
                    <p className="text-blue-100 mb-4">Registre como você está se sentindo hoje</p>
                    <Link
                        href="/dashboard/mood-logs"
                        className="inline-block bg-white text-blue-600 px-4 py-2 rounded-lg font-semibold hover:bg-blue-50 transition-colors"
                    >
                        Ir para Mood Logs
                    </Link>
                </div>

                <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-xl shadow-md p-6 text-white">
                    <h3 className="text-lg font-bold mb-2">🎯 Desafios</h3>
                    <p className="text-green-100 mb-4">Complete desafios e ganhe XP</p>
                    <Link
                        href="/dashboard/challenges"
                        className="inline-block bg-white text-green-600 px-4 py-2 rounded-lg font-semibold hover:bg-green-50 transition-colors"
                    >
                        Ver Desafios
                    </Link>
                </div>
            </div>
        </div>
    );
}
