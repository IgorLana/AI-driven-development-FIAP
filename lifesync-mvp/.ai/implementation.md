# Implementation Plan - LifeSync Platform

## 1. Project Bootstrap

### 1.1 Project Metadata

- **Project Name**: `lifesync-backend`
- **Project Type**: NestJS Monolithic API
- **Node Version**: `20.11.0`
- **Package Manager**: `npm` (v10.x)

### 1.2 Initial Creation Commands

Execute os comandos na ordem exata:

```bash
# Criar diretório raiz do projeto
mkdir lifesync-backend
cd lifesync-backend

# Inicializar projeto NestJS
npx @nestjs/cli@10.3.0 new . --package-manager npm --skip-git

# Instalar dependências core
npm install @nestjs/config@3.1.1
npm install @nestjs/jwt@10.2.0
npm install @nestjs/passport@10.0.3
npm install passport@0.7.0
npm install passport-jwt@4.0.1
npm install passport-google-oauth20@2.0.0
npm install bcrypt@5.1.1
npm install class-validator@0.14.1
npm install class-transformer@0.5.1

# Instalar Prisma
npm install prisma@6.10.0 --save-dev
npm install @prisma/client@6.10.0

# Instalar Redis
npm install ioredis@5.3.2

# Instalar utilities
npm install date-fns@3.3.1
npm install uuid@9.0.1

# Instalar dev dependencies
npm install @types/bcrypt@5.0.2 --save-dev
npm install @types/passport-jwt@4.0.1 --save-dev
npm install @types/passport-google-oauth20@2.0.14 --save-dev
npm install @types/uuid@9.0.8 --save-dev

# Instalar testing
npm install @faker-js/faker@8.4.0 --save-dev
npm install supertest@6.3.4 --save-dev
npm install @types/supertest@6.0.2 --save-dev

# Inicializar Prisma
npx prisma init
```

### 1.3 Estrutura Inicial de Diretórios

Criar a seguinte estrutura exata:

```
lifesync-backend/
├── src/
│   ├── modules/
│   │   ├── auth/
│   │   ├── users/
│   │   ├── mood-logs/
│   │   ├── challenges/
│   │   ├── analytics/
│   │   ├── gamification/
│   │   └── notifications/
│   ├── common/
│   │   ├── decorators/
│   │   ├── filters/
│   │   ├── guards/
│   │   ├── interceptors/
│   │   ├── pipes/
│   │   └── middleware/
│   ├── config/
│   ├── prisma/
│   └── main.ts
├── prisma/
│   ├── schema.prisma
│   ├── migrations/
│   └── seed.ts
├── test/
├── .env
├── .env.example
├── .gitignore
├── docker-compose.yml
├── Dockerfile
├── package.json
├── tsconfig.json
└── README.md
```

Comando para criar estrutura:

```bash
mkdir -p src/modules/{auth,users,mood-logs,challenges,analytics,gamification,notifications}
mkdir -p src/common/{decorators,filters,guards,interceptors,pipes,middleware}
mkdir -p src/config
mkdir -p src/prisma
mkdir -p prisma/migrations
mkdir -p test
```

### 1.4 Configuração do Repositório

```bash
git init
git add .
git commit -m "Initial commit: NestJS project structure"
```

### 1.5 Arquivos Base Obrigatórios

#### `.gitignore`

```
node_modules/
dist/
.env
.env.local
*.log
.DS_Store
coverage/
.vscode/
.idea/
prisma/dev.db
prisma/dev.db-journal
```

#### `tsconfig.json` (atualizar)

```json
{
  "compilerOptions": {
    "module": "commonjs",
    "declaration": true,
    "removeComments": true,
    "emitDecoratorMetadata": true,
    "experimentalDecorators": true,
    "allowSyntheticDefaultImports": true,
    "target": "ES2021",
    "sourceMap": true,
    "outDir": "./dist",
    "baseUrl": "./",
    "incremental": true,
    "skipLibCheck": true,
    "strictNullChecks": true,
    "noImplicitAny": true,
    "strictBindCallApply": false,
    "forceConsistentCasingInFileNames": false,
    "noFallthroughCasesInSwitch": false,
    "paths": {
      "@modules/*": ["src/modules/*"],
      "@common/*": ["src/common/*"],
      "@config/*": ["src/config/*"]
    }
  }
}
```

---

## 2. Environment Setup

### 2.1 Versões Exatas

- **Node.js**: `20.11.0`
- **npm**: `10.2.4`
- **TypeScript**: `5.3.3`
- **NestJS**: `10.3.0`
- **Prisma**: `6.10.0`
- **PostgreSQL**: `16.1` (via Docker)
- **Redis**: `7.2` (via Docker)

### 2.2 Arquivo `.env`

Criar arquivo `.env` na raiz com o seguinte conteúdo:

```env
# Application
NODE_ENV=development
PORT=3001

# Database
DATABASE_URL="file:./dev.db"

# JWT
JWT_SECRET="lifesync-super-secret-jwt-key-change-in-production-2026"
JWT_EXPIRATION="7d"
JWT_REFRESH_EXPIRATION="30d"

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=

# Google OAuth (opcional para MVP)
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GOOGLE_CALLBACK_URL=http://localhost:3001/api/v1/auth/google/callback

# Azure AD (opcional para MVP)
AZURE_AD_CLIENT_ID=
AZURE_AD_CLIENT_SECRET=
AZURE_AD_TENANT_ID=

# AWS S3 (opcional para MVP)
AWS_ACCESS_KEY_ID=
AWS_SECRET_ACCESS_KEY=
AWS_S3_BUCKET=
AWS_REGION=us-east-1

# CORS
CORS_ORIGIN=http://localhost:3000
```

### 2.3 Arquivo `.env.example`

Copiar `.env` para `.env.example` e remover valores sensíveis.

### 2.4 Docker Compose para Desenvolvimento Local

Criar `docker-compose.yml`:

```yaml
version: '3.8'

services:
  postgres:
    image: postgres:16.1-alpine
    container_name: lifesync-postgres
    restart: always
    environment:
      POSTGRES_USER: lifesync
      POSTGRES_PASSWORD: lifesync_dev_password
      POSTGRES_DB: lifesync_db
    ports:
      - '5432:5432'
    volumes:
      - postgres_data:/var/lib/postgresql/data

  redis:
    image: redis:7.2-alpine
    container_name: lifesync-redis
    restart: always
    ports:
      - '6379:6379'
    volumes:
      - redis_data:/data

volumes:
  postgres_data:
  redis_data:
```

### 2.5 Configuração Local Obrigatória

Para usar PostgreSQL (produção):

1. Atualizar `.env`:
```env
DATABASE_URL="postgresql://lifesync:lifesync_dev_password@localhost:5432/lifesync_db?schema=public"
```

2. Subir Docker:
```bash
docker-compose up -d
```

Para usar SQLite (desenvolvimento local rápido):

1. Manter `.env` com:
```env
DATABASE_URL="file:./dev.db"
```

2. Não precisa de Docker

---

## 3. Folder & Module Structure

### 3.1 Estrutura Completa de Diretórios

```
src/
├── modules/
│   ├── auth/
│   │   ├── auth.module.ts
│   │   ├── auth.controller.ts
│   │   ├── auth.service.ts
│   │   ├── dto/
│   │   │   ├── login.dto.ts
│   │   │   ├── register.dto.ts
│   │   │   └── refresh-token.dto.ts
│   │   ├── guards/
│   │   │   ├── jwt-auth.guard.ts
│   │   │   └── roles.guard.ts
│   │   ├── strategies/
│   │   │   ├── jwt.strategy.ts
│   │   │   └── google.strategy.ts
│   │   └── interfaces/
│   │       └── jwt-payload.interface.ts
│   │
│   ├── users/
│   │   ├── users.module.ts
│   │   ├── users.controller.ts
│   │   ├── users.service.ts
│   │   ├── dto/
│   │   │   ├── create-user.dto.ts
│   │   │   └── update-user.dto.ts
│   │   └── entities/
│   │       └── user.entity.ts
│   │
│   ├── mood-logs/
│   │   ├── mood-logs.module.ts
│   │   ├── mood-logs.controller.ts
│   │   ├── mood-logs.service.ts
│   │   ├── dto/
│   │   │   ├── create-mood-log.dto.ts
│   │   │   └── query-mood-logs.dto.ts
│   │   └── entities/
│   │       └── mood-log.entity.ts
│   │
│   ├── challenges/
│   │   ├── challenges.module.ts
│   │   ├── challenges.controller.ts
│   │   ├── challenges.service.ts
│   │   ├── dto/
│   │   │   ├── create-challenge.dto.ts
│   │   │   ├── complete-challenge.dto.ts
│   │   │   └── query-challenges.dto.ts
│   │   └── entities/
│   │       ├── challenge.entity.ts
│   │       └── user-challenge.entity.ts
│   │
│   ├── analytics/
│   │   ├── analytics.module.ts
│   │   ├── analytics.controller.ts
│   │   ├── analytics.service.ts
│   │   └── dto/
│   │       └── mood-summary-query.dto.ts
│   │
│   ├── gamification/
│   │   ├── gamification.module.ts
│   │   ├── gamification.service.ts
│   │   ├── dto/
│   │   │   └── add-xp.dto.ts
│   │   └── entities/
│   │       └── badge.entity.ts
│   │
│   └── notifications/
│       ├── notifications.module.ts
│       ├── notifications.service.ts
│       └── dto/
│           └── send-notification.dto.ts
│
├── common/
│   ├── decorators/
│   │   ├── current-user.decorator.ts
│   │   └── roles.decorator.ts
│   ├── filters/
│   │   └── http-exception.filter.ts
│   ├── guards/
│   │   ├── jwt-auth.guard.ts
│   │   └── roles.guard.ts
│   ├── interceptors/
│   │   ├── logging.interceptor.ts
│   │   └── transform.interceptor.ts
│   ├── pipes/
│   │   └── validation.pipe.ts
│   ├── middleware/
│   │   └── tenant.middleware.ts
│   └── enums/
│       ├── role.enum.ts
│       └── category.enum.ts
│
├── config/
│   ├── app.config.ts
│   ├── database.config.ts
│   ├── jwt.config.ts
│   └── redis.config.ts
│
├── prisma/
│   └── prisma.service.ts
│
└── main.ts
```

### 3.2 Responsabilidades por Pasta

#### `modules/auth/`
- **Responsabilidade**: Autenticação e autorização
- **Arquivos permitidos**: `*.module.ts`, `*.controller.ts`, `*.service.ts`, `dto/*.dto.ts`, `guards/*.guard.ts`, `strategies/*.strategy.ts`
- **Proibições**: NÃO pode acessar diretamente o banco (usar UsersService)

#### `modules/users/`
- **Responsabilidade**: CRUD de usuários, gerenciamento de perfis
- **Arquivos permitidos**: `*.module.ts`, `*.controller.ts`, `*.service.ts`, `dto/*.dto.ts`, `entities/*.entity.ts`
- **Proibições**: NÃO pode conter lógica de autenticação

#### `modules/mood-logs/`
- **Responsabilidade**: Registro e consulta de mood logs
- **Arquivos permitidos**: `*.module.ts`, `*.controller.ts`, `*.service.ts`, `dto/*.dto.ts`, `entities/*.entity.ts`
- **Proibições**: NÃO pode calcular XP (usar GamificationService)

#### `modules/challenges/`
- **Responsabilidade**: Gerenciamento de desafios e completions
- **Arquivos permitidos**: `*.module.ts`, `*.controller.ts`, `*.service.ts`, `dto/*.dto.ts`, `entities/*.entity.ts`
- **Proibições**: NÃO pode calcular XP diretamente (usar GamificationService)

#### `modules/analytics/`
- **Responsabilidade**: Agregação de dados para dashboards
- **Arquivos permitidos**: `*.module.ts`, `*.controller.ts`, `*.service.ts`, `dto/*.dto.ts`
- **Proibições**: NÃO pode retornar dados individuais de usuários (apenas agregados)

#### `modules/gamification/`
- **Responsabilidade**: Cálculo de XP, níveis, badges, leaderboard
- **Arquivos permitidos**: `*.module.ts`, `*.service.ts`, `dto/*.dto.ts`, `entities/*.entity.ts`
- **Proibições**: NÃO tem controller (apenas service usado por outros módulos)

#### `modules/notifications/`
- **Responsabilidade**: Envio de notificações (push, email)
- **Arquivos permitidos**: `*.module.ts`, `*.service.ts`, `dto/*.dto.ts`
- **Proibições**: NÃO tem controller (apenas service usado por outros módulos)

#### `common/`
- **Responsabilidade**: Código compartilhado entre módulos
- **Arquivos permitidos**: `decorators/*.decorator.ts`, `filters/*.filter.ts`, `guards/*.guard.ts`, `interceptors/*.interceptor.ts`, `pipes/*.pipe.ts`, `middleware/*.middleware.ts`, `enums/*.enum.ts`
- **Proibições**: NÃO pode conter lógica de negócio

#### `config/`
- **Responsabilidade**: Configurações da aplicação
- **Arquivos permitidos**: `*.config.ts`
- **Proibições**: NÃO pode conter lógica de negócio

#### `prisma/`
- **Responsabilidade**: Serviço de acesso ao banco de dados
- **Arquivos permitidos**: `prisma.service.ts`
- **Proibições**: NÃO pode conter queries complexas (encapsular em services)

---

## 4. Domain Implementation Plan

### 4.1 Enums

#### `src/common/enums/role.enum.ts`

```typescript
export enum Role {
  EMPLOYEE = 'EMPLOYEE',
  MANAGER = 'MANAGER',
  ADMIN = 'ADMIN',
}
```

#### `src/common/enums/category.enum.ts`

```typescript
export enum Category {
  PHYSICAL = 'PHYSICAL',
  MENTAL = 'MENTAL',
  SOCIAL = 'SOCIAL',
  NUTRITION = 'NUTRITION',
}
```

### 4.2 Entidade: Company

**Arquivo**: Definido apenas no Prisma Schema

**Campos**:
- `id`: String (UUID, @id, @default(uuid()))
- `name`: String
- `domain`: String (@unique)
- `createdAt`: DateTime (@default(now()))
- `updatedAt`: DateTime (@updatedAt)

**Relações**:
- `users`: User[] (@relation)
- `challenges`: Challenge[] (@relation)

**Invariantes**:
- Domain DEVE ser único
- NÃO pode ser deletada se tiver usuários ativos

### 4.3 Entidade: User

**Arquivo**: `src/modules/users/entities/user.entity.ts`

**Campos**:
- `id`: String (UUID)
- `companyId`: String (UUID, FK)
- `name`: String (min: 3, max: 100)
- `email`: String (unique per company, max: 255)
- `passwordHash`: String | null (nullable se SSO)
- `role`: Role (enum)
- `xp`: Number (default: 0, min: 0)
- `level`: Number (default: 1, min: 1)
- `createdAt`: DateTime
- `updatedAt`: DateTime

**Relações**:
- `company`: Company
- `moodLogs`: MoodLog[]
- `userChallenges`: UserChallenge[]
- `badges`: Badge[]

**Validações**:
- Email: RFC 5322, lowercase, trim
- Password: min 8 caracteres (se presente)
- Name: min 3, max 100, trim
- XP: >= 0
- Level: >= 1

**Métodos Obrigatórios** (no UserService):
- `calculateLevel(xp: number): number` → `Math.floor(xp / 100) + 1`
- `addXP(userId: string, xp: number): Promise<User>` → Atualiza XP e recalcula level

**Invariantes**:
- `level === Math.floor(xp / 100) + 1` (SEMPRE)
- Email único por empresa (composite unique index)

### 4.4 Entidade: MoodLog

**Arquivo**: `src/modules/mood-logs/entities/mood-log.entity.ts`

**Campos**:
- `id`: String (UUID)
- `userId`: String (UUID, FK)
- `mood`: Number (1-5, inclusive)
- `tags`: String[] (max 5 items, lowercase)
- `note`: String | null (max 500 caracteres)
- `loggedAt`: DateTime
- `createdAt`: DateTime

**Relações**:
- `user`: User

**Validações**:
- mood: Integer, min 1, max 5
- tags: Array, max 5 items, cada item lowercase
- note: max 500 caracteres, sanitizar HTML
- loggedAt: <= now()

**Invariantes**:
- Um usuário PODE ter apenas 1 mood log por dia
- Se tentar criar outro no mesmo dia, DEVE sobrescrever o anterior

### 4.5 Entidade: Challenge

**Arquivo**: `src/modules/challenges/entities/challenge.entity.ts`

**Campos**:
- `id`: String (UUID)
- `companyId`: String | null (UUID, FK, nullable se global)
- `title`: String (min: 5, max: 100)
- `description`: String (min: 10, max: 500)
- `category`: Category (enum)
- `xpReward`: Number (min: 1, max: 100)
- `isGlobal`: Boolean (default: false)
- `createdAt`: DateTime
- `updatedAt`: DateTime

**Relações**:
- `company`: Company | null
- `userChallenges`: UserChallenge[]

**Validações**:
- title: min 5, max 100, sem HTML
- description: min 10, max 500, sanitizar HTML
- xpReward: min 1, max 100
- Se isGlobal = true, companyId DEVE ser null

**Invariantes**:
- xpReward > 0
- Se isGlobal = true, companyId = null

### 4.6 Entidade: UserChallenge

**Arquivo**: `src/modules/challenges/entities/user-challenge.entity.ts`

**Campos**:
- `id`: String (UUID)
- `userId`: String (UUID, FK)
- `challengeId`: String (UUID, FK)
- `completedAt`: DateTime | null
- `createdAt`: DateTime

**Relações**:
- `user`: User
- `challenge`: Challenge

**Validações**:
- completedAt: <= now()

**Invariantes**:
- Um usuário NÃO pode completar o mesmo desafio mais de uma vez por dia
- Composite unique index: (userId, challengeId, DATE(completedAt))

### 4.7 Entidade: Badge

**Arquivo**: `src/modules/gamification/entities/badge.entity.ts`

**Campos**:
- `id`: String (UUID)
- `userId`: String (UUID, FK)
- `name`: String
- `description`: String
- `iconUrl`: String | null
- `earnedAt`: DateTime

**Relações**:
- `user`: User

**Badges Pré-definidos**:
1. "Primeiro Passo": Primeiro mood log
2. "Consistente": 7 dias consecutivos de check-in
3. "Dedicado": 30 dias consecutivos de check-in
4. "Mestre do Bem-Estar": 100 desafios completados

**Invariantes**:
- Badges NÃO podem ser removidos após concedidos

---

## 5. Database Implementation

### 5.1 Tipo de Banco

- **Desenvolvimento**: SQLite (file:./dev.db)
- **Produção**: PostgreSQL 16.x

### 5.2 Estratégia

- **Migration-based**: Usar Prisma Migrate
- **Versionamento**: Migrations versionadas em `prisma/migrations/`

### 5.3 Prisma Schema

Criar `prisma/schema.prisma`:

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "sqlite"
  url      = env("DATABASE_URL")
}

model Company {
  id         String      @id @default(uuid())
  name       String
  domain     String      @unique
  createdAt  DateTime    @default(now())
  updatedAt  DateTime    @updatedAt
  
  users      User[]
  challenges Challenge[]
  
  @@map("companies")
}

model User {
  id           String    @id @default(uuid())
  companyId    String
  name         String
  email        String
  passwordHash String?
  role         String    @default("EMPLOYEE")
  xp           Int       @default(0)
  level        Int       @default(1)
  createdAt    DateTime  @default(now())
  updatedAt    DateTime  @updatedAt
  
  company         Company          @relation(fields: [companyId], references: [id])
  moodLogs        MoodLog[]
  userChallenges  UserChallenge[]
  badges          Badge[]
  
  @@unique([email, companyId])
  @@index([companyId])
  @@map("users")
}

model MoodLog {
  id        String   @id @default(uuid())
  userId    String
  mood      Int
  tags      String   @default("")
  note      String?
  loggedAt  DateTime @default(now())
  createdAt DateTime @default(now())
  
  user User @relation(fields: [userId], references: [id])
  
  @@index([userId])
  @@index([loggedAt])
  @@map("mood_logs")
}

model Challenge {
  id          String    @id @default(uuid())
  companyId   String?
  title       String
  description String
  category    String
  xpReward    Int
  isGlobal    Boolean   @default(false)
  createdAt   DateTime  @default(now())
  updatedAt   DateTime  @updatedAt
  
  company         Company?         @relation(fields: [companyId], references: [id])
  userChallenges  UserChallenge[]
  
  @@index([companyId])
  @@index([isGlobal])
  @@map("challenges")
}

model UserChallenge {
  id          String    @id @default(uuid())
  userId      String
  challengeId String
  completedAt DateTime?
  createdAt   DateTime  @default(now())
  
  user      User      @relation(fields: [userId], references: [id])
  challenge Challenge @relation(fields: [challengeId], references: [id])
  
  @@index([userId])
  @@index([challengeId])
  @@index([completedAt])
  @@map("user_challenges")
}

model Badge {
  id          String   @id @default(uuid())
  userId      String
  name        String
  description String
  iconUrl     String?
  earnedAt    DateTime @default(now())
  
  user User @relation(fields: [userId], references: [id])
  
  @@index([userId])
  @@map("badges")
}
```

### 5.4 Constraints e Índices

**Unique Constraints**:
- `companies.domain` (único global)
- `users.(email, companyId)` (email único por empresa)

**Indexes**:
- `users.companyId` (queries filtradas por tenant)
- `moodLogs.userId` (histórico de mood logs)
- `moodLogs.loggedAt` (queries por data)
- `challenges.companyId` (desafios por empresa)
- `challenges.isGlobal` (filtrar globais)
- `userChallenges.userId` (desafios do usuário)
- `userChallenges.challengeId` (usuários que completaram desafio)
- `userChallenges.completedAt` (desafios completados por data)
- `badges.userId` (badges do usuário)

**Check Constraints** (implementar no service layer):
- `users.xp >= 0`
- `users.level >= 1`
- `moodLogs.mood >= 1 AND mood <= 5`
- `challenges.xpReward > 0`

### 5.5 Ordem de Criação

1. Criar schema.prisma
2. Executar `npx prisma migrate dev --name init`
3. Executar `npx prisma generate`

### 5.6 Seed Data

Criar `prisma/seed.ts`:

```typescript
import { PrismaClient, Role, Category } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  // Criar empresa
  const company = await prisma.company.create({
    data: {
      name: 'ACME Corporation',
      domain: 'acme.com',
    },
  });

  // Criar usuários
  const passwordHash = await bcrypt.hash('password123', 10);

  const admin = await prisma.user.create({
    data: {
      companyId: company.id,
      name: 'Admin User',
      email: 'admin@acme.com',
      passwordHash,
      role: 'ADMIN',
      xp: 500,
      level: 6,
    },
  });

  const manager = await prisma.user.create({
    data: {
      companyId: company.id,
      name: 'Maria Gestora',
      email: 'manager@acme.com',
      passwordHash,
      role: 'MANAGER',
      xp: 350,
      level: 4,
    },
  });

  const employee = await prisma.user.create({
    data: {
      companyId: company.id,
      name: 'João Silva',
      email: 'joao@acme.com',
      passwordHash,
      role: 'EMPLOYEE',
      xp: 250,
      level: 3,
    },
  });

  // Criar desafios globais
  const challenges = await prisma.challenge.createMany({
    data: [
      {
        title: 'Pausa de 5 minutos',
        description: 'Levante e estique o corpo',
        category: 'PHYSICAL',
        xpReward: 15,
        isGlobal: true,
      },
      {
        title: 'Beber 2L de água',
        description: 'Mantenha-se hidratado ao longo do dia',
        category: 'NUTRITION',
        xpReward: 10,
        isGlobal: true,
      },
      {
        title: 'Meditação guiada',
        description: '5 minutos de meditação',
        category: 'MENTAL',
        xpReward: 30,
        isGlobal: true,
      },
      {
        title: 'Conversa com colega',
        description: 'Tenha uma conversa significativa',
        category: 'SOCIAL',
        xpReward: 15,
        isGlobal: true,
      },
    ],
  });

  // Criar mood logs
  await prisma.moodLog.create({
    data: {
      userId: employee.id,
      mood: 4,
      tags: 'productive,motivated',
      note: 'Dia produtivo!',
    },
  });

  console.log('Seed completed successfully');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
```

Adicionar ao `package.json`:

```json
{
  "prisma": {
    "seed": "ts-node prisma/seed.ts"
  }
}
```

---

## 6. API Layer Implementation

### 6.1 Global Prefix e Versionamento

Todas as rotas DEVEM ter prefixo `/api/v1`.

Configurar em `src/main.ts`:

```typescript
app.setGlobalPrefix('api/v1');
```

### 6.2 Endpoints por Módulo

#### 6.2.1 Auth Module

**POST /api/v1/auth/register**

- **Payload**:
```typescript
{
  name: string;        // min 3, max 100
  email: string;       // valid email, max 255
  password: string;    // min 8, max 128
  companyDomain: string; // ex: "acme.com"
}
```

- **Validação**:
  - Todos os campos obrigatórios
  - Email válido (RFC 5322)
  - Password min 8 caracteres
  - Company domain DEVE existir

- **Resposta Sucesso** (201):
```typescript
{
  accessToken: string;
  refreshToken: string;
  user: {
    id: string;
    name: string;
    email: string;
    role: string;
    xp: number;
    level: number;
  }
}
```

- **Resposta Erro**:
  - 400: Validação falhou
  - 409: Email já existe na empresa
  - 404: Company domain não encontrado

- **Autorização**: Nenhuma (público)

---

**POST /api/v1/auth/login**

- **Payload**:
```typescript
{
  email: string;
  password: string;
}
```

- **Validação**:
  - Email e password obrigatórios

- **Resposta Sucesso** (200):
```typescript
{
  accessToken: string;
  refreshToken: string;
  user: {
    id: string;
    name: string;
    email: string;
    role: string;
    xp: number;
    level: number;
  }
}
```

- **Resposta Erro**:
  - 400: Validação falhou
  - 401: Credenciais inválidas

- **Autorização**: Nenhuma (público)

---

**POST /api/v1/auth/refresh**

- **Payload**:
```typescript
{
  refreshToken: string;
}
```

- **Resposta Sucesso** (200):
```typescript
{
  accessToken: string;
  refreshToken: string;
}
```

- **Resposta Erro**:
  - 401: Refresh token inválido ou expirado

- **Autorização**: Nenhuma (público)

---

#### 6.2.2 Users Module

**GET /api/v1/users/me**

- **Payload**: Nenhum

- **Resposta Sucesso** (200):
```typescript
{
  id: string;
  name: string;
  email: string;
  role: string;
  xp: number;
  level: number;
  createdAt: string;
}
```

- **Resposta Erro**:
  - 401: Não autenticado

- **Autorização**: JWT obrigatório

---

**GET /api/v1/users**

- **Query Params**:
  - `page`: number (default: 1)
  - `limit`: number (default: 20, max: 100)
  - `role`: string (opcional)

- **Resposta Sucesso** (200):
```typescript
{
  data: User[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  }
}
```

- **Resposta Erro**:
  - 401: Não autenticado
  - 403: Apenas MANAGER e ADMIN

- **Autorização**: JWT + Role (MANAGER, ADMIN)

---

**PATCH /api/v1/users/:id**

- **Payload**:
```typescript
{
  name?: string;
}
```

- **Validação**:
  - name: min 3, max 100 (se presente)

- **Resposta Sucesso** (200):
```typescript
{
  id: string;
  name: string;
  email: string;
  role: string;
  xp: number;
  level: number;
}
```

- **Resposta Erro**:
  - 400: Validação falhou
  - 401: Não autenticado
  - 403: Usuário só pode atualizar próprio perfil (ou ser ADMIN)
  - 404: Usuário não encontrado

- **Autorização**: JWT + (próprio usuário OU ADMIN)

---

#### 6.2.3 Mood Logs Module

**POST /api/v1/mood-logs**

- **Payload**:
```typescript
{
  mood: number;        // 1-5
  tags?: string[];     // max 5 items
  note?: string;       // max 500 caracteres
}
```

- **Validação**:
  - mood: obrigatório, integer, 1-5
  - tags: opcional, array, max 5 items, cada item lowercase
  - note: opcional, max 500 caracteres, sanitizar HTML

- **Resposta Sucesso** (201):
```typescript
{
  id: string;
  userId: string;
  mood: number;
  tags: string[];
  note: string | null;
  loggedAt: string;
  xpEarned: number;    // +5 XP
  newLevel: number;
}
```

- **Resposta Erro**:
  - 400: Validação falhou
  - 401: Não autenticado

- **Autorização**: JWT obrigatório

- **Lógica**:
  1. Verificar se já existe mood log do usuário no dia atual
  2. Se existir, sobrescrever (UPDATE)
  3. Se não existir, criar (INSERT)
  4. Adicionar +5 XP ao usuário
  5. Recalcular level
  6. Verificar se ganhou badge "Primeiro Passo"
  7. Retornar mood log + xpEarned + newLevel

---

**GET /api/v1/mood-logs/history**

- **Query Params**:
  - `limit`: number (default: 7, max: 30)

- **Resposta Sucesso** (200):
```typescript
{
  data: MoodLog[];
}
```

- **Resposta Erro**:
  - 401: Não autenticado

- **Autorização**: JWT obrigatório

- **Lógica**:
  - Retornar últimos N mood logs do usuário autenticado
  - Ordenar por loggedAt DESC

---

#### 6.2.4 Challenges Module

**GET /api/v1/challenges/daily**

- **Payload**: Nenhum

- **Resposta Sucesso** (200):
```typescript
{
  challenges: Challenge[];
}
```

- **Resposta Erro**:
  - 401: Não autenticado

- **Autorização**: JWT obrigatório

- **Lógica**:
  1. Buscar desafios globais (isGlobal = true)
  2. Buscar desafios da empresa do usuário (companyId = user.companyId)
  3. Filtrar desafios já completados hoje pelo usuário
  4. Ordenar por category, depois por xpReward DESC
  5. Retornar lista

---

**POST /api/v1/challenges/:id/complete**

- **Payload**: Nenhum

- **Resposta Sucesso** (200):
```typescript
{
  challenge: Challenge;
  xpEarned: number;
  totalXP: number;
  newLevel: number;
}
```

- **Resposta Erro**:
  - 400: Desafio já completado hoje
  - 401: Não autenticado
  - 404: Desafio não encontrado

- **Autorização**: JWT obrigatório

- **Lógica**:
  1. Verificar se desafio existe
  2. Verificar se usuário já completou este desafio hoje
  3. Se sim, retornar 400
  4. Se não, criar UserChallenge com completedAt = now()
  5. Adicionar challenge.xpReward ao usuário
  6. Recalcular level
  7. Verificar se ganhou badge (ex: 100 desafios completados)
  8. Retornar challenge + xpEarned + totalXP + newLevel

---

**POST /api/v1/challenges** (MANAGER/ADMIN apenas)

- **Payload**:
```typescript
{
  title: string;        // min 5, max 100
  description: string;  // min 10, max 500
  category: string;     // PHYSICAL | MENTAL | SOCIAL | NUTRITION
  xpReward: number;     // min 1, max 100
}
```

- **Validação**:
  - Todos os campos obrigatórios
  - title: min 5, max 100, sem HTML
  - description: min 10, max 500, sanitizar HTML
  - category: enum válido
  - xpReward: min 1, max 100

- **Resposta Sucesso** (201):
```typescript
{
  id: string;
  companyId: string;
  title: string;
  description: string;
  category: string;
  xpReward: number;
  isGlobal: false;
  createdAt: string;
}
```

- **Resposta Erro**:
  - 400: Validação falhou
  - 401: Não autenticado
  - 403: Apenas MANAGER e ADMIN

- **Autorização**: JWT + Role (MANAGER, ADMIN)

---

#### 6.2.5 Analytics Module

**GET /api/v1/analytics/mood-summary**

- **Query Params**:
  - `startDate`: string (ISO 8601, opcional)
  - `endDate`: string (ISO 8601, opcional)

- **Resposta Sucesso** (200):
```typescript
{
  averageMood: number;
  totalCheckins: number;
  moodDistribution: {
    1: number;  // %
    2: number;
    3: number;
    4: number;
    5: number;
  };
  engagementRate: number;  // %
}
```

- **Resposta Erro**:
  - 401: Não autenticado
  - 403: Apenas MANAGER e ADMIN

- **Autorização**: JWT + Role (MANAGER, ADMIN)

- **Lógica**:
  1. Filtrar mood logs por companyId do usuário autenticado
  2. Filtrar por período (se fornecido)
  3. Calcular média de mood
  4. Contar total de check-ins
  5. Calcular distribuição (% de cada valor 1-5)
  6. Calcular taxa de engajamento: (usuários com mood log no período / total de usuários) * 100
  7. NÃO retornar dados individuais (apenas agregados)

---

#### 6.2.6 Gamification Module

NÃO tem endpoints públicos. Apenas service usado internamente.

---

#### 6.2.7 Notifications Module

NÃO tem endpoints públicos. Apenas service usado internamente.

---

### 6.3 Padrão de Erro Global

Todos os erros DEVEM seguir a estrutura:

```typescript
{
  statusCode: number;
  message: string;
  errors?: Array<{
    field: string;
    message: string;
  }>;
  timestamp: string;  // ISO 8601
  path: string;
}
```

Implementar via `HttpExceptionFilter` em `src/common/filters/http-exception.filter.ts`.

---

## 7. Authentication & Authorization

### 7.1 Tipo de Autenticação

- **JWT (JSON Web Tokens)**
- **Algoritmo**: HS256
- **Secret**: `process.env.JWT_SECRET`

### 7.2 Fluxo Completo

1. **Registro**:
   - POST /api/v1/auth/register
   - Validar dados
   - Hash password com bcrypt (salt rounds: 10)
   - Criar usuário no banco
   - Gerar accessToken e refreshToken
   - Retornar tokens + user

2. **Login**:
   - POST /api/v1/auth/login
   - Buscar usuário por email
   - Comparar password com bcrypt
   - Se válido, gerar accessToken e refreshToken
   - Retornar tokens + user

3. **Acesso a Rota Protegida**:
   - Cliente envia `Authorization: Bearer <accessToken>`
   - JwtAuthGuard valida token
   - Extrai payload (userId, email, role, companyId)
   - Injeta user no request
   - Controller acessa via `@CurrentUser()` decorator

4. **Refresh Token**:
   - POST /api/v1/auth/refresh
   - Validar refreshToken
   - Gerar novo accessToken e refreshToken
   - Retornar novos tokens

### 7.3 Estrutura do Token

**Access Token Payload**:

```typescript
{
  sub: string;        // userId
  email: string;
  role: string;       // EMPLOYEE | MANAGER | ADMIN
  companyId: string;
  iat: number;
  exp: number;
}
```

**Expiração**:
- Access Token: 7 dias (`process.env.JWT_EXPIRATION`)
- Refresh Token: 30 dias (`process.env.JWT_REFRESH_EXPIRATION`)

### 7.4 Middleware

NÃO usar middleware global. Usar Guards.

### 7.5 Proteção de Rotas

**JWT Guard** (`src/common/guards/jwt-auth.guard.ts`):

```typescript
@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {}
```

Uso:

```typescript
@UseGuards(JwtAuthGuard)
@Get('me')
async getMe(@CurrentUser() user: User) {
  return user;
}
```

**Roles Guard** (`src/common/guards/roles.guard.ts`):

```typescript
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.get<Role[]>('roles', context.getHandler());
    if (!requiredRoles) {
      return true;
    }
    const { user } = context.switchToHttp().getRequest();
    return requiredRoles.includes(user.role);
  }
}
```

Uso:

```typescript
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.MANAGER, Role.ADMIN)
@Get('analytics/mood-summary')
async getMoodSummary() {
  // Apenas MANAGER e ADMIN
}
```

### 7.6 Política de Roles

- **EMPLOYEE**: Acesso a próprios dados (mood logs, challenges, perfil)
- **MANAGER**: Acesso a analytics da empresa + permissões de EMPLOYEE
- **ADMIN**: Acesso total + gerenciamento de usuários

**Hierarquia**: ADMIN > MANAGER > EMPLOYEE

### 7.7 Multi-Tenancy

Implementar `TenantMiddleware` em `src/common/middleware/tenant.middleware.ts`:

```typescript
@Injectable()
export class TenantMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction) {
    if (req.user) {
      req.companyId = req.user.companyId;
    }
    next();
  }
}
```

Aplicar globalmente em `AppModule`.

Todas as queries DEVEM filtrar por `companyId` (exceto ADMIN do sistema).

---

## 8. Error Handling Strategy

### 8.1 Estrutura Padrão de Erro

```typescript
{
  statusCode: number;
  message: string;
  errors?: Array<{
    field: string;
    message: string;
  }>;
  timestamp: string;
  path: string;
}
```

### 8.2 Códigos Internos

NÃO usar códigos internos customizados. Usar HTTP status codes padrão.

### 8.3 Tratamento Global

Criar `HttpExceptionFilter` em `src/common/filters/http-exception.filter.ts`:

```typescript
@Catch(HttpException)
export class HttpExceptionFilter implements ExceptionFilter {
  catch(exception: HttpException, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse();
    const request = ctx.getRequest();
    const status = exception.getStatus();
    const exceptionResponse = exception.getResponse();

    const errorResponse = {
      statusCode: status,
      message: exceptionResponse['message'] || exception.message,
      errors: exceptionResponse['errors'] || undefined,
      timestamp: new Date().toISOString(),
      path: request.url,
    };

    response.status(status).json(errorResponse);
  }
}
```

Aplicar globalmente em `main.ts`:

```typescript
app.useGlobalFilters(new HttpExceptionFilter());
```

### 8.4 Logging Obrigatório

Logar TODOS os erros com nível `error`:

```typescript
this.logger.error(`Error: ${exception.message}`, exception.stack);
```

---

## 9. Logging & Observability

### 9.1 Biblioteca Utilizada

- **NestJS Logger** (built-in)

### 9.2 Nível de Logs

- **error**: Erros que impedem operação
- **warn**: Situações anormais mas recuperáveis
- **log**: Eventos importantes (login, criação de recursos)
- **debug**: Informações detalhadas para debugging (apenas dev)
- **verbose**: Tudo (apenas dev)

### 9.3 Formato

```typescript
{
  timestamp: string;      // ISO 8601
  level: string;          // error | warn | log | debug | verbose
  context: string;        // Nome do service/controller
  message: string;
  userId?: string;
  companyId?: string;
  requestId?: string;
}
```

### 9.4 Logs Obrigatórios por Camada

**Auth**:
- Login (sucesso e falha)
- Registro
- Refresh token

**Users**:
- Criação de usuário
- Atualização de perfil
- Mudança de role

**Mood Logs**:
- Criação de mood log
- XP adicionado

**Challenges**:
- Completar desafio
- XP adicionado
- Badge ganho

**Analytics**:
- Acesso a analytics (MANAGER/ADMIN)

**Errors**:
- TODOS os erros (stack trace completo)

### 9.5 Proibições

NÃO logar:
- Senhas
- Tokens JWT
- Refresh tokens
- PII desnecessário

---

## 10. Testing Strategy

### 10.1 Tipo de Testes Obrigatórios

1. **Unit Tests**: Todos os services
2. **Integration Tests**: Todos os controllers
3. **E2E Tests**: Fluxos críticos (login, mood log, complete challenge)

### 10.2 Estrutura de Testes

```
test/
├── unit/
│   ├── auth.service.spec.ts
│   ├── users.service.spec.ts
│   ├── mood-logs.service.spec.ts
│   ├── challenges.service.spec.ts
│   └── gamification.service.spec.ts
├── integration/
│   ├── auth.controller.spec.ts
│   ├── users.controller.spec.ts
│   ├── mood-logs.controller.spec.ts
│   └── challenges.controller.spec.ts
└── e2e/
    ├── auth.e2e-spec.ts
    ├── mood-logs.e2e-spec.ts
    └── challenges.e2e-spec.ts
```

### 10.3 Organização de Pastas

- `test/unit/`: Testes unitários (services)
- `test/integration/`: Testes de integração (controllers)
- `test/e2e/`: Testes end-to-end (fluxos completos)

### 10.4 Mocks Permitidos

- **PrismaService**: Sempre mockar em unit tests
- **External Services**: Sempre mockar (Google OAuth, Azure AD, S3, Redis)
- **GamificationService**: Mockar em testes de outros módulos

### 10.5 O que Deve Ser Testado

**Unit Tests (Services)**:
- Lógica de negócio
- Cálculos (XP, level)
- Validações
- Edge cases

**Integration Tests (Controllers)**:
- Validação de DTOs
- Autenticação e autorização
- Responses HTTP
- Status codes

**E2E Tests**:
- Fluxo completo de registro e login
- Fluxo de mood log + XP + level up
- Fluxo de completar desafio + XP + badge

### 10.6 Comandos

```bash
# Unit tests
npm run test

# Integration tests
npm run test:integration

# E2E tests
npm run test:e2e

# Coverage
npm run test:cov
```

---

## 11. Local Execution Guide

### 11.1 Passo a Passo Determinístico

**Passo 1: Instalar Dependências**

```bash
cd lifesync-backend
npm install
```

**Passo 2: Configurar Ambiente**

```bash
cp .env.example .env
# Editar .env com valores corretos
```

**Passo 3: Subir Banco de Dados (se PostgreSQL)**

```bash
docker-compose up -d postgres redis
```

**Passo 4: Rodar Migrations**

```bash
npx prisma migrate dev
```

**Passo 5: Popular Seed**

```bash
npx prisma db seed
```

**Passo 6: Gerar Prisma Client**

```bash
npx prisma generate
```

**Passo 7: Rodar Aplicação**

```bash
npm run start:dev
```

### 11.2 Porta Final

- **Backend**: `http://localhost:3001`

### 11.3 Endpoint de Healthcheck

**GET /api/v1/health**

Resposta:

```json
{
  "status": "ok",
  "database": "connected",
  "redis": "connected",
  "timestamp": "2026-02-07T20:30:00Z"
}
```

### 11.4 Credenciais de Teste

Após seed:

- **Admin**: `admin@acme.com` / `password123`
- **Manager**: `manager@acme.com` / `password123`
- **Employee**: `joao@acme.com` / `password123`

---

## 12. Production Readiness Preparation

### 12.1 Variáveis Obrigatórias

```env
NODE_ENV=production
PORT=3001
DATABASE_URL=postgresql://user:password@host:5432/lifesync_db
JWT_SECRET=<strong-random-secret-256-bits>
JWT_EXPIRATION=7d
JWT_REFRESH_EXPIRATION=30d
REDIS_HOST=<redis-host>
REDIS_PORT=6379
REDIS_PASSWORD=<redis-password>
CORS_ORIGIN=https://lifesync.com
```

### 12.2 Build Final

```bash
npm run build
```

Output: `dist/`

### 12.3 Dockerfile

```dockerfile
FROM node:20.11.0-alpine AS builder

WORKDIR /app

COPY package*.json ./
COPY prisma ./prisma/

RUN npm ci

COPY . .

RUN npx prisma generate
RUN npm run build

FROM node:20.11.0-alpine

WORKDIR /app

COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/package*.json ./

EXPOSE 3001

CMD ["npm", "run", "start:prod"]
```

### 12.4 Estratégia de Build

- **Multi-stage build**: Reduz tamanho da imagem
- **Alpine Linux**: Imagem mínima
- **Prisma generate**: Executar no build

### 12.5 Estratégia de Start

```bash
# Produção
npm run start:prod

# Desenvolvimento
npm run start:dev
```

---

## 13. Implementation Guardrails

### 13.1 O que NÃO Pode Ser Feito

- ❌ Alterar estrutura de pastas definida
- ❌ Usar ORM diferente de Prisma
- ❌ Usar autenticação diferente de JWT
- ❌ Pular validações de DTO
- ❌ Retornar password hash em responses
- ❌ Queries sem filtro de `companyId` (exceto ADMIN)
- ❌ Atualizar `level` manualmente (sempre calcular de `xp`)
- ❌ Permitir múltiplos mood logs por dia
- ❌ Permitir completar mesmo desafio múltiplas vezes no mesmo dia
- ❌ Retornar dados individuais em analytics (apenas agregados)
- ❌ Usar `any` type em TypeScript
- ❌ Commits sem lint (ESLint)

### 13.2 O que NÃO Pode Ser Alterado

- ✋ Fórmula de level: `Math.floor(xp / 100) + 1`
- ✋ XP por mood log: 5 XP
- ✋ Escala de mood: 1-5
- ✋ Máximo de tags por mood log: 5
- ✋ Hierarquia de roles: ADMIN > MANAGER > EMPLOYEE
- ✋ Prefixo de API: `/api/v1`
- ✋ Estrutura de erro padrão
- ✋ Expiração de JWT: 7 dias (access), 30 dias (refresh)
- ✋ Salt rounds bcrypt: 10

### 13.3 Dependências Proibidas

- ❌ TypeORM (usar Prisma)
- ❌ Sequelize (usar Prisma)
- ❌ Mongoose (usar Prisma)
- ❌ Express (NestJS usa internamente, não substituir)
- ❌ Fastify (manter Express)
- ❌ Passport-local (usar JWT)
- ❌ Session-based auth (usar JWT)

### 13.4 Mudanças Arquiteturais Proibidas

- ❌ Migrar para GraphQL (manter REST)
- ❌ Migrar para microsserviços (manter monolith modular)
- ❌ Adicionar Event Bus (Kafka/RabbitMQ) no MVP
- ❌ Adicionar Elasticsearch no MVP
- ❌ Implementar CQRS no MVP
- ❌ Implementar Event Sourcing no MVP

---

## 14. Checklist de Implementação

Execute na ordem:

- [ ] 1. Criar projeto NestJS
- [ ] 2. Instalar dependências
- [ ] 3. Criar estrutura de pastas
- [ ] 4. Configurar Prisma schema
- [ ] 5. Criar migrations
- [ ] 6. Criar seed
- [ ] 7. Implementar PrismaService
- [ ] 8. Implementar enums (Role, Category)
- [ ] 9. Implementar Auth module (register, login, refresh)
- [ ] 10. Implementar JWT strategy e guards
- [ ] 11. Implementar Users module
- [ ] 12. Implementar Gamification service
- [ ] 13. Implementar Mood Logs module
- [ ] 14. Implementar Challenges module
- [ ] 15. Implementar Analytics module
- [ ] 16. Implementar Notifications service (stub)
- [ ] 17. Implementar decorators (@CurrentUser, @Roles)
- [ ] 18. Implementar filters (HttpExceptionFilter)
- [ ] 19. Implementar interceptors (LoggingInterceptor)
- [ ] 20. Implementar middleware (TenantMiddleware)
- [ ] 21. Configurar CORS
- [ ] 22. Configurar ValidationPipe global
- [ ] 23. Implementar healthcheck endpoint
- [ ] 24. Escrever unit tests
- [ ] 25. Escrever integration tests
- [ ] 26. Escrever E2E tests
- [ ] 27. Criar Dockerfile
- [ ] 28. Criar docker-compose.yml
- [ ] 29. Testar localmente
- [ ] 30. Documentar README.md

---

**FIM DO IMPLEMENTATION PLAN**

Este documento contém TODAS as informações necessárias para implementar o LifeSync backend do zero, sem ambiguidades ou decisões em aberto.
