'use client';

import { useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { Role } from '@/constants/roles';

export default function DashboardLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const { user, loading, logout } = useAuth();
    const router = useRouter();
    const pathname = usePathname();

    useEffect(() => {
        if (!loading && !user) {
            router.push('/login');
        }
    }, [user, loading, router]);

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="text-xl text-gray-600">Carregando...</div>
            </div>
        );
    }

    if (!user) {
        return null;
    }

    const navLinkClass = (path: string) =>
        `block px-6 py-3 transition-colors ${pathname === path
            ? 'bg-blue-100 text-blue-700 font-semibold'
            : 'text-gray-700 hover:bg-blue-50 hover:text-blue-600'
        }`;

    // F5 (Fase B) — usa Role const em vez de magic strings 'MANAGER'/'ADMIN'
    const isManagerOrAdmin = user.role === Role.MANAGER || user.role === Role.ADMIN;

    return (
        <div className="min-h-screen bg-gray-50">
            {/* Sidebar */}
            <div className="fixed inset-y-0 left-0 w-64 bg-white shadow-lg">
                <div className="p-6">
                    <h1 className="text-2xl font-bold text-gray-900">LifeSync</h1>
                    <p className="text-sm text-gray-600 mt-1">{user.name}</p>
                    <div className="mt-2 flex items-center gap-2">
                        <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full">
                            Level {user.level}
                        </span>
                        <span className="text-xs text-gray-600">{user.xp} XP</span>
                    </div>
                </div>

                <nav className="mt-6">
                    <Link href="/dashboard" className={navLinkClass('/dashboard')}>
                        📊 Dashboard
                    </Link>
                    <Link href="/dashboard/mood-logs" className={navLinkClass('/dashboard/mood-logs')}>
                        😊 Mood Logs
                    </Link>
                    <Link href="/dashboard/challenges" className={navLinkClass('/dashboard/challenges')}>
                        🎯 Desafios
                    </Link>
                    <Link href="/dashboard/ranking" className={navLinkClass('/dashboard/ranking')}>
                        🏆 Ranking
                    </Link>
                    {isManagerOrAdmin && (
                        <Link href="/dashboard/analytics" className={navLinkClass('/dashboard/analytics')}>
                            📈 Analytics
                        </Link>
                    )}
                </nav>

                <div className="absolute bottom-0 left-0 right-0 p-6">
                    {/* F2 (Fase A) — logout é async agora (revogação no servidor) */}
                    <button
                        onClick={logout}
                        className="w-full px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                    >
                        Sair
                    </button>
                </div>
            </div>

            {/* Main Content */}
            <div className="ml-64 p-8">
                {children}
            </div>
        </div>
    );
}
