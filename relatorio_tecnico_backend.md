# 🔎 Relatório Técnico Estruturado — LifeSync Backend
**Stack:** NestJS 10 · TypeScript 5 · Prisma 6 · SQLite · Passport JWT  
**Análise realizada sobre todo o código-fonte em** `/lifesync-mvp/lifesync-backend/src`

---

# 1️⃣ Diagnóstico de Dívida Técnica

## 1.1 Code Smells

### 🔴 Tipo `any` excessivo (Magic Types)

| Arquivo | Linha | Problema | Impacto |
|---|---|---|---|
| `users.controller.ts` | 27, 34, 52 | `@CurrentUser() user: any` — tipo opaco | Nenhum autocomplete, erros em runtime invisíveis no compile |
| `challenges.controller.ts` | 28, 34, 40 | `@CurrentUser() user: any` | Idem |
| `mood-logs.controller.ts` | 23, 29 | `@CurrentUser() user: any` | Idem |
| `users.service.ts` | 37 | `const where: any` | Query sem tipagem pode incluir campos incorretos |
| `analytics.service.ts` | 12 | `const where: any` | Idem |
| `tenant.middleware.ts` | 7–8 | `(req as any).user`, `(req as any).companyId` | Casts inseguros, ausência de tipagem no request |

**Sugestão:** Criar interface `AuthenticatedUser` e estender `Request` do Express via namespace declaration.

---

### 🟡 Strings Hardcoded (Magic Strings)

| Arquivo | Linha | Problema |
|---|---|---|
| `auth.service.ts` | 62 | `role: 'EMPLOYEE'` (string literal) |
| `users.service.ts` | 83 | `currentUserRole !== 'ADMIN'` |
| `gamification.service.ts` | 28–42 | Nomes de badges como strings literais (`'Primeiro Passo'`, `'Mestre do Bem-Estar'`) |

**Sugestão:** Usar o `Role` enum já existente em `common/enums/role.enum.ts` de forma consistente. Criar `BadgeType` enum para os badges.

---

### 🟡 Injeção de Dependência por Campo (sem `readonly`)

| Arquivo | Linha | Problema |
|---|---|---|
| `auth.service.ts` | 21–23 | `private prisma:`, `private jwtService:`, `private configService:` — sem `readonly` |
| `users.service.ts` | 9 | `private prisma:` — sem `readonly` |
| `mood-logs.service.ts` | 13–15 | Idem |
| `challenges.service.ts` | 13–15 | Idem |

**Sugestão:** Declarar todas as dependências injetadas como `readonly` para imutabilidade e melhor intenção de design.

---

### 🟡 Lógica de Mapeamento Inline Repetida (Tags)

**Arquivo:** `mood-logs.service.ts`, linhas 34, 70, 92  
**Problema:** A lógica de transformar `tags: string` do banco em `string[]` e vice-versa (`join(',')`, `split(',')`) está duplicada em 3 pontos distintos.  
**Impacto:** Mudança no formato de armazenamento requer alteração em 3 lugares.  
**Sugestão:** Extrair funções utilitárias `tagsToString(tags: string[]): string` e `stringToTags(raw: string): string[]`.

---

### 🟡 Parâmetros Muitos Extensos

**Arquivo:** `users.service.ts`, linha 72  
```typescript
async update(id, updateUserDto, currentUserId, currentUserRole)
```
**Problema:** 4 parâmetros, 2 deles formam um "contexto do usuário" que deveria ser um objeto único.  
**Sugestão:** Passar `currentUser: AuthenticatedUser` ao invés de dois parâmetros separados.

---

### 🟡 Lógica de Negócio de Distribuição em Memória

**Arquivo:** `analytics.service.ts`, linhas 29–84  
**Problema:** Carrega **todos** os MoodLogs de uma empresa para calcular distribuição e média em memória JavaScript. Isso não escala.  
**Sugestão:** Usar `GROUP BY` e agregações SQL via Prisma raw query ou `$queryRaw`.

---

### 🟢 Stub sem Implementação

**Arquivo:** `notifications.service.ts`, linhas 7–10  
**Problema:** Serviço inteiro é um stub que apenas loga. Exportado e consumido como serviço real.  
**Impacto:** Funcionalidade prometida que não existe, pode enganar revisores e futuros devs.  
**Sugestão:** Marcar explicitamente com `TODO`, ou implementar com adapter para FCM/email real.

---

## 1.2 Violações de Arquitetura

### 🔴 Acoplamento Cruzado entre Módulos de Negócio

**Arquivos:** `mood-logs.service.ts` (linhas 4–5), `challenges.service.ts` (linhas 4–5)

```typescript
// mood-logs.service.ts
import { UsersService } from '../users/users.service';
import { GamificationService } from '../gamification/gamification.service';
```

**Padrão violado:** Separação de módulos — módulos de negócio importam serviços de outros módulos diretamente.  
**Problema:** Cria acoplamento forte entre módulos que deveriam ser independentes. `MoodLogsModule` depende de `UsersModule` e `GamificationModule`, tornando testes e isolamento difíceis.  
**Correção:** Usar **eventos de domínio** (NestJS EventEmitter) ou **CQRS**. `MoodLogsService` emite `MoodLogCreated`, e `GamificationService` reage ao evento.

---

### 🟡 `PrismaService` Injetado Diretamente em Todos os Services

**Problema:** O `PrismaService` é injetado diretamente em `AuthService`, `UsersService`, `MoodLogsService`, `ChallengesService`, `AnalyticsService` e `GamificationService`.  
**Padrão violado:** Não há camada de repositório — a lógica de acesso a dados está diretamente nos services.  
**Consequência:** Impossível trocar o ORM, difícil mockar em testes, queries espalhadas pelo código.  
**Correção:** Implementar Repository Pattern com interfaces: `IUserRepository`, `IMoodLogRepository`, etc.

---

### 🟡 Refresh Token sem Armazenamento/Revogação

**Arquivo:** `auth.service.ts`, linhas 128–153  
**Problema:** O `refresh_token` é verificado apenas via assinatura JWT. Não há controle de revogação (blacklist/whitelist). Um refresh token roubado é válido até sua expiração.  
**Padrão violado:** Security by design.  
**Correção:** Armazenar hash do refresh token no banco, validar e invalidar no uso.

---

### 🟡 `AppModule` Registra `PrismaService` como Provider Global mas Módulos Têm Providers Próprios

**Arquivo:** `app.module.ts`, linha 32 — `PrismaService` no provider do `AppModule`, mas cada módulo também usa `PrismaService` injetado.  
**Problema:** Configuração inconsistente. Deveria ser um módulo global `PrismaModule` com `@Global()`.

---

## 1.3 Violações dos Princípios SOLID

### S — Single Responsibility

| Classe | Violação |
|---|---|
| `AuthService` | Responsável por: registro de usuário, login, refresh de token, geração de tokens e validação de empresa. São responsabilidades distintas. |
| `GamificationService` | Controla tanto a lógica de awarding quanto as definições de badges (descrições hardcoded no switch/case). |
| `MoodLogsService` | Gerencia mood logs + chama UsersService (XP) + chama GamificationService (badge) = 3 responsabilidades. |

**Refatoração sugerida para `AuthService`:** Extrair `TokenService` para geração/validação de tokens JWT.

---

### O — Open/Closed

| Classe | Violação |
|---|---|
| `GamificationService.checkAndAwardBadge()` | Switch/case com badges hardcoded (linhas 27–42). Para adicionar um novo badge, é necessário modificar a classe — viola OCP. |

**Refatoração:** Criar classe `BadgeDefinition` e um registry de badges via Map/injeção.

---

### I — Interface Segregation

**Violação:** Não há interfaces para os Services — `UsersService`, `AuthService`, etc. são classes concretas consumidas diretamente. Impossível substituir por mocks via interface.

---

### D — Dependency Inversion

**Violação:** `MoodLogsService` depende diretamente de `UsersService` (classe concreta) e `GamificationService` (classe concreta). Deveria depender de abstrações (interfaces).

---

## 1.4 Acoplamento e Coesão

| Módulo | Acoplamento | Coesão | Nível |
|---|---|---|---|
| `AuthModule` | Baixo externo | Alta | **Médio** |
| `UsersModule` | Baixo externo | Alta | **Baixo** |
| `MoodLogsModule` | **Alto** (depende de Users + Gamification) | Média | **Alto** |
| `ChallengesModule` | **Alto** (depende de Users + Gamification) | Média | **Alto** |
| `GamificationModule` | Baixo externo | Baixa (badges hardcoded) | **Médio** |
| `AnalyticsModule` | Baixo externo | Alta | **Baixo** |
| `NotificationsModule` | Baixo (stub) | Alta (trivial) | **Baixo** |

**Problema de Acoplamento Crítico:** `MoodLogsModule` e `ChallengesModule` têm dependências de runtime sobre `UsersModule` e `GamificationModule`, criando um grafo de dependências tight-coupled.

---

# 2️⃣ Qualidade do Código

| Critério | Avaliação | Observação |
|---|---|---|
| Nomenclatura | ✅ Boa | Nomes descritivos, consistência razoável |
| Organização de pacotes | ✅ Boa | Estrutura por feature (modules) |
| Estrutura de camadas | ⚠️ Parcial | Falta camada de repositório |
| Clareza da regra de negócio | ⚠️ Parcial | Lógica de negócio misturada com persistência nos Services |
| Uso de DTOs | ✅ Adequado | DTOs com class-validator em todos os endpoints |
| Tratamento de exceções global | ✅ Bom | `HttpExceptionFilter` global configurado |
| Logging estruturado | ⚠️ Básico | Strings concatenadas, não JSON estruturado |
| Uso de Optional | ✅ Adequado | Prisma retorna null, tratado corretamente |
| Uso moderno de TS | ⚠️ Parcial | Uso de `any` em vários pontos críticos |

### Código Legado / Dependências Mortas
- `ioredis` instalado mas **não utilizado em nenhum arquivo** — dependência zumbi.
- `passport-google-oauth20` instalado mas sem implementação de estratégia Google.
- `uuid` instalado, mas o Prisma já gera UUIDs automaticamente — redundante.

---

# 3️⃣ Testabilidade

### Existência de Testes
- Diretórios `test/unit`, `test/integration`, `test/e2e` **existem mas estão vazios**.
- Cobertura estimada: **0%**.

### Problemas de Testabilidade

| Problema | Onde | Impacto |
|---|---|---|
| `PrismaService` injetado diretamente sem interface | Todos os services | Necessário mockar a classe concreta inteira |
| `UsersService` injetado em `MoodLogsService` | `mood-logs.service.ts` | Testes de MoodLogs necessitam mock de Users |
| `GamificationService` injetado em `MoodLogsService` | `mood-logs.service.ts` | Terceira dependência nos testes unitários |
| `new Date()` usado diretamente | `challenges.service.ts`, `mood-logs.service.ts` | Impossível mockar datas nos testes |

**Sugestões:**
1. Criar interfaces `IUserRepository`, `IMoodLogRepository`, etc.
2. Injetar `DateService` via token para mockar tempo
3. Implementar pelo menos um `spec` por módulo como ponto de partida

---

# 4️⃣ Segurança

| Vulnerabilidade | Arquivo | Linha | Risco | Detalhes |
|---|---|---|---|---|
| Login sem isolamento de empresa | `auth.service.ts` | 91–95 | **🔴 Alto** | `findFirst` busca email globalmente — usuário de empresa A pode logar com credencial de empresa B |
| Refresh token sem revogação | `auth.service.ts` | 128–153 | **🔴 Alto** | Tokens roubados válidos até expirar; sem blacklist |
| Falta de rate limiting | `auth.controller.ts` | — | **🔴 Alto** | `/login` e `/register` sem throttling; vulnerável a brute force |
| SQLite em produção | `schema.prisma` | 6 | **🟡 Médio** | Não suporta concurrent writes; inadequado para multi-tenant |
| CORS permissivo | `main.ts` | 14 | **🟡 Médio** | `CORS_ORIGIN` pode não estar definido corretamente em produção |
| bcrypt rounds hardcoded | `auth.service.ts` | 53 | **🟢 Baixo** | `bcrypt.hash(password, 10)` — rounds não configurável via env |

---

# 5️⃣ Performance e Escalabilidade

#### 🔴 Aggregation em Memória — AnalyticsService
**Arquivo:** `analytics.service.ts`, linhas 29–84  
Carrega todos os MoodLogs de uma empresa em memória para calcular média e distribuição.

```typescript
// Atual — problemático
const moodLogs = await this.prisma.moodLog.findMany({ where });
// ... reduce e forEach em memória
```
**Correção:** Usar `$queryRaw` com `AVG`, `COUNT`, `GROUP BY` no banco.

#### 🟡 N+1 Potencial — GamificationService
`checkFirstMoodLogBadge` e `checkChallengesMasterBadge` fazem queries separadas a cada operação. Se chamadas em loop, geram N+1.

#### 🟡 Falta de Cache
`ioredis` instalado como dependência mas **nunca é usado**. Implementar cache Redis para `getMoodSummary` (TTL: 5 min).

#### 🟡 SQLite — Limitações de Concorrência
SQLite suporta apenas um escritor simultâneo. Migrar para PostgreSQL antes de qualquer carga real.

#### 🟢 Paginação Ausente em `findHistory`
`maxLimit` fixado em 30. Sem cursor-based pagination para histórico longo.

---

# 6️⃣ Organização Arquitetural

### Arquitetura Atual
O projeto adota uma **Layered Architecture tradicional** com convenções NestJS:
```
Controller → Service → PrismaService (Database)
```

### Pontos Positivos
- Interceptors globais (logging, transform)
- Exception Filter global
- Guards declarativos (JWT, Roles)
- Middleware de tenant
- DTOs com validação

### Modelo Recomendado

```
┌─────────────────────────────┐
│        Controllers          │  ← HTTP, DTOs, Guards
├─────────────────────────────┤
│          Services           │  ← Regras de negócio puras
├─────────────────────────────┤
│        Repositories         │  ← Interfaces de acesso a dados
├─────────────────────────────┤
│     Prisma / Database       │  ← Implementação de persistência
└─────────────────────────────┘
```

**Estrutura ideal de pacotes:**
```
src/
  modules/
    auth/
      repositories/        ← NOVO
        user.repository.ts
        user.repository.interface.ts
  common/
    events/               ← NOVO (EventEmitter para desacoplar módulos)
    repositories/         ← NOVO (base repository pattern)
```

---

# 7️⃣ Score Geral do Projeto

| Dimensão | Nota | Justificativa |
|---|---|---|
| **Qualidade do Código** | 6/10 | Nomenclatura boa, mas `any` em excesso, strings hardcoded e lógica duplicada |
| **Arquitetura** | 5/10 | Estrutura modular correta, mas sem repository layer e acoplamento inter-módulos |
| **Manutenibilidade** | 5/10 | Fácil de entender, mas coupling alto e zero testes dificultam mudanças seguras |
| **Escalabilidade** | 4/10 | SQLite em produção, analytics em memória, sem cache, sem rate limiting |
| **Segurança** | 4/10 | Login sem isolamento por empresa, sem rate limiting, refresh sem revogação |

### Diagnóstico Final
Base arquitetural razoável com boas convenções NestJS, mas com **0% de cobertura de testes**, falhas de segurança relevantes, acoplamento excessivo entre módulos e limitações graves de escalabilidade.

### Nível do Projeto: **Júnior → Pleno**
> A estrutura e o ferramental indicam conhecimento do ecossistema NestJS, mas a ausência de testes, as falhas de segurança e o não-uso de padrões como Repository posicionam o código no nível júnior avançado.

---

# 8️⃣ Plano de Refatoração Prioritário

## 🔴 Alta Prioridade

| # | Item | Esforço | Arquivo(s) |
|---|---|---|---|
| 1 | **Corrigir isolamento de login por companyDomain** | Baixo | `auth.service.ts:91` |
| 2 | **Implementar rate limiting** (`@nestjs/throttler`) | Baixo | `auth.controller.ts`, `main.ts` |
| 3 | **Implementar revogação de refresh tokens** (hash no banco) | Médio | `auth.service.ts`, `schema.prisma` |
| 4 | **Criar interface `AuthenticatedUser`** e eliminar `any` nos controllers | Baixo | Todos os controllers |
| 5 | **Migrar de SQLite para PostgreSQL** | Médio | `schema.prisma`, `.env`, `docker-compose.yml` |

## 🟡 Média Prioridade

| # | Item | Esforço | Arquivo(s) |
|---|---|---|---|
| 6 | **Desacoplar módulos com EventEmitter** (substituir imports cruzados MoodLogs ↔ Gamification) | Médio | `mood-logs.service.ts`, `challenges.service.ts` |
| 7 | **Criar Repository pattern** com interfaces | Alto | Todos os services |
| 8 | **Mover analytics para SQL aggregation** | Médio | `analytics.service.ts` |
| 9 | **Extrair `TokenService`** de `AuthService` | Baixo | `auth.service.ts` |
| 10 | **Substituir magic strings** por enums (`Role`, `BadgeType`) | Baixo | Multiple |
| 11 | **Ativar e implementar Redis cache** para analytics/ranking | Médio | `analytics.service.ts` |

## 🟢 Baixa Prioridade

| # | Item | Esforço | Arquivo(s) |
|---|---|---|---|
| 12 | **Implementar testes unitários** (ao menos 1 por service) | Alto | `test/unit/` |
| 13 | **Implementar `NotificationsService`** real (FCM ou SMTP) | Alto | `notifications.service.ts` |
| 14 | **Remover dependências não utilizadas** (`ioredis`, `passport-google-oauth20`, `uuid`) | Baixo | `package.json` |
| 15 | **Extrair helper de tags** (`tagsToString` / `stringToTags`) | Baixo | `mood-logs.service.ts` |
| 16 | **Adicionar logging estruturado em JSON** para produção | Baixo | `logging.interceptor.ts` |
| 17 | **Implementar cursor-based pagination** no histórico de mood logs | Médio | `mood-logs.service.ts` |
| 18 | **Adicionar `readonly`** em todas as injeções de dependência | Baixo | Todos os services |
