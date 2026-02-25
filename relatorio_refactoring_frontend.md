# LifeSync Frontend — Refatoração Técnica

> **Stack:** Next.js 14 (App Router) · TypeScript 5 · Tailwind CSS  
> **Build:** ✅ zero erros TypeScript

---

## Fase A — Segurança e Funcional Crítico

### F1. Login sem campo `companyDomain`

**Problema:** `login/page.tsx` enviava apenas `email + password`. O backend exige `companyDomain` para isolamento multi-tenant (`@@unique([email, companyId])`) — **todo login falhava com 401** após a refatoração do backend.

**Técnica:** Adição do campo `companyDomain` ao formulário, ao `AuthContext.login()` e ao `authAPI.login()`.

```tsx
// Antes — chamada incompleta
await authAPI.login(email, password);

// Depois — companyDomain obrigatório
await authAPI.login(email, password, companyDomain);
```

**Arquivos:** `app/login/page.tsx`, `contexts/AuthContext.tsx`, `lib/api.ts`

---

### F2. Logout sem revogação de token no servidor

**Problema:** `AuthContext.logout()` limpava o `localStorage` mas nunca chamava `POST /auth/logout`. O `refreshToken` permanecia válido no banco — qualquer cópia interceptada permitia re-autenticação.

**Técnica:** Revogação ativa com **best-effort** (falha silenciosa — logout local sempre ocorre).

```typescript
// Antes — token vive eternamente no banco
const logout = () => {
    localStorage.removeItem('accessToken');
    router.push('/login');
};

// Depois — revoga no servidor antes de limpar
const logout = async () => {
    const refreshToken = localStorage.getItem('refreshToken');
    if (refreshToken) {
        try { await authAPI.logout(refreshToken); } catch { /* best-effort */ }
    }
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    router.push('/login');
};
```

**Arquivos:** `contexts/AuthContext.tsx`, `lib/api.ts` (endpoint `authAPI.logout`)

---

### F3. Sem interceptor de renovação automática (401)

**Problema:** Quando o `accessToken` expirava, todos os requests retornavam 401 — o usuário precisava fazer logout e login manualmente, mesmo com `refreshToken` válido.

**Técnica:** Axios Response Interceptor com **fila de requests pendentes** — evita múltiplos refreshes simultâneos.

```typescript
let isRefreshing = false;
let failedQueue: Array<{ resolve: Function; reject: Function }> = [];

api.interceptors.response.use(null, async (error) => {
    if (error.response?.status === 401 && !originalRequest._retry) {
        if (isRefreshing) {
            // requests aguardam na fila o refresh em andamento
            return new Promise((resolve, reject) => failedQueue.push({ resolve, reject }));
        }
        originalRequest._retry = true;
        isRefreshing = true;
        // ... chama /auth/refresh, atualiza token, re-tenta fila
    }
});
```

**Arquivo:** `lib/api.ts`

---

## Fase B — Tipagem e Magic Strings

### F4. `catch (err: any)` em todos os formulários

**Problema:** `catch (err: any)` em `login`, `register`, `mood-logs` e `challenges` — nenhuma verificação de tipo em compile time.

**Técnica:** Interface `ApiError` + cast explícito.

```typescript
// types/index.ts
export interface ApiError {
    response?: { data?: { message?: string }; status?: number };
    message?: string;
}

// Antes
} catch (err: any) { setError(err.response?.data?.message || '...') }

// Depois
} catch (err) {
    const apiErr = err as ApiError;
    setError(apiErr.response?.data?.message ?? '...');
}
```

**Arquivos:** `types/index.ts`, todos os formulários de página

---

### F5. Magic strings de roles

**Problema:** `user.role === 'MANAGER' || user.role === 'ADMIN'` inline — typo silencioso, sem autocomplete.

**Técnica:** Const object como fonte única de verdade (espelho do enum do backend).

```typescript
// constants/roles.ts
export const Role = { EMPLOYEE: 'EMPLOYEE', MANAGER: 'MANAGER', ADMIN: 'ADMIN' } as const;

// Antes
user.role === 'MANAGER' || user.role === 'ADMIN'

// Depois
user.role === Role.MANAGER || user.role === Role.ADMIN
```

**Arquivos:** `constants/roles.ts` (novo), `app/dashboard/layout.tsx`

---

### F6. `alert()` nativo bloqueando a thread

**Problema:** `alert(err.response?.data?.message)` em `challenges/page.tsx` — síncrono, bloqueia o event loop, sem estilo.

**Técnica:** Estado `error` React com feedback inline estilizado.

```tsx
// Antes
alert(err.response?.data?.message || 'Erro ao completar desafio');

// Depois
setError(apiErr.response?.data?.message ?? 'Erro ao completar desafio');
// + JSX: {error && <div className="bg-red-50 ...">}
```

**Arquivo:** `app/dashboard/challenges/page.tsx`

---

### F7. Erros silenciados com `console.error`

**Problema:** `analytics/page.tsx` e `mood-logs/page.tsx` engolavam falhas de rede com `console.error` — usuário via tela em branco sem explicação.

**Técnica:** Estado de erro explícito com mensagem clara ao usuário.

```tsx
// Antes
} catch (err) { console.error('Erro ao carregar:', err); }

// Depois
} catch { setError('Não foi possível carregar os dados. Verifique sua conexão.'); }
// + JSX visível ao usuário
```

**Arquivos:** `app/dashboard/analytics/page.tsx`, `app/dashboard/mood-logs/page.tsx`

---

### F8. `<a>` nativo em vez de `<Link>` do Next.js

**Problema:** Botões em `dashboard/page.tsx` usavam `<a href="...">` — full page reload, sem client-side navigation nem prefetch.

**Técnica:** `<Link>` do `next/link` para navegação client-side com prefetch automático.

```tsx
// Antes
<a href="/dashboard/mood-logs">Ir para Mood Logs</a>

// Depois
<Link href="/dashboard/mood-logs">Ir para Mood Logs</Link>
```

**Arquivo:** `app/dashboard/page.tsx`

---

### F9. `role: string` sem restrição de valores

**Problema:** `role: string` no tipo `User` aceita qualquer string — sem verificação de valores válidos em compile time.

**Técnica:** União literal TypeScript exportada como `UserRole`.

```typescript
// Antes
export interface User { role: string; }

// Depois
export type UserRole = 'EMPLOYEE' | 'MANAGER' | 'ADMIN';
export interface User { role: UserRole; }
```

**Arquivo:** `types/index.ts`

---

## Fase C — UX e Manutenibilidade

### F10. Campos opcionais incorretos no tipo `User`

**Problema:** `companyId?: string` e `createdAt?: string` marcados como opcionais sem motivo — a API sempre os retorna.

**Técnica:** Remoção do `?` para refletir o contrato real da API.

```typescript
// Antes
export interface User { createdAt?: string; companyId?: string; }

// Depois
export interface User { createdAt: string; companyId: string; }
```

**Arquivo:** `types/index.ts`

---

### F11. Cursor pagination ignorada no histórico

**Problema:** A API retornava `{ data: MoodLog[], nextCursor: string | null }` mas o componente descartava `nextCursor` — impossível ver mais de 7 registros.

**Técnica:** Controle de cursor em estado React + botão "Carregar mais" com acumulação de dados.

```typescript
// api.ts — suporte a cursor
getHistory: (limit = 7, cursor?: string) =>
    api.get('/mood-logs/history', { params: { limit, ...(cursor ? { cursor } : {}) } }),

// mood-logs/page.tsx — acumula registros
const loadHistory = async (cursor?: string) => {
    const { data, nextCursor: nc } = response.data;
    setHistory(prev => cursor ? [...prev, ...data] : data);
    setHasMore(nc !== null);
    setNextCursor(nc);
};
// + botão "Carregar mais" quando hasMore === true
```

**Arquivos:** `app/dashboard/mood-logs/page.tsx`, `lib/api.ts`, `types/index.ts` (`PaginatedMoodLogs`)

---

## Resumo de Impacto

| Dimensão | Antes | Depois |
|----------|-------|--------|
| **Segurança** | Logout sem revogar, login sem tenant, sem refresh 401 | Revogação ativa, `companyDomain` obrigatório, interceptor com fila |
| **Tipagem** | `err: any`, `role: string`, campos `?` incorretos | `ApiError`, `UserRole`, campos obrigatórios, `Role` const |
| **UX** | `alert()` bloqueante, erros silenciosos, `<a>` com reload | Feedback inline, erro visível, `<Link>` com prefetch |
| **Manutenibilidade** | Magic strings, pagination ignorada | `Role` centralizado, cursor pagination funcional |
