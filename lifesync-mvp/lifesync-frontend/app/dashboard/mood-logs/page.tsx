'use client';

import { useState, useEffect } from 'react';
import { moodLogsAPI } from '@/lib/api';
import { MoodLog, PaginatedMoodLogs, ApiError } from '@/types';

const MOOD_EMOJIS = ['😢', '😕', '😐', '🙂', '😄'];
const MOOD_LABELS = ['Muito Ruim', 'Ruim', 'Neutro', 'Bom', 'Muito Bom'];

export default function MoodLogsPage() {
    const [mood, setMood] = useState(3);
    const [tags, setTags] = useState('');
    const [note, setNote] = useState('');
    const [history, setHistory] = useState<MoodLog[]>([]);
    const [loading, setLoading] = useState(false);
    const [historyLoading, setHistoryLoading] = useState(false);
    const [success, setSuccess] = useState('');
    const [error, setError] = useState('');
    // F11 (Fase C) — cursor pagination
    const [historyError, setHistoryError] = useState('');
    const [nextCursor, setNextCursor] = useState<string | null>(null);
    const [hasMore, setHasMore] = useState(false);

    useEffect(() => {
        loadHistory();
    }, []);

    // F11 (Fase C) — suporte a cursor, acumula registros ao clicar "Carregar mais"
    const loadHistory = async (cursor?: string) => {
        setHistoryLoading(true);
        setHistoryError('');
        try {
            const response = await moodLogsAPI.getHistory(7, cursor);
            const { data, nextCursor: nc }: PaginatedMoodLogs = response.data;
            setHistory((prev) => (cursor ? [...prev, ...data] : data));
            setNextCursor(nc);
            setHasMore(nc !== null);
        } catch {
            // F7 (Fase B) — feedback visível ao usuário em vez de console.error silencioso
            setHistoryError('Não foi possível carregar o histórico. Verifique sua conexão.');
        } finally {
            setHistoryLoading(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setSuccess('');
        setLoading(true);

        try {
            const tagsArray = tags
                .split(',')
                .map((t) => t.trim())
                .filter((t) => t.length > 0 && t.length <= 5);

            const response = await moodLogsAPI.create(mood, tagsArray, note || undefined);

            setSuccess(`Mood log salvo! +${response.data.xpEarned} XP`);
            setTags('');
            setNote('');
            setMood(3);

            // Recarregar histórico do início
            loadHistory();
        } catch (err) {
            // F4 (Fase B) — ApiError em vez de err: any
            const apiErr = err as ApiError;
            setError(apiErr.response?.data?.message ?? 'Erro ao salvar mood log');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-8">Mood Logs</h1>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Formulário */}
                <div className="bg-white rounded-xl shadow-md p-6">
                    <h2 className="text-xl font-bold text-gray-900 mb-6">Como você está se sentindo?</h2>

                    <form onSubmit={handleSubmit} className="space-y-6">
                        {/* Mood Selector */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-4">
                                Selecione seu humor (1-5)
                            </label>
                            <div className="flex justify-between items-center gap-2">
                                {[1, 2, 3, 4, 5].map((value) => (
                                    <button
                                        key={value}
                                        type="button"
                                        onClick={() => setMood(value)}
                                        className={`flex-1 p-4 rounded-lg border-2 transition-all ${mood === value
                                                ? 'border-blue-500 bg-blue-50 scale-110'
                                                : 'border-gray-200 hover:border-gray-300'
                                            }`}
                                    >
                                        <div className="text-4xl mb-2">{MOOD_EMOJIS[value - 1]}</div>
                                        <div className="text-xs text-gray-600">{MOOD_LABELS[value - 1]}</div>
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Tags */}
                        <div>
                            <label htmlFor="tags" className="block text-sm font-medium text-gray-700 mb-2">
                                Tags (separadas por vírgula, max 5 caracteres cada)
                            </label>
                            <input
                                id="tags"
                                type="text"
                                value={tags}
                                onChange={(e) => setTags(e.target.value)}
                                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                placeholder="happy, work, tired"
                            />
                        </div>

                        {/* Note */}
                        <div>
                            <label htmlFor="note" className="block text-sm font-medium text-gray-700 mb-2">
                                Nota (opcional, max 500 caracteres)
                            </label>
                            <textarea
                                id="note"
                                value={note}
                                onChange={(e) => setNote(e.target.value)}
                                maxLength={500}
                                rows={4}
                                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                placeholder="Como foi seu dia?"
                            />
                        </div>

                        {success && (
                            <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg">
                                {success}
                            </div>
                        )}

                        {error && (
                            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
                                {error}
                            </div>
                        )}

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full bg-blue-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-700 transition-colors disabled:opacity-50"
                        >
                            {loading ? 'Salvando...' : 'Salvar Mood Log (+5 XP)'}
                        </button>
                    </form>
                </div>

                {/* Histórico */}
                <div className="bg-white rounded-xl shadow-md p-6">
                    <h2 className="text-xl font-bold text-gray-900 mb-6">Histórico</h2>

                    {/* F7 (Fase B) — erro visível ao usuário */}
                    {historyError && (
                        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-4">
                            {historyError}
                        </div>
                    )}

                    {history.length === 0 && !historyError ? (
                        <p className="text-gray-600">Nenhum mood log registrado ainda.</p>
                    ) : (
                        <div className="space-y-4">
                            {history.map((log) => (
                                <div key={log.id} className="border border-gray-200 rounded-lg p-4">
                                    <div className="flex items-center justify-between mb-2">
                                        <div className="flex items-center gap-3">
                                            <span className="text-3xl">{MOOD_EMOJIS[log.mood - 1]}</span>
                                            <div>
                                                <p className="font-semibold text-gray-900">{MOOD_LABELS[log.mood - 1]}</p>
                                                <p className="text-sm text-gray-600">
                                                    {new Date(log.loggedAt).toLocaleDateString('pt-BR')}
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                    {log.tags.length > 0 && (
                                        <div className="flex gap-2 mb-2">
                                            {log.tags.map((tag, i) => (
                                                <span
                                                    key={i}
                                                    className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full"
                                                >
                                                    {tag}
                                                </span>
                                            ))}
                                        </div>
                                    )}
                                    {log.note && <p className="text-sm text-gray-600">{log.note}</p>}
                                </div>
                            ))}
                        </div>
                    )}

                    {/* F11 (Fase C) — botão "Carregar mais" com cursor pagination */}
                    {hasMore && (
                        <button
                            onClick={() => loadHistory(nextCursor!)}
                            disabled={historyLoading}
                            className="mt-4 w-full text-blue-600 border border-blue-300 py-2 rounded-lg hover:bg-blue-50 transition-colors disabled:opacity-50"
                        >
                            {historyLoading ? 'Carregando...' : 'Carregar mais'}
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}
