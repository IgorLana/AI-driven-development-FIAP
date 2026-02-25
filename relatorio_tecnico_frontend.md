# 🔎 Relatório Técnico Estruturado — LifeSync Frontend
**Stack:** Next.js 14 (App Router) · TypeScript 5 · Tailwind CSS · Axios  
**Análise realizada sobre todo o código-fonte em** `/lifesync-mvp/lifesync-frontend`

---

# 1️⃣ Diagnóstico de Dívida Técnica

## 1.1 Code Smells

### 🔴 `catch (err: any)` — Magic Types em Formulários

| Arquivo | Linha | Problema | Impacto |
|---|---|---|---|
| `login/page.tsx` | 21 | `catch (err: any)` | Acesso `err.response?.data?.message` sem segurança de tipo |
| `register/page.tsx` | 23 | `catch (err: any)` | Idem |
| `mood-logs/page.tsx` | 53 | `catch (err: any)` | Idem |
| `challenges/page.tsx` | 48 | `catch (err: any)` | Idem |

**Sugestão:** Criar interface `ApiError` em `types/index.ts` e usar `err as ApiError` nos catch blocks.

---

### 🟡 Strings Hardcoded de Roles (Magic Strings)

| Arquivo | Linha | Problema |
|---|---|---|
| `dashboard/layout.tsx` | 87 | `user.role === 'MANAGER' \|\| user.role === 'ADMIN'` comparado inline |

**Sugestão:** Criar `constants/roles.ts` com `Role` const object, espelhando o enum do backend.

---

### 🟡 `role: string` sem Restrição de Valores

**Arquivo:** `types/index.ts`, linha 5  
**Problema:** `role: string` aceita qualquer string — `user.role = 'superadmin'` compila sem erro.  
**Sugestão:** Usar união literal `'EMPLOYEE' | 'MANAGER' | 'ADMIN'` exportada como `UserRole`.

---

### 🟡 Campos Opcionais Incorretos no Tipo `User`

**Arquivo:** `types/index.ts`, linhas 8–9  
**Problema:** `createdAt?: string` e `companyId?: string` marcados como opcionais, mas a API sempre os retorna. Força verificações `?.` desnecessárias em todo código consumidor.  
**Sugestão:** Remover `?` — tornar obrigatórios conforme o contrato da API.

---

### 🟡 `alert()` Nativo Bloqueando a Thread

**Arquivo:** `challenges/page.tsx`, linha 49  
**Problema:** `alert(err.response?.data?.message)` é síncrono e bloqueia o event loop. Renderiza popup nativo sem estilo, inconsistente com a UI.  
**Sugestão:** Usar estado de erro React com feedback inline estilizado (padrão já adotado nas demais páginas).

---

### 🟡 Erros de Rede Silenciados com `console.error`

| Arquivo | Linha | Problema |
|---|---|---|
| `analytics/page.tsx` | 19 | `console.error('Erro ao carregar analytics:', err)` — usuário vê tela em branco |
| `mood-logs/page.tsx` | 27 | `console.error('Erro ao carregar histórico:', err)` — idem |

**Sugestão:** Adicionar estado `error` com mensagem visível ao usuário.

---

### 🟢 `<a>` Nativo em Vez de `<Link>` do Next.js

**Arquivo:** `dashboard/page.tsx`, linhas 63–68, 74–79  
**Problema:** Links de navegação usam `<a href="...">` — causam full page reload, perdem client-side navigation e prefetch automático do App Router.  
**Sugestão:** Substituir por `<Link>` do `next/link`.

---

## 1.2 Violações de Arquitetura

### 🔴 Login Desconectado do Backend Refatorado (companyDomain ausente)

**Arquivo:** `app/login/page.tsx`, `contexts/AuthContext.tsx`, `lib/api.ts`

```typescript
// login/page.tsx — envia apenas email + password
await login(email, password);

// lib/api.ts — chamada incompleta
login: (email: string, password: string) =>
    api.post('/auth/login', { email, password }),
```

**Padrão violado:** Contrato de API — o backend exige `companyDomain` para isolamento multi-tenant usando `@@unique([email, companyId])`. Sem esse campo, **todo login falha com 401**.  
**Correção:** Adicionar campo `companyDomain` ao formulário de login, à assinatura do `AuthContext.login()` e ao `authAPI.login()`.

---

### 🔴 Logout sem Revogação de Token no Servidor

**Arquivo:** `contexts/AuthContext.tsx`, linhas 67–72

```typescript
// Atual — revogação apenas local
const logout = () => {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    router.push('/login');
};
```

**Padrão violado:** Security by design — o `refreshToken` continua válido no banco após o logout. Qualquer cópia interceptada do token permite re-autenticação indefinida.  
**Correção:** Chamar `POST /auth/logout` com o `refreshToken` antes de limpar o `localStorage`.

---

### 🟡 Sem Interceptor de Renovação Automática de Token (401)

**Arquivo:** `lib/api.ts`  
**Problema:** Quando o `accessToken` expira, todos os requests retornam 401 sem tentativa de renovação. O usuário precisa fazer logout e login manualmente para continuar.  
**Padrão violado:** UX e segurança — o `refreshToken` existe exatamente para renovar sessões silenciosamente.  
**Correção:** Implementar Axios Response Interceptor que detecta 401, chama `POST /auth/refresh` e re-tenta o request original com o novo token.

---

### 🟡 Cursor Pagination do Backend Ignorada

**Arquivo:** `mood-logs/page.tsx`, linha 26; `lib/api.ts`, linha 49  
**Problema:** A API retorna `{ data: MoodLog[], nextCursor: string | null }`, mas o componente acessa apenas `response.data.data` e descarta `nextCursor`. Impossível carregar mais de 7 registros.  
**Correção:** Armazenar `nextCursor` em estado React e expor botão "Carregar mais" que acumula registros.

---

## 1.3 Violações dos Princípios de Design

### S — Single Responsibility

| Componente | Violação |
|---|---|
| `AuthContext.tsx` | Gerencia estado de autenticação + chamadas de API + navegação — 3 responsabilidades |
| `mood-logs/page.tsx` | UI + busca de dados + transformação de tags em um único componente de 189 linhas |

**Refatoração sugerida:** Separar lógica de dados em hooks customizados (`useMoodLogs`, `useChallenges`).

---

### O — Open/Closed

| Local | Violação |
|---|---|
| `dashboard/layout.tsx` | Verificação de role inline com strings — para adicionar novo role, modifica o componente diretamente |

---

### D — Dependency Inversion

**Violação:** Componentes chamam `moodLogsAPI`, `challengesAPI`, etc. diretamente — sem abstração. Impossível trocar a implementação de API (ex: SWR, React Query, GraphQL) sem modificar todos os componentes.

---

## 1.4 Acoplamento e Coesão

| Módulo | Acoplamento | Coesão | Nível |
|---|---|---|---|
| `AuthContext.tsx` | Baixo externo | Baixa (responsabilidades múltiplas) | **Médio** |
| `lib/api.ts` | Baixo | Alta | **Baixo** |
| `mood-logs/page.tsx` | **Médio** (chama API diretamente) | Baixa (UI + dados + lógica) | **Alto** |
| `challenges/page.tsx` | **Médio** | Média | **Médio** |
| `analytics/page.tsx` | **Médio** | Alta | **Baixo** |
| `dashboard/layout.tsx` | Baixo | Média | **Baixo** |
| `types/index.ts` | — | Alta | **Baixo** |

---

# 2️⃣ Qualidade do Código

| Critério | Avaliação | Observação |
|---|---|---|
| Nomenclatura | ✅ Boa | Nomes descritivos e consistentes |
| Organização de pastas | ✅ Boa | Estrutura App Router do Next.js 14 |
| Separação de responsabilidades | ⚠️ Parcial | Lógica de API misturada nos componentes |
| Tipagem TypeScript | ⚠️ Parcial | `any` nos catch, `role: string`, campos `?` incorretos |
| Tratamento de erros | ⚠️ Básico | `console.error` silencioso, `alert()` nativo |
| Uso de componentes Next.js | ⚠️ Parcial | `<a>` em vez de `<Link>` em alguns lugares |
| Segurança de autenticação | ❌ Insuficiente | Logout sem revogar, sem interceptor 401 |
| Compatibilidade com backend | ❌ Quebrada | Login sem `companyDomain` — falha em produção |

### Dependências Mortas / Inconsistências
- `companyDomain` presente no `register/page.tsx` mas **ausente** no `login/page.tsx` — assimetria no mesmo fluxo de autenticação.
- `moodLogsAPI.getHistory()` retorna `nextCursor` mas nunca é usado — funcionalidade desperdiçada.

---

# 3️⃣ Testabilidade

### Existência de Testes
- Nenhum arquivo de teste encontrado no projeto.
- Cobertura estimada: **0%**.

### Problemas de Testabilidade

| Problema | Onde | Impacto |
|---|---|---|
| Chamadas de API diretas nos componentes | Todos os componentes | Necessário mockar axios inteiro para testar render |
| Lógica de autenticação no Context | `AuthContext.tsx` | Hard de testar sem ambiente de navegador completo |
| `localStorage` chamado diretamente | `AuthContext.tsx`, `lib/api.ts` | Requer polyfill em ambiente de teste |
| Nenhum hook customizado | Todas as páginas | Lógica de dados não testável isoladamente |

**Sugestões:**
1. Criar hooks customizados (`useMoodLogs`, `useChallenges`) separando lógica de busca da UI
2. Usar `msw` (Mock Service Worker) para interceptar chamadas de API nos testes
3. Testar pelo menos `AuthContext` e `lib/api.ts` com Jest + Testing Library

---

# 4️⃣ Segurança

| Vulnerabilidade | Arquivo | Risco | Detalhes |
|---|---|---|---|
| Login sem `companyDomain` | `login/page.tsx`, `api.ts` | **🔴 Alto** | Login falha com backend multi-tenant; campo ausente no formulário |
| Logout sem revogação de token | `AuthContext.tsx` | **🔴 Alto** | `refreshToken` válido no banco após logout — token roubado reutilizável |
| Sem renovação automática de sessão | `api.ts` | **🟡 Médio** | 401 não tratado — usuário perde sessão prematuramente |
| Token armazenado em `localStorage` | `AuthContext.tsx` | **🟡 Médio** | Vulnerável a XSS — alternativa: `httpOnly cookie` gerenciado pelo servidor |
| Credenciais hardcoded na UI | `login/page.tsx` | **🟢 Baixo** | Bloco com `joao@acme.com / password123` visível em produção |

---

# 5️⃣ Performance e Escalabilidade

#### 🟡 Cursor Pagination Ignorada
A API retorna `nextCursor` mas o frontend sempre busca os mesmos 7 registros mais recentes — sem possibilidade de paginação incremental ou histórico completo.

#### 🟡 Sem Prefetch de Navegação
Links de ação em `dashboard/page.tsx` usam `<a>` nativo — o Next.js não faz prefetch das páginas de destino. Usuário sente latência ao navegar.

#### 🟢 Re-fetch Manual sem Cache
`loadHistory()` e `loadSummary()` são chamadas a cada montagem do componente sem qualquer cache. Bibliotecas como **SWR** ou **React Query** resolveriam com stale-while-revalidate e deduplicação automática.

#### 🟢 Loading States Sem Skeleton
Estado de carregamento exibe texto simples `"Carregando..."` — sem skeleton screens que melhoram a percepção de performance.

---

# 6️⃣ Organização Arquitetural

### Arquitetura Atual
```
page.tsx → chamada direta de API (lib/api.ts) → estado local com useState
```

### Pontos Positivos
- Estrutura App Router do Next.js 14 bem organizada
- `AuthContext` centraliza estado de autenticação globalmente
- `types/index.ts` como fonte de tipos compartilhados
- Tailwind CSS usado consistentemente

### Modelo Recomendado

```
┌─────────────────────────────┐
│       Pages / Layout        │  ← UI, estrutura, guards de rota
├─────────────────────────────┤
│      Custom Hooks           │  ← useMoodLogs, useChallenges, useAnalytics
├─────────────────────────────┤
│      API Layer (lib/api)    │  ← Chamadas HTTP tipadas, interceptors
├─────────────────────────────┤
│      Types / Constants      │  ← Contratos, enums, interfaces
└─────────────────────────────┘
```

**Estrutura ideal de pastas:**
```
lifesync-frontend/
  app/                    ← Pages e layouts (Next.js App Router)
  components/             ← Componentes reutilizáveis [VAZIO — criar]
  hooks/                  ← Custom hooks de dados [NOVO]
    useMoodLogs.ts
    useChallenges.ts
    useAnalytics.ts
  lib/
    api.ts                ← HTTP client com interceptors
  constants/
    roles.ts              ← [NOVO] Role const object
  types/
    index.ts              ← Interfaces e tipos
  contexts/
    AuthContext.tsx        ← Estado global de autenticação
```

---

# 7️⃣ Score Geral do Projeto

| Dimensão | Nota | Justificativa |
|---|---|---|
| **Qualidade do Código** | 6/10 | Nomenclatura boa, mas `any` nos catch, campos opcionais incorretos e `alert()` nativo |
| **Arquitetura** | 5/10 | Estrutura App Router correta, mas sem hooks customizados, lógica de dados nos componentes |
| **Manutenibilidade** | 5/10 | Fácil de entender, mas sem testes e sem separação UI/dados |
| **Escalabilidade** | 5/10 | Cursor pagination ignorada, sem cache, sem skeleton, `<a>` sem prefetch |
| **Segurança** | 3/10 | Logout sem revogar token, login sem `companyDomain` (quebrado), sem renovação automática |

### Diagnóstico Final
Base visual e estrutural razoável com boas convenções Next.js, mas com **0% de cobertura de testes**, falhas críticas de segurança (logout incompleto, login quebrado) e ausência de separação entre lógica de dados e apresentação.

### Nível do Projeto: **Júnior → Pleno**
> A estrutura de pastas, uso do App Router e componentização indicam familiaridade com Next.js moderno, mas a ausência de testes, falhas de segurança e mistura de responsabilidades nos componentes posicionam o código no nível júnior avançado.

---

# 8️⃣ Plano de Refatoração Prioritário

## 🔴 Alta Prioridade

| # | Item | Esforço | Arquivo(s) |
|---|---|---|---|
| F1 | **Adicionar `companyDomain` ao login** e ao `authAPI.login()` | Baixo | `login/page.tsx`, `api.ts`, `AuthContext.tsx` |
| F2 | **Implementar revogação de token no logout** (`POST /auth/logout`) | Baixo | `AuthContext.tsx`, `api.ts` |
| F3 | **Adicionar interceptor de renovação automática (401)** com fila de requests | Médio | `api.ts` |

## 🟡 Média Prioridade

| # | Item | Esforço | Arquivo(s) |
|---|---|---|---|
| F4 | **Eliminar `catch (err: any)`** — criar interface `ApiError` | Baixo | `types/index.ts`, todas as páginas |
| F5 | **Substituir magic strings de roles** por `Role` const object | Baixo | `constants/roles.ts`, `layout.tsx` |
| F6 | **Substituir `alert()` por estado de erro inline** | Baixo | `challenges/page.tsx` |
| F7 | **Mostrar erros ao usuário** em vez de `console.error` silencioso | Baixo | `analytics/page.tsx`, `mood-logs/page.tsx` |
| F8 | **Substituir `<a>` por `<Link>`** para client-side navigation | Baixo | `dashboard/page.tsx` |
| F9 | **Corrigir tipagem** — `UserRole` literal e campos obrigatórios | Baixo | `types/index.ts` |

## 🟢 Baixa Prioridade

| # | Item | Esforço | Arquivo(s) |
|---|---|---|---|
| F10 | **Remover `?` desnecessários** em `companyId` e `createdAt` | Baixo | `types/index.ts` |
| F11 | **Implementar cursor pagination** — botão "Carregar mais" no histórico | Médio | `mood-logs/page.tsx`, `api.ts` |
| F12 | **Extrair hooks customizados** (`useMoodLogs`, `useChallenges`, `useAnalytics`) | Alto | `hooks/` (novo) |
| F13 | **Implementar testes** com Jest + Testing Library + msw | Alto | `__tests__/` (novo) |
| F14 | **Remover credenciais hardcoded** do `login/page.tsx` | Baixo | `login/page.tsx` |
