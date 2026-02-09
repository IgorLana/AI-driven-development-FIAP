# Standards - LifeSync Platform

## 1. Princípios Arquiteturais

### 1.1 Padrão Arquitetural Adotado

**Layered Architecture (Arquitetura em Camadas)**

O LifeSync adota uma arquitetura em camadas estrita com separação clara de responsabilidades:

- **Presentation Layer**: Interfaces de usuário (Mobile Flutter + Web React/Next.js)
- **API Gateway Layer**: Ponto de entrada unificado, load balancing e roteamento
- **Service Layer**: Lógica de negócio (NestJS/FastAPI)
- **Data Layer**: Persistência (PostgreSQL), Cache (Redis), Storage (S3)
- **Integration Layer**: Serviços externos (SSO, Notificações)

**Racional Técnico**: 
- Permite escalabilidade horizontal independente de cada camada
- Facilita manutenção e evolução do sistema
- Possibilita migração futura para microsserviços sem reescrever toda a aplicação
- Reduz acoplamento entre componentes

### 1.2 Princípios de Design

**SOLID**
- **Single Responsibility**: Cada módulo/serviço tem uma única responsabilidade bem definida
- **Open/Closed**: Extensível via plugins/providers sem modificar código core
- **Liskov Substitution**: Interfaces bem definidas para substituição de implementações (ex: diferentes providers de SSO)
- **Interface Segregation**: APIs específicas por role (Employee, Manager, Admin)
- **Dependency Inversion**: Dependências injetadas via DI do NestJS

**DRY (Don't Repeat Yourself)**
- Lógica de negócio centralizada em services
- Validações reutilizáveis via DTOs
- Queries complexas encapsuladas em repositories

**KISS (Keep It Simple, Stupid)**
- REST puro sem over-engineering
- Estrutura de pastas intuitiva
- Nomenclatura clara e descritiva

### 1.3 Convenções Estruturais

**Multi-Tenancy Pattern**
- Isolamento lógico de dados por `companyId`
- Todas as queries filtradas por tenant
- Middleware de tenant resolution baseado no JWT

**Provider Pattern**
- Abstração de serviços externos (SSO, Storage, Notifications)
- Permite troca de implementação sem impactar business logic
- Configuração via environment variables

---

## 2. Convenções de Código

### 2.1 Naming Conventions

**Backend (TypeScript/NestJS)**

```
Modules:       auth.module.ts, users.module.ts
Controllers:   auth.controller.ts, users.controller.ts
Services:      auth.service.ts, users.service.ts
Entities:      user.entity.ts, mood-log.entity.ts
DTOs:          create-user.dto.ts, login.dto.ts
Interfaces:    user.interface.ts, jwt-payload.interface.ts
Guards:        jwt-auth.guard.ts, roles.guard.ts
Decorators:    @Roles(), @CurrentUser()
```

**Padrões**:
- PascalCase para classes: `UserService`, `AuthController`
- camelCase para métodos e variáveis: `getUserById()`, `currentUser`
- kebab-case para arquivos: `user-challenge.entity.ts`
- SCREAMING_SNAKE_CASE para constantes: `MAX_LOGIN_ATTEMPTS`

**Frontend (TypeScript/React)**

```
Components:    UserProfile.tsx, ChallengeCard.tsx
Hooks:         useAuth.ts, useMoodLog.ts
Services:      api.service.ts, auth.service.ts
Types:         user.types.ts, challenge.types.ts
Utils:         date.utils.ts, validation.utils.ts
```

### 2.2 Estrutura de Pastas

**Backend (NestJS)**

```
src/
├── modules/
│   ├── auth/
│   │   ├── auth.controller.ts
│   │   ├── auth.service.ts
│   │   ├── auth.module.ts
│   │   ├── dto/
│   │   ├── guards/
│   │   └── strategies/
│   ├── users/
│   ├── mood-logs/
│   ├── challenges/
│   └── analytics/
├── common/
│   ├── decorators/
│   ├── filters/
│   ├── guards/
│   ├── interceptors/
│   └── pipes/
├── config/
├── database/
│   ├── migrations/
│   └── seeds/
└── main.ts
```

**Frontend (React/Next.js)**

```
src/
├── app/              # Next.js App Router
│   ├── (auth)/
│   ├── dashboard/
│   └── layout.tsx
├── components/
│   ├── ui/           # Componentes reutilizáveis
│   └── features/     # Componentes de negócio
├── lib/
│   ├── api/          # API clients
│   ├── hooks/        # Custom hooks
│   └── utils/        # Utilities
├── types/
└── styles/
```

### 2.3 Organização de Módulos

**Princípio**: Cada módulo é auto-contido e exporta apenas o necessário

```typescript
// Estrutura padrão de um módulo
module-name/
├── module-name.module.ts      // Declaração do módulo
├── module-name.controller.ts  // Endpoints REST
├── module-name.service.ts     // Business logic
├── dto/
│   ├── create-module.dto.ts
│   └── update-module.dto.ts
├── entities/
│   └── module-name.entity.ts
└── interfaces/
    └── module-name.interface.ts
```

### 2.4 Padronização de DTOs, Services, Repositories

**DTOs (Data Transfer Objects)**

```typescript
// Validação obrigatória com class-validator
import { IsString, IsEmail, MinLength } from 'class-validator';

export class CreateUserDto {
  @IsString()
  @MinLength(3)
  name: string;

  @IsEmail()
  email: string;

  @IsString()
  @MinLength(8)
  password: string;
}
```

**Services**

```typescript
// Injeção de dependências via constructor
@Injectable()
export class UserService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly logger: LoggerService,
  ) {}

  async findById(id: string): Promise<User> {
    // Sempre incluir tenant filtering
    // Sempre fazer error handling
    // Sempre logar operações críticas
  }
}
```

**Repositories (via Prisma)**

```typescript
// Encapsular queries complexas
async findUserWithChallenges(userId: string, companyId: string) {
  return this.prisma.user.findUnique({
    where: { id: userId, companyId },
    include: {
      userChallenges: {
        include: { challenge: true }
      }
    }
  });
}
```

---

## 3. Guidelines de API

### 3.1 Padrão de Rotas

**REST Principles**

```
GET    /api/v1/users              # Lista usuários
GET    /api/v1/users/:id          # Busca usuário específico
POST   /api/v1/users              # Cria usuário
PATCH  /api/v1/users/:id          # Atualiza parcialmente
DELETE /api/v1/users/:id          # Remove usuário

# Sub-recursos
GET    /api/v1/users/:id/mood-logs
POST   /api/v1/users/:id/mood-logs
```

**Convenções**:
- Plural para coleções: `/users`, `/challenges`
- Kebab-case para URLs: `/mood-logs`, `/user-challenges`
- Query params para filtros: `/users?role=EMPLOYEE&department=TI`
- Paginação: `/users?page=1&limit=20`

### 3.2 Versionamento

**URL-based versioning**: `/api/v1/`, `/api/v2/`

**Racional**:
- Simples e explícito
- Facilita cache e debugging
- Permite convivência de múltiplas versões

### 3.3 Tratamento de Erros

**Estrutura Padronizada**

```typescript
{
  "statusCode": 400,
  "message": "Validation failed",
  "errors": [
    {
      "field": "email",
      "message": "Invalid email format"
    }
  ],
  "timestamp": "2026-02-07T20:30:00Z",
  "path": "/api/v1/users"
}
```

**HTTP Status Codes**:
- `200 OK`: Sucesso
- `201 Created`: Recurso criado
- `400 Bad Request`: Validação falhou
- `401 Unauthorized`: Não autenticado
- `403 Forbidden`: Sem permissão (RBAC)
- `404 Not Found`: Recurso não existe
- `409 Conflict`: Conflito de estado (ex: email duplicado)
- `500 Internal Server Error`: Erro não tratado

### 3.4 Padronização de Responses

**Success Response**

```typescript
{
  "data": { /* payload */ },
  "meta": {
    "page": 1,
    "limit": 20,
    "total": 150
  }
}
```

**List Response**

```typescript
{
  "data": [/* items */],
  "meta": {
    "page": 1,
    "limit": 20,
    "total": 150,
    "totalPages": 8
  }
}
```

---

## 4. Guidelines de Segurança

### 4.1 Autenticação

**JWT (JSON Web Tokens)**

```typescript
// Payload structure
interface JwtPayload {
  sub: string;        // userId
  email: string;
  role: Role;
  companyId: string;  // Multi-tenancy
  iat: number;
  exp: number;
}
```

**Regras**:
- Token expiration: 7 dias (configurável)
- Refresh token: 30 dias
- Armazenamento: httpOnly cookies (web) ou secure storage (mobile)
- Rotação de tokens em refresh

**SSO Integration**

- Suporte a Google OAuth 2.0
- Suporte a Azure AD (SAML/OAuth)
- Fallback para email/password

### 4.2 Autorização (RBAC)

**Roles Hierarchy**

```
ADMIN > MANAGER > EMPLOYEE
```

**Guards Implementation**

```typescript
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.MANAGER, Role.ADMIN)
@Get('analytics/mood-summary')
async getMoodSummary() {
  // Apenas MANAGER e ADMIN podem acessar
}
```

**Tenant Isolation**

```typescript
// Middleware automático que injeta companyId em todas as queries
@Injectable()
export class TenantMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction) {
    req.companyId = req.user.companyId;
    next();
  }
}
```

### 4.3 Criptografia

**Passwords**

- Algoritmo: bcrypt
- Salt rounds: 10
- Nunca armazenar senhas em plain text
- Nunca retornar password hash em responses

**Data at Rest**

- Dados sensíveis de saúde/humor: agregados e anonimizados para HR
- PII (Personally Identifiable Information): criptografado no banco

**Data in Transit**

- HTTPS obrigatório em produção
- TLS 1.2+

### 4.4 Validação de Entrada

**Class-validator + Class-transformer**

```typescript
@Post('mood-logs')
async create(@Body() dto: CreateMoodLogDto) {
  // DTO já validado pelo ValidationPipe global
}
```

**Regras**:
- Validar TODOS os inputs
- Whitelist: remover propriedades não declaradas
- Transform: converter tipos automaticamente
- Sanitizar strings (trim, escape)

### 4.5 Sanitização

**SQL Injection Prevention**

- Usar Prisma ORM (prepared statements automáticos)
- NUNCA concatenar strings em queries

**XSS Prevention**

- Sanitizar HTML inputs
- Content-Security-Policy headers
- Escapar outputs no frontend

**CSRF Prevention**

- CSRF tokens para formulários web
- SameSite cookies

---

## 5. Observabilidade

### 5.1 Logs

**Estrutura de Log**

```typescript
{
  "timestamp": "2026-02-07T20:30:00Z",
  "level": "info",
  "context": "UserService",
  "message": "User created successfully",
  "userId": "uuid",
  "companyId": "uuid",
  "requestId": "uuid"
}
```

**Níveis**:
- `error`: Erros que impedem operação
- `warn`: Situações anormais mas recuperáveis
- `info`: Eventos importantes (login, criação de recursos)
- `debug`: Informações detalhadas para debugging
- `verbose`: Tudo (apenas dev)

**O que logar**:
- ✅ Autenticação (login, logout, falhas)
- ✅ Operações de escrita (create, update, delete)
- ✅ Erros e exceções
- ✅ Integrações externas (SSO, notificações)
- ❌ Senhas ou tokens
- ❌ PII sem necessidade

### 5.2 Monitoramento

**Métricas Essenciais**

- **Performance**: Response time, throughput
- **Disponibilidade**: Uptime, error rate
- **Recursos**: CPU, memória, conexões DB
- **Negócio**: Daily active users, mood logs por dia, challenges completados

**Health Checks**

```typescript
@Get('health')
async health() {
  return {
    status: 'ok',
    database: await this.checkDatabase(),
    redis: await this.checkRedis(),
    timestamp: new Date().toISOString()
  };
}
```

### 5.3 Métricas

**KPIs Técnicos**

- API response time (p50, p95, p99)
- Error rate (%)
- Database query time
- Cache hit rate

**KPIs de Negócio**

- Daily active users (DAU)
- Mood logs per day
- Challenge completion rate
- User engagement score

### 5.4 Auditoria

**Audit Trail**

Registrar TODAS as operações sensíveis:

```typescript
interface AuditLog {
  userId: string;
  action: 'CREATE' | 'UPDATE' | 'DELETE' | 'READ';
  resource: string;
  resourceId: string;
  changes?: object;
  timestamp: Date;
  ipAddress: string;
  userAgent: string;
}
```

**Casos de uso**:
- Compliance (LGPD/GDPR)
- Investigação de incidentes
- Análise de comportamento suspeito
- Rollback de operações

---

## Racional Geral

Estes padrões foram definidos para:

1. **Escalabilidade**: Arquitetura permite crescimento horizontal
2. **Manutenibilidade**: Código organizado e previsível
3. **Segurança**: Defense in depth com múltiplas camadas
4. **Observabilidade**: Visibilidade completa do sistema em produção
5. **Produtividade**: Convenções claras reduzem decisões triviais
6. **Qualidade**: Validações e testes garantem robustez

Todos os desenvolvedores devem seguir estes padrões rigorosamente. Exceções devem ser documentadas e aprovadas pela equipe técnica.
