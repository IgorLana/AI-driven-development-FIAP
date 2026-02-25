# LifeSync Backend — Refatoração Técnica

> **Período:** Fev/2026 | **Build:** ✅ zero erros TypeScript | **Testes:** 25/25 passando

---

## Fase 1 — Segurança Crítica

### 1. Login sem isolamento multi-tenant

**Problema:** O login buscava o usuário apenas por `email`, sem filtrar pela empresa. Um usuário de `empresa-a.com` conseguia autenticar com credenciais válidas de `empresa-b.com` — vazamento de tenant crítico.

**Técnica:** Compound Unique Key + Query de duas etapas.

```typescript
// Antes — vulnerável: encontra o usuário em qualquer empresa
const user = await prisma.user.findUnique({ where: { email } });

// Depois — seguro: busca por email + companyId juntos
const company = await prisma.company.findUnique({ where: { domain: companyDomain } });
const user = await prisma.user.findUnique({
    where: { email_companyId: { email, companyId: company.id } }
});
```

**Arquivos:** `auth.service.ts`, `login.dto.ts` (campo `companyDomain` obrigatório), `schema.prisma` (`@@unique([email, companyId])`)

---

### 2. Refresh token sem revogação (token eterno)

**Problema:** Refresh tokens nunca eram invalidados. Um token vazado permanecia válido para sempre — impossível fazer logout real.

**Técnica:** Token Hashing + Single-Use via banco de dados.

```typescript
// Hash bcrypt do token salvo no banco (nunca o token bruto)
const hash = await bcrypt.hash(refreshToken, rounds);
await prisma.user.update({ where: { id }, data: { refreshTokenHash: hash } });

// Validação: compara token recebido com o hash armazenado
const isValid = await bcrypt.compare(token, user.refreshTokenHash);

// Logout: seta null → qualquer token existente é invalidado
await prisma.user.update({ where: { id }, data: { refreshTokenHash: null } });
```

**Arquivos:** `token.service.ts`, `schema.prisma` (campo `refreshTokenHash`), `auth.controller.ts` (endpoint `POST /logout`)

---

### 3. Ausência de rate limiting

**Problema:** Endpoints de autenticação sem limite de requisições — vulneráveis a brute force e credential stuffing.

**Técnica:** Token Bucket via `@nestjs/throttler` com limites por endpoint.

| Endpoint | Limite |
|----------|--------|
| `POST /auth/register` | 5 req / 60s |
| `POST /auth/login` | 10 req / 60s |
| Global | 100 req / 60s |

**Arquivos:** `app.module.ts` (`ThrottlerModule.forRoot`), `auth.controller.ts` (`@Throttle`)

---

### 4. Bcrypt rounds hardcoded

**Problema:** `bcrypt.hash(password, 10)` com rounds fixos — impossível ajustar custo sem redeployar.

**Técnica:** Externalização via variável de ambiente.

```env
BCRYPT_ROUNDS=12  # produção: 12-14 | testes: 4 (velocidade)
```

**Arquivos:** `.env`, `.env.example`, `auth.service.ts` (`configService.get('BCRYPT_ROUNDS', 12)`)

---

## Fase 2 — Arquitetura e Desacoplamento

### 5. Acoplamento direto entre módulos

**Problema:** `MoodLogsService` importava `GamificationService` diretamente — dependência circular latente e impossibilidade de trocar a implementação sem afetar o chamador.

**Técnica:** Event-Driven Architecture com `@nestjs/event-emitter`.

```typescript
// Antes — acoplamento direto
constructor(private readonly gamificationService: GamificationService) {}
await this.gamificationService.awardXP(userId, 5);

// Depois — desacoplado via evento de domínio
this.eventEmitter.emit('mood-log.created', new MoodLogCreatedEvent(userId, moodLogId, 5));

// GamificationService escuta sem saber a origem
@OnEvent('mood-log.created')
async handleMoodLogCreated(event: MoodLogCreatedEvent) { ... }
```

**Arquivos:** `mood-logs.service.ts`, `challenges.service.ts`, `gamification.service.ts`, `src/common/events/`

---

### 6. Services dependendo de implementações concretas (violação DIP)

**Problema:** Services importavam `PrismaService` diretamente — impossível mockar em testes sem banco real.

**Técnica:** Repository Pattern + Dependency Inversion Principle.

```typescript
// Interface (abstração)
export interface IUserRepository {
    findById(id: string): Promise<User | null>;
    addXP(id: string, xp: number): Promise<User>;
}

// Módulo injeta a implementação via token
{ provide: USER_REPOSITORY, useClass: UserRepository }

// Service recebe a abstração
constructor(@Inject(USER_REPOSITORY) private readonly repo: IUserRepository) {}
```

**Arquivos:** `repositories/*.interface.ts`, `repositories/*.repository.ts`, `*.module.ts`

---

### 7. AuthService com múltiplas responsabilidades (violação SRP)

**Problema:** `AuthService` gerenciava login, registro, geração de JWT, hash de tokens e refresh — 5 responsabilidades em uma classe.

**Técnica:** Extração de `TokenService` (Single Responsibility Principle).

| Classe | Responsabilidade |
|--------|-----------------|
| `AuthService` | Autenticação (login/register/logout/refresh) |
| `TokenService` | Tokens JWT (gerar, verificar, hash, revogar) |

**Arquivo:** `src/modules/auth/token.service.ts`

---

### 8. Magic strings espalhadas pelo código

**Problema:** `user.role === 'EMPLOYEE'` em múltiplos arquivos — typo silencioso, sem autocomplete.

**Técnica:** TypeScript Enums como fonte única de verdade.

```typescript
// Antes
if (user.role === 'EMPLOYEE') { ... }
badge.name = 'FIRST_STEP';

// Depois
if (user.role === Role.EMPLOYEE) { ... }
badge.name = BadgeType.FIRST_STEP;
```

**Arquivos:** `src/common/enums/role.enum.ts`, `src/common/enums/badge-type.enum.ts`

---

## Fase 3 — Performance e Escalabilidade

### 9. AnalyticsService com agregação in-memory

**Problema:** `findMany()` carregava **todos os MoodLogs da empresa** em memória para calcular média e distribuição — O(n) no Node.js com potencial de OOM em escala.

**Técnica:** SQL Aggregation via `$queryRaw` (operação empurrada para o banco).

```typescript
// Antes — O(n): todos os dados em memória
const logs = await prisma.moodLog.findMany({ where });
const avg = logs.reduce((sum, l) => sum + l.mood, 0) / logs.length;

// Depois — O(log n): banco faz o trabalho
const [row] = await prisma.$queryRaw`
    SELECT AVG(ml.mood)::float, COUNT(ml.id)
    FROM mood_logs ml JOIN users u ON u.id = ml.user_id
    WHERE u.company_id = ${companyId}
`;
```

**Arquivo:** `analytics.service.ts`

---

### 10. Cache ausente em consultas analíticas

**Problema:** Cada requisição ao endpoint de analytics executava 3 queries pesadas — sem aproveitar resultados recentes idênticos.

**Técnica:** Cache-Aside Pattern com Redis + TTL + invalidação por pattern.

```typescript
// 1. Cache hit → retorna em ~1ms
const cached = await redisService.get<MoodSummaryResult>(cacheKey);
if (cached) return cached;

// 2. Cache miss → executa queries e armazena
const result = await computeFromDB();
await redisService.set(cacheKey, result, 300); // TTL 5 minutos

// 3. Invalidação: novo MoodLog → limpa caches da empresa
await redisService.delByPattern(`analytics:mood:${companyId}:*`);
```

**Arquivos:** `src/common/cache/redis.service.ts`, `src/common/cache/cache.module.ts`, `analytics.service.ts`

---

### 11. Banco SQLite em produção

**Problema:** SQLite não suporta concorrência real, carece de tipos nativos (UUID, arrays) e não escala horizontalmente.

**Técnica:** Migração para PostgreSQL com mapeamentos explícitos de colunas.

```prisma
// Antes
datasource db { provider = "sqlite"; url = env("DATABASE_URL") }

// Depois
datasource db { provider = "postgresql"; url = env("DATABASE_URL") }

model MoodLog {
    id       String   @id @default(uuid())
    userId   String   @map("user_id")   // snake_case no banco
    loggedAt DateTime @map("logged_at")
    @@map("mood_logs")                  // nome da tabela explícito
}
```

**Arquivos:** `prisma/schema.prisma`, `.env` (connection string PostgreSQL), `docker-compose.yml` (já incluía Postgres + Redis)

---

## Fase 4 — Testabilidade

### 12–14. Zero cobertura de testes unitários

**Problema:** Sem testes, qualquer refatoração era um risco — não havia como verificar regressões automaticamente.

**Técnica:** AAA (Arrange-Act-Assert) + Mocking via interfaces (DIP).

```typescript
// Mock da interface (não da classe concreta)
const userRepoMock: Partial<IUserRepository> = {
    addXP: jest.fn().mockResolvedValue({ xp: 55 }),
};

// Nenhum banco ou Redis necessário
const module = await Test.createTestingModule({
    providers: [GamificationService, { provide: USER_REPOSITORY, useValue: userRepoMock }],
}).compile();
```

**Cobertura dos specs:**

| Suite | Testes | Cenários cobertos |
|-------|--------|-------------------|
| `auth.service.spec.ts` | 8 | Login OK, tenant isolation, senha errada, register, logout, replay attack |
| `mood-logs.service.spec.ts` | 9 | Criar/update log, tags, eventos, limit cap, ISO dates, cursor |
| `gamification.service.spec.ts` | 8 | XP via evento, FIRST_STEP, idempotência de badge, WELLNESS_MASTER, registry OCP |

**Arquivo:** `test/unit/`

---

### 16. `new Date()` não mockável

**Problema:** Código que chama `new Date()` diretamente é impossível de testar deterministicamente.

**Técnica:** Service de abstração de tempo.

```typescript
@Injectable()
export class DateService {
    now(): Date { return new Date(); }
    today(): Date { const d = new Date(); d.setHours(0, 0, 0, 0); return d; }
}

// No teste: jest.spyOn(dateService, 'now').mockReturnValue(fixedDate)
```

**Arquivo:** `src/common/services/date.service.ts`

---

## Fase 5 — Clean Code e Manutenibilidade

### 17. `user: any` em todos os controllers

**Problema:** Parâmetro `@CurrentUser() user: any` sem tipagem — erros de acesso a campos inexistentes não eram detectados em compile time.

**Técnica:** Interface tipada `AuthenticatedUser`.

```typescript
export interface AuthenticatedUser {
    id: string; email: string; role: string; companyId: string;
}

// Antes: @CurrentUser() user: any
// Depois:
async getHistory(@CurrentUser() user: AuthenticatedUser) { ... }
```

**Arquivo:** `src/common/interfaces/authenticated-user.interface.ts`

---

### 19. Lógica de tags duplicada

**Problema:** `tags.map(t => t.toLowerCase().trim()).join(',')` e `tagsString.split(',').filter(Boolean)` duplicadas em múltiplos services.

**Técnica:** Funções puras centralizadas (DRY).

```typescript
export function tagsToString(tags: string[] | null): string {
    return tags?.map(t => t.toLowerCase().trim()).join(',') ?? '';
}
export function stringToTags(s: string | null): string[] {
    return s?.split(',').filter(Boolean) ?? [];
}
```

**Arquivo:** `src/common/utils/tags.utils.ts`

---

### 20. Logging em texto livre

**Problema:** `this.logger.log(`${method} ${url} ${status}`)` — não parseável por ferramentas de observabilidade (Datadog, ELK, CloudWatch).

**Técnica:** Structured Logging em JSON.

```typescript
this.logger.log(JSON.stringify({
    method, url, statusCode: response.statusCode,
    duration: `${Date.now() - start}ms`, ip, userAgent,
}));
```

**Arquivo:** `src/common/interceptors/logging.interceptor.ts`

---

### 22. Pagination por OFFSET (page drift)

**Problema:** `findMany({ skip: (page-1)*limit, take: limit })` sofre **page drift** — novos registros inseridos durante a navegação deslocam as páginas, causando duplicatas ou itens perdidos.

**Técnica:** Cursor-Based Pagination (Keyset Pagination).

```typescript
// Cursor = base64(JSON({ loggedAt, id })) — opaco para o cliente
// Query usa índice composto (loggedAt, id) — O(log n)
WHERE (loggedAt < cursorDate) OR (loggedAt = cursorDate AND id < cursorId)
ORDER BY loggedAt DESC, id DESC
LIMIT take
```

**Arquivos:** `mood-logs.service.ts` (lógica de cursor), `mood-log.repository.ts` (`findHistoryWithCursor`), `mood-log.repository.interface.ts`

---

## Resumo de Impacto

| Dimensão | Antes | Depois |
|----------|-------|--------|
| **Segurança** | Login cross-tenant, tokens eternos, sem rate limit | Tenant isolation, hash + revogação, throttle por endpoint |
| **Arquitetura** | Acoplamento direto, SRP violado, magic strings | EventEmitter, Repository Pattern, enums, TokenService |
| **Performance** | Agregação O(n) em memória, SQLite, sem cache | SQL aggregation, PostgreSQL, Redis TTL 5min |
| **Testabilidade** | 0 testes unitários | 25 testes, mocks via interfaces, DateService |
| **Manutenibilidade** | `any` em todo lugar, código duplicado, OFFSET pagination | AuthenticatedUser, tag helpers, cursor pagination, JSON logs |
