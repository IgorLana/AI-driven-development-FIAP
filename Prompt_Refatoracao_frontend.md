# 📌 PROMPT DE REFATORAÇÃO GUIADA — LifeSync Frontend

Aja como um **Engenheiro Frontend Sênior especializado em Next.js 14,
TypeScript, Segurança de Autenticação, Clean Code e Testabilidade**.

Você deve utilizar integralmente o arquivo **`REFACTORING-frontend.md`**
como fonte oficial de diagnóstico técnico.

⚠️ REGRAS OBRIGATÓRIAS:

-   Não ignorar nenhum ponto do relatório.
-   Não propor melhorias genéricas fora do relatório.
-   Não remover funcionalidades existentes.
-   Não quebrar o contrato com a API do backend.
-   Trabalhar de forma incremental e estruturada.
-   Referenciar explicitamente cada seção do relatório ao implementar melhorias.

------------------------------------------------------------------------

# 🎯 OBJETIVO

Executar uma **refatoração completa e incremental**, cobrindo TODOS os
pontos descritos no:

-   Diagnóstico de Dívida Técnica
-   Violações de Arquitetura
-   Violações de Design (SRP, DIP)
-   Problemas de Acoplamento
-   Qualidade de Código
-   Testabilidade
-   Segurança
-   Performance
-   Organização Arquitetural
-   Plano de Refatoração Prioritário

------------------------------------------------------------------------

# 🔴 FASE A — ALTA PRIORIDADE (Segurança e Funcional Crítico)

Baseado nas seções:

-   1.2 Violações de Arquitetura
-   4 Segurança
-   8 Plano de Refatoração Prioritário (itens F1, F2, F3)

Implementar obrigatoriamente:

## F1 — Adicionar `companyDomain` ao Login

(Seção 1.2 + Seção 4)

-   Adicionar campo `companyDomain` ao formulário `login/page.tsx`
-   Atualizar assinatura de `AuthContext.login()` para aceitar `companyDomain`
-   Atualizar `authAPI.login()` em `lib/api.ts` para enviar o campo
-   Verificar que `register/page.tsx` já usa o campo corretamente

------------------------------------------------------------------------

## F2 — Implementar Revogação de Token no Logout

(Seção 1.2 + Seção 4)

-   Adicionar endpoint `authAPI.logout(refreshToken: string)` em `lib/api.ts`
-   Atualizar `AuthContext.logout()` para chamar `POST /auth/logout` antes de limpar `localStorage`
-   Implementar estratégia **best-effort** (falha silenciosa — logout local sempre ocorre)

------------------------------------------------------------------------

## F3 — Implementar Interceptor de Renovação Automática (401)

(Seção 1.2 + Seção 4)

-   Adicionar Axios Response Interceptor em `lib/api.ts`
-   Detectar status 401 e tentar `POST /auth/refresh` com o `refreshToken`
-   Implementar **fila de requests pendentes** para evitar múltiplos refreshes simultâneos
-   Redirecionar para `/login` se o refresh também falhar
-   Usar flag `_retry` para evitar loop infinito

------------------------------------------------------------------------

# 🟡 FASE B — MÉDIA PRIORIDADE (Tipagem e Magic Strings)

Baseado nas seções:

-   1.1 Code Smells
-   1.3 Violações de Design
-   2 Qualidade do Código
-   8 Plano (itens F4 a F9)

Implementar:

## F4 — Eliminar `catch (err: any)`

-   Criar interface `ApiError` em `types/index.ts`
-   Substituir todos os `catch (err: any)` por `catch (err)` com cast `err as ApiError`
-   Arquivos afetados: `login/page.tsx`, `register/page.tsx`, `mood-logs/page.tsx`, `challenges/page.tsx`

------------------------------------------------------------------------

## F5 — Substituir Magic Strings de Roles

-   Criar `constants/roles.ts` com:

```typescript
export const Role = {
    EMPLOYEE: 'EMPLOYEE',
    MANAGER: 'MANAGER',
    ADMIN: 'ADMIN',
} as const;
```

-   Substituir comparações inline em `dashboard/layout.tsx`

------------------------------------------------------------------------

## F6 — Substituir `alert()` por Feedback Inline

-   Remover `alert(err.response?.data?.message)` de `challenges/page.tsx`
-   Adicionar estado `error` com mensagem de erro inline estilizada
-   Seguir o mesmo padrão de `login/page.tsx` e `register/page.tsx`

------------------------------------------------------------------------

## F7 — Mostrar Erros ao Usuário (substituir `console.error`)

-   Adicionar estado `error` em `analytics/page.tsx`
-   Adicionar estado `error` em `mood-logs/page.tsx` para o `loadHistory`
-   Exibir mensagem clara ao usuário em caso de falha de rede

------------------------------------------------------------------------

## F8 — Substituir `<a>` por `<Link>` do Next.js

-   Substituir tags `<a href="...">` em `dashboard/page.tsx` por `<Link>`
-   Garantir client-side navigation e prefetch automático

------------------------------------------------------------------------

## F9 — Corrigir Tipagem do Tipo `User`

-   Criar tipo `UserRole = 'EMPLOYEE' | 'MANAGER' | 'ADMIN'`
-   Trocar `role: string` por `role: UserRole` em `types/index.ts`
-   Remover `?` desnecessário de `companyId` e `createdAt`

------------------------------------------------------------------------

# 🟢 FASE C — UX E MANUTENIBILIDADE

Baseado nas seções:

-   1.1 Code Smells
-   5 Performance e Escalabilidade
-   6 Organização Arquitetural
-   8 Plano (itens F10 a F14)

Implementar:

## F10 — Campos Opcionais Incorretos

-   Remover `?` de `companyId` e `createdAt` no tipo `User` (Seção 1.1)

------------------------------------------------------------------------

## F11 — Implementar Cursor Pagination no Histórico

(Seção 5 — Performance)

-   Adicionar parâmetro `cursor?: string` em `moodLogsAPI.getHistory()`
-   Adicionar tipo `PaginatedMoodLogs` em `types/index.ts`
-   Atualizar `mood-logs/page.tsx`:
    -   Armazenar `nextCursor` em estado React
    -   Acumular registros ao clicar em "Carregar mais"
    -   Exibir botão apenas quando `nextCursor !== null`

------------------------------------------------------------------------

## F12 — Extrair Custom Hooks

(Seção 6 — Organização Arquitetural)

Criar pasta `hooks/` com:

-   `useMoodLogs.ts` — lógica de busca e submissão de mood logs
-   `useChallenges.ts` — lógica de busca e conclusão de desafios
-   `useAnalytics.ts` — lógica de busca de analytics

Requisitos:
-   Hooks retornam `{ data, loading, error }` + funções de ação
-   Componente de página usa apenas o hook, sem chamadas de API diretas

------------------------------------------------------------------------

# 📌 ESTRUTURA OBRIGATÓRIA DE RESPOSTA

Para cada fase:

1️⃣ Itens do relatório sendo tratados (referenciar seção)\
2️⃣ Estratégia de refatoração\
3️⃣ Código completo atualizado por arquivo\
4️⃣ Impacto na arquitetura ou UX\
5️⃣ Princípios de design aplicados (SRP, DIP, DRY)\
6️⃣ Ganhos em segurança, tipagem ou manutenibilidade

------------------------------------------------------------------------

# 📌 RESTRIÇÃO FINAL

Não avançar automaticamente entre fases.

Ao concluir cada fase, perguntar:

> "Deseja avançar para a próxima fase?"

------------------------------------------------------------------------

# 📊 META FINAL

Elevar as notas do relatório para:

-   Segurança ≥ 8/10
-   Arquitetura ≥ 8/10
-   Manutenibilidade ≥ 8/10
-   Escalabilidade ≥ 7/10
-   Qualidade do Código ≥ 8/10

------------------------------------------------------------------------

Este prompt deve usar EXCLUSIVAMENTE os pontos do `REFACTORING-frontend.md`
como base de decisão.
