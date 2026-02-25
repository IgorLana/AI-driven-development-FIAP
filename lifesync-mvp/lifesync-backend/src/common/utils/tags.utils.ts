/**
 * Seção 3 (Fase 5) — Extrai helpers de tags para eliminar código duplicado.
 * Antes: `tags.map(t => t.toLowerCase()).join(',')` repetido em MoodLogsService.
 * Agora: funções puras testáveis centralizadas aqui.
 */

export function tagsToString(tags: string[] | undefined | null): string {
    if (!tags || tags.length === 0) return '';
    return tags.map((t) => t.toLowerCase().trim()).join(',');
}

export function stringToTags(tagsString: string | undefined | null): string[] {
    if (!tagsString) return [];
    return tagsString.split(',').filter(Boolean);
}
