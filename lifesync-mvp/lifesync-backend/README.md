# LifeSync Backend

Backend API para a plataforma LifeSync - Sistema de bem-estar corporativo.

## Tecnologias

- **Node.js** 20.11.0
- **NestJS** 10.3.0
- **TypeScript** 5.3.3
- **Prisma** 6.10.0
- **SQLite** (desenvolvimento) / **PostgreSQL** 16.1 (produção)
- **Redis** 7.2
- **JWT** para autenticação

## Estrutura do Projeto

```
src/
├── modules/
│   ├── auth/          # Autenticação (register, login, refresh)
│   ├── users/         # Gerenciamento de usuários
│   ├── mood-logs/     # Registro de humor
│   ├── challenges/    # Desafios de bem-estar
│   ├── analytics/     # Analytics agregados
│   ├── gamification/  # Sistema de XP, níveis e badges
│   └── notifications/ # Notificações (stub)
├── common/            # Código compartilhado
│   ├── decorators/    # @CurrentUser, @Roles
│   ├── filters/       # HttpExceptionFilter
│   ├── guards/        # JwtAuthGuard, RolesGuard
│   ├── interceptors/  # LoggingInterceptor
│   ├── middleware/    # TenantMiddleware
│   └── enums/         # Role, Category
├── prisma/            # PrismaService
└── main.ts            # Bootstrap da aplicação
```

## Instalação

```bash
# Instalar dependências
npm install

# Configurar ambiente
cp .env.example .env
# Editar .env conforme necessário

# Subir banco de dados (opcional - PostgreSQL)
docker-compose up -d postgres redis

# Rodar migrations
npx prisma migrate dev

# Popular seed
npx prisma db seed

# Gerar Prisma Client
npx prisma generate
```

## Execução

```bash
# Desenvolvimento
npm run start:dev

# Produção
npm run build
npm run start:prod
```

## Endpoints

### Autenticação
- `POST /api/v1/auth/register` - Registrar novo usuário
- `POST /api/v1/auth/login` - Login
- `POST /api/v1/auth/refresh` - Refresh token

### Usuários
- `GET /api/v1/users/me` - Perfil do usuário autenticado
- `GET /api/v1/users` - Listar usuários (MANAGER/ADMIN)
- `PATCH /api/v1/users/:id` - Atualizar usuário

### Mood Logs
- `POST /api/v1/mood-logs` - Criar mood log (+5 XP)
- `GET /api/v1/mood-logs/history` - Histórico de mood logs

### Desafios
- `GET /api/v1/challenges/daily` - Desafios disponíveis hoje
- `POST /api/v1/challenges/:id/complete` - Completar desafio
- `POST /api/v1/challenges` - Criar desafio (MANAGER/ADMIN)

### Analytics
- `GET /api/v1/analytics/mood-summary` - Resumo agregado de mood (MANAGER/ADMIN)

### Healthcheck
- `GET /api/v1/health` - Status da aplicação

## Credenciais de Teste

Após executar o seed:

- **Admin**: `admin@acme.com` / `password123`
- **Manager**: `manager@acme.com` / `password123`
- **Employee**: `joao@acme.com` / `password123`

## Testes

```bash
# Unit tests
npm run test

# E2E tests
npm run test:e2e

# Coverage
npm run test:cov
```

## Regras de Negócio

- **XP por mood log**: 5 XP
- **Fórmula de level**: `Math.floor(xp / 100) + 1`
- **Mood scale**: 1-5
- **Max tags por mood log**: 5
- **Roles**: EMPLOYEE < MANAGER < ADMIN
- **Multi-tenancy**: Queries filtradas por `companyId`

## Badges

- **Primeiro Passo**: Primeiro mood log
- **Consistente**: 7 dias consecutivos de check-in
- **Dedicado**: 30 dias consecutivos de check-in
- **Mestre do Bem-Estar**: 100 desafios completados

## Licença

ISC
