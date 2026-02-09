# Architecture - LifeSync Platform

## 1. Visão Geral do Sistema

### 1.1 Tipo de Aplicação

**Modular Monolith com preparação para Microsserviços**

O LifeSync é implementado como um **monolito modular em camadas** com clara separação de responsabilidades, permitindo evolução futura para arquitetura de microsserviços sem reescrita completa.

**Características**:
- Single deployment unit (simplifica operações iniciais)
- Módulos bem definidos e desacoplados
- Comunicação via interfaces bem estabelecidas
- Preparado para extração de serviços independentes

### 1.2 Estrutura em Camadas

```
┌─────────────────────────────────────────────────────────────┐
│                    PRESENTATION LAYER                        │
│  ┌──────────────────┐         ┌──────────────────┐          │
│  │  Mobile (Flutter) │         │  Web (Next.js)   │          │
│  │  - Employee App   │         │  - HR Dashboard  │          │
│  └──────────────────┘         └──────────────────┘          │
└─────────────────────────────────────────────────────────────┘
                              ↓ HTTPS/REST
┌─────────────────────────────────────────────────────────────┐
│                    API GATEWAY LAYER                         │
│  - Load Balancer                                             │
│  - Rate Limiting                                             │
│  - Request Routing                                           │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│                    SERVICE LAYER (Backend)                   │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐       │
│  │   Auth   │ │  Users   │ │ Mood Logs│ │Challenges│       │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘       │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐                    │
│  │Analytics │ │Gamification│ │Notifications│                │
│  └──────────┘ └──────────┘ └──────────┘                    │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│                      DATA LAYER                              │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │  PostgreSQL  │  │    Redis     │  │  Amazon S3   │      │
│  │  (Prisma ORM)│  │   (Cache)    │  │  (Storage)   │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│                  EXTERNAL SERVICES LAYER                     │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │ Google OAuth │  │  Azure AD    │  │Push/Email Svc│      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
└─────────────────────────────────────────────────────────────┘
```

### 1.3 Dependências entre Camadas

**Regra de Ouro**: Dependências fluem APENAS de cima para baixo

```
Presentation → API Gateway → Service → Data
                                  ↓
                          External Services
```

**Proibições**:
- ❌ Data Layer não pode chamar Service Layer
- ❌ Service Layer não pode conhecer Presentation Layer
- ❌ Camadas não podem pular níveis (Presentation → Data diretamente)

---

## 2. Diagrama Lógico (Descrição Textual)

### 2.1 Componentes Principais

#### **Auth Module**
**Responsabilidades**:
- Registro de novos usuários
- Login via email/password ou SSO (Google/Azure AD)
- Geração e validação de JWT tokens
- Refresh token mechanism
- Password reset flow

**Dependências**:
- `UsersModule` (para criar/buscar usuários)
- `SSO Providers` (Google OAuth, Azure AD)
- `JWT Library` (token generation)

#### **Users Module**
**Responsabilidades**:
- CRUD de usuários
- Gerenciamento de perfis
- Atualização de XP e níveis
- Listagem de usuários por empresa (multi-tenancy)

**Dependências**:
- `PrismaService` (database access)
- `GamificationModule` (para cálculo de XP/níveis)

#### **Mood Logs Module**
**Responsabilidades**:
- Registro diário de humor (escala 1-5)
- Adição de tags/contexto ao humor
- Histórico de mood logs por usuário
- Agregação de dados para analytics

**Dependências**:
- `UsersModule` (validar usuário)
- `GamificationModule` (recompensar XP por check-in)

#### **Challenges Module**
**Responsabilidades**:
- Criação de desafios (admin/manager)
- Listagem de desafios do dia
- Completar desafios
- Tracking de progresso

**Dependências**:
- `UsersModule` (validar usuário)
- `GamificationModule` (recompensar XP)

#### **Analytics Module**
**Responsabilidades**:
- Dashboard de humor agregado (por departamento/período)
- Métricas de engajamento
- Exportação de relatórios
- **Acesso restrito**: apenas MANAGER e ADMIN

**Dependências**:
- `MoodLogsModule` (dados de humor)
- `UsersModule` (dados de usuários)
- `ChallengesModule` (dados de desafios)

#### **Gamification Module**
**Responsabilidades**:
- Cálculo de XP
- Sistema de níveis (XP / 100 = Level)
- Gerenciamento de badges
- Leaderboard/ranking

**Dependências**:
- `UsersModule` (atualizar XP do usuário)

#### **Notifications Module**
**Responsabilidades**:
- Envio de push notifications (mobile)
- Envio de emails
- Notificações de desafios novos
- Lembretes de check-in

**Dependências**:
- External Push Service (Firebase/OneSignal)
- External Email Service (SendGrid/SES)

### 2.2 Comunicação entre Módulos

**Padrão**: Injeção de Dependências (DI) via NestJS

```typescript
// Exemplo: ChallengesService depende de UsersService e GamificationService
@Injectable()
export class ChallengesService {
  constructor(
    private readonly usersService: UsersService,
    private readonly gamificationService: GamificationService,
    private readonly prisma: PrismaService,
  ) {}

  async completeChallenge(userId: string, challengeId: string) {
    // 1. Validar usuário
    const user = await this.usersService.findById(userId);
    
    // 2. Marcar desafio como completo
    await this.prisma.userChallenge.update({...});
    
    // 3. Recompensar XP
    await this.gamificationService.addXP(userId, challenge.xpReward);
  }
}
```

**Comunicação Assíncrona** (Inferência baseada em escalabilidade futura):
- Eventos de domínio para operações não-críticas
- Exemplo: `ChallengeCompletedEvent` → trigger notificação

---

## 3. Fluxos Principais

### 3.1 Fluxo de Autenticação (SSO)

```
[Mobile App] → POST /auth/login/google { idToken }
                    ↓
[Auth Controller] → AuthService.loginWithGoogle(idToken)
                    ↓
[Auth Service] → Valida token com Google OAuth API
                    ↓
                 Busca ou cria usuário no DB
                    ↓
                 Gera JWT com payload { userId, email, role, companyId }
                    ↓
[Response] ← { accessToken, refreshToken, user }
                    ↓
[Mobile App] → Armazena token em SecureStorage
                    ↓
               Redireciona para Dashboard
```

### 3.2 Fluxo Principal do Usuário (Daily Journey)

```
[Mobile App] → Abre aplicativo
                    ↓
               Valida JWT (JwtAuthGuard)
                    ↓
[Dashboard] ← GET /users/me (dados do usuário)
            ← GET /challenges/daily (desafios do dia)
            ← GET /mood-logs/history?limit=7 (últimos 7 dias)
                    ↓
[User] → Registra humor do dia
                    ↓
       → POST /mood-logs { mood: 4, tags: ['productive'] }
                    ↓
[Mood Logs Service] → Salva no DB
                    ↓
                    → Chama GamificationService.addXP(userId, 5)
                    ↓
[Response] ← { moodLog, xpEarned: 5, newLevel: 3 }
                    ↓
[User] → Completa desafio "Beber 2L de água"
                    ↓
       → POST /challenges/:id/complete
                    ↓
[Challenges Service] → Marca como completo
                    ↓
                    → Chama GamificationService.addXP(userId, 10)
                    ↓
[Response] ← { challenge, xpEarned: 10, totalXP: 265 }
```

### 3.3 Fluxo de Analytics (HR Dashboard)

```
[Web Dashboard] → Login como MANAGER
                    ↓
                  JWT com role: MANAGER
                    ↓
[Analytics Page] → GET /analytics/mood-summary?startDate=2026-01-01&endDate=2026-01-31
                    ↓
[RolesGuard] → Valida role (apenas MANAGER/ADMIN)
                    ↓
[Analytics Service] → Agrega mood logs por departamento
                    ↓
                    → Anonimiza dados (remove identificação individual)
                    ↓
                    → Calcula médias e tendências
                    ↓
[Response] ← {
  averageMood: 3.8,
  totalCheckins: 450,
  moodDistribution: { 1: 5%, 2: 10%, 3: 25%, 4: 40%, 5: 20% },
  trendByDepartment: [...]
}
```

---

## 4. Modelagem de Domínio

### 4.1 Entidades Principais

#### **Company** (Agregado Raiz para Multi-Tenancy)
```typescript
entity Company {
  id: UUID
  name: String
  domain: String (ex: "acme.com")
  createdAt: DateTime
  
  // Relações
  users: User[]
  challenges: Challenge[]
}
```

**Invariantes**:
- Domain deve ser único
- Não pode ser deletada se tiver usuários ativos

#### **User**
```typescript
entity User {
  id: UUID
  companyId: UUID (FK → Company)
  name: String
  email: String (unique per company)
  passwordHash: String (nullable se SSO)
  role: Role (EMPLOYEE | MANAGER | ADMIN)
  xp: Integer (default: 0)
  level: Integer (default: 1)
  createdAt: DateTime
  
  // Relações
  company: Company
  moodLogs: MoodLog[]
  userChallenges: UserChallenge[]
  badges: Badge[]
}
```

**Invariantes**:
- Email único por empresa
- XP >= 0
- Level = floor(XP / 100) + 1

#### **MoodLog** (Value Object com identidade)
```typescript
entity MoodLog {
  id: UUID
  userId: UUID (FK → User)
  mood: Integer (1-5)
  tags: String[] (ex: ["productive", "stressed"])
  note: String (optional)
  loggedAt: DateTime
  
  // Relações
  user: User
}
```

**Invariantes**:
- Mood entre 1 e 5
- Um usuário só pode ter 1 mood log por dia (inferência baseada em "daily check-in")

#### **Challenge**
```typescript
entity Challenge {
  id: UUID
  companyId: UUID (FK → Company) (nullable se global)
  title: String
  description: String
  category: Category (PHYSICAL | MENTAL | SOCIAL | NUTRITION)
  xpReward: Integer
  isGlobal: Boolean (desafios criados pela plataforma)
  createdAt: DateTime
  
  // Relações
  company: Company
  userChallenges: UserChallenge[]
}
```

**Invariantes**:
- xpReward > 0
- Se isGlobal = true, companyId deve ser null

#### **UserChallenge** (Entidade de Relacionamento)
```typescript
entity UserChallenge {
  id: UUID
  userId: UUID (FK → User)
  challengeId: UUID (FK → Challenge)
  completedAt: DateTime (nullable)
  
  // Relações
  user: User
  challenge: Challenge
}
```

**Invariantes**:
- Um usuário não pode completar o mesmo desafio mais de uma vez por dia (inferência)

#### **Badge**
```typescript
entity Badge {
  id: UUID
  userId: UUID (FK → User)
  name: String
  description: String
  iconUrl: String
  earnedAt: DateTime
  
  // Relações
  user: User
}
```

### 4.2 Agregados

**Company Aggregate**
- **Raiz**: Company
- **Entidades**: User, Challenge (company-specific)
- **Regra**: Todas as operações em usuários/desafios devem passar pela validação de tenant

**User Aggregate**
- **Raiz**: User
- **Entidades**: MoodLog, UserChallenge, Badge
- **Regra**: XP e Level são calculados automaticamente ao adicionar XP

### 4.3 Value Objects

**Role** (Enum)
```typescript
enum Role {
  EMPLOYEE,
  MANAGER,
  ADMIN
}
```

**Category** (Enum)
```typescript
enum Category {
  PHYSICAL,    // Exercício, movimento
  MENTAL,      // Meditação, mindfulness
  SOCIAL,      // Interação com colegas
  NUTRITION    // Hidratação, alimentação
}
```

**MoodScale** (Value Object)
```typescript
class MoodScale {
  value: 1 | 2 | 3 | 4 | 5;
  
  getLabel(): string {
    // 1: Muito Ruim, 2: Ruim, 3: Neutro, 4: Bom, 5: Muito Bom
  }
}
```

### 4.4 Eventos de Domínio (Inferência para escalabilidade futura)

```typescript
// Eventos que podem ser emitidos
UserRegisteredEvent {
  userId: UUID
  companyId: UUID
  email: String
}

MoodLoggedEvent {
  userId: UUID
  mood: Integer
  xpEarned: Integer
}

ChallengeCompletedEvent {
  userId: UUID
  challengeId: UUID
  xpEarned: Integer
}

LevelUpEvent {
  userId: UUID
  oldLevel: Integer
  newLevel: Integer
}

BadgeEarnedEvent {
  userId: UUID
  badgeId: UUID
}
```

**Uso**:
- Notificações assíncronas
- Auditoria
- Analytics em tempo real
- Integração com sistemas externos

---

## 5. Pontos de Extensão Futura

### 5.1 Escalabilidade

**Horizontal Scaling**

Componentes preparados para escalar horizontalmente:
- **API Gateway**: Load balancer distribui requisições
- **Backend Services**: Stateless, podem ter múltiplas instâncias
- **Database**: PostgreSQL com read replicas
- **Cache**: Redis cluster

**Vertical Scaling**

- Aumentar recursos de instâncias individuais
- Otimização de queries (índices, materialized views)

### 5.2 Modularização

**Preparação para Microsserviços**

Módulos que podem ser extraídos como serviços independentes:

1. **Auth Service**
   - Já isolado
   - Comunicação via JWT stateless
   - Pode ser extraído primeiro

2. **Analytics Service**
   - Leitura intensiva
   - Pode ter seu próprio read-only DB replica
   - Processamento assíncrono de agregações

3. **Notifications Service**
   - Já comunica com serviços externos
   - Pode ser extraído facilmente
   - Event-driven architecture

4. **Gamification Service**
   - Lógica de negócio isolada
   - Pode ter seu próprio cache de leaderboards

**Estratégia de Migração**:
```
Monolith → Strangler Fig Pattern
         → Extrair serviços um por um
         → Manter compatibilidade via API Gateway
```

### 5.3 Possível Migração para Microsserviços

**Fase 1: Preparação (Atual)**
- ✅ Módulos bem definidos
- ✅ Comunicação via interfaces
- ✅ Database isolado por módulo (schema separation)

**Fase 2: Extração de Serviços Não-Críticos**
- Extrair Notifications Service
- Extrair Analytics Service (read-only)
- Manter monolith para core business logic

**Fase 3: Extração de Serviços Críticos**
- Extrair Auth Service
- Extrair Gamification Service
- Implementar Event Bus (Kafka/RabbitMQ)

**Fase 4: Decomposição Completa**
- Cada módulo vira um microsserviço
- API Gateway orquestra chamadas
- Database per service

**Trade-offs**:
- ✅ Escalabilidade independente
- ✅ Deploy independente
- ✅ Tecnologias heterogêneas
- ❌ Complexidade operacional
- ❌ Distributed transactions
- ❌ Debugging mais difícil

---

## Decisões Arquiteturais Chave

### 1. Por que Modular Monolith?

**Racional**:
- Simplicidade operacional no MVP
- Facilita debugging e desenvolvimento
- Permite evolução gradual
- Reduz custos iniciais de infraestrutura

### 2. Por que Multi-Tenancy Lógico?

**Racional**:
- Reduz custos (um DB para todos os clientes)
- Simplifica manutenção
- Facilita analytics cross-tenant (benchmarks)
- Isolamento via `companyId` é suficiente para B2B2C

**Alternativa considerada**: Multi-tenancy físico (DB por cliente)
- Descartado por complexidade e custo

### 3. Por que REST em vez de GraphQL?

**Racional**:
- Simplicidade
- Caching HTTP nativo
- Ferramentas maduras
- Equipe familiarizada

**Quando considerar GraphQL**:
- Se frontend precisar de queries muito flexíveis
- Se over-fetching/under-fetching se tornar problema

### 4. Por que PostgreSQL em vez de NoSQL?

**Racional**:
- Dados relacionais (User → MoodLog → Challenge)
- ACID transactions (importante para XP/Level)
- Queries complexas para analytics
- Maturidade e ferramentas

**Quando considerar NoSQL**:
- Se escala de escrita for > 10k writes/s
- Se schema mudar constantemente

---

## Conclusão

A arquitetura do LifeSync foi desenhada para:
1. **Simplicidade inicial**: Monolith facilita MVP
2. **Evolução gradual**: Preparado para microsserviços
3. **Escalabilidade**: Horizontal scaling em todas as camadas
4. **Manutenibilidade**: Módulos bem definidos e desacoplados
5. **Segurança**: Multi-tenancy, RBAC, JWT

Esta arquitetura suporta o crescimento do produto de 10 a 10.000 empresas sem reescrita completa.
