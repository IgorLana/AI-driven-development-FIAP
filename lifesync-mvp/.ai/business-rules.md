# Business Rules - LifeSync Platform

## 1. Regras de Negócio Explícitas

### 1.1 Autenticação e Autorização

**BR-AUTH-001: Métodos de Autenticação**
- O sistema DEVE suportar três métodos de autenticação:
  1. Email + Password (nativo)
  2. Google OAuth 2.0 (SSO)
  3. Azure AD / Microsoft 365 (SSO corporativo)

**BR-AUTH-002: Registro de Usuários**
- Novos usuários podem se registrar via:
  - Self-service (email/password)
  - Convite de HR Manager (email enviado)
  - SSO (criação automática na primeira autenticação)
- Email DEVE ser único por empresa (multi-tenancy)
- Password DEVE ter no mínimo 8 caracteres (se autenticação nativa)

**BR-AUTH-003: Hierarquia de Roles**
```
ADMIN > MANAGER > EMPLOYEE
```
- **EMPLOYEE**: Pode ler/escrever seus próprios dados (mood, challenges)
- **MANAGER**: Acesso a analytics agregados da empresa + permissões de EMPLOYEE
- **ADMIN**: Acesso total ao sistema + gerenciamento de tenants

**BR-AUTH-004: Isolamento de Dados (Multi-Tenancy)**
- Todas as queries DEVEM filtrar por `companyId`
- Um usuário NÃO PODE acessar dados de outra empresa
- Exceção: ADMIN do sistema pode acessar múltiplos tenants

---

### 1.2 Gamificação

**BR-GAME-001: Sistema de XP (Experience Points)**
- XP inicial: 0
- XP DEVE ser sempre >= 0 (não pode ser negativo)
- Fontes de XP:
  - Mood log diário: +5 XP
  - Completar desafio: +10 a +30 XP (variável por desafio)
  - Streak bonus: +5 XP a cada 7 dias consecutivos de check-in

**BR-GAME-002: Sistema de Níveis**
- Nível inicial: 1
- Fórmula: `Level = floor(XP / 100) + 1`
- Exemplos:
  - 0-99 XP = Nível 1
  - 100-199 XP = Nível 2
  - 200-299 XP = Nível 3
- Não há limite máximo de nível

**BR-GAME-003: Badges (Conquistas)**
- Badges são concedidos automaticamente ao atingir marcos:
  - "Primeiro Passo": Primeiro mood log
  - "Consistente": 7 dias consecutivos de check-in
  - "Dedicado": 30 dias consecutivos de check-in
  - "Mestre do Bem-Estar": 100 desafios completados
- Badges NÃO podem ser removidos após concedidos

**BR-GAME-004: Leaderboard**
- Ranking global por empresa (não cross-tenant)
- Ordenação por XP total (descendente)
- Atualização em tempo real (via Redis sorted set)
- Apenas top 100 exibidos no mobile

---

### 1.3 Mood Logs (Check-ins Emocionais)

**BR-MOOD-001: Escala de Humor**
- Escala de 1 a 5:
  - 1: Muito Ruim
  - 2: Ruim
  - 3: Neutro
  - 4: Bom
  - 5: Muito Bom
- Valor DEVE estar entre 1 e 5 (validação obrigatória)

**BR-MOOD-002: Frequência de Check-in**
- Um usuário PODE registrar apenas 1 mood log por dia
- Se tentar registrar novamente no mesmo dia, DEVE sobrescrever o anterior
- Timezone: UTC do servidor (conversão para timezone local no frontend)

**BR-MOOD-003: Tags Contextuais**
- Tags são opcionais
- Exemplos: "produtivo", "estressado", "motivado", "cansado"
- Máximo de 5 tags por mood log
- Tags são case-insensitive e armazenadas em lowercase

**BR-MOOD-004: Nota Adicional**
- Campo de texto livre (opcional)
- Máximo de 500 caracteres
- Sanitização obrigatória (prevenir XSS)

---

### 1.4 Desafios (Challenges)

**BR-CHAL-001: Tipos de Desafios**
- **Globais**: Criados pela plataforma, disponíveis para todas as empresas
- **Customizados**: Criados por MANAGER/ADMIN, específicos da empresa

**BR-CHAL-002: Categorias**
- PHYSICAL: Exercício, movimento, postura
- MENTAL: Meditação, mindfulness, foco
- SOCIAL: Interação com colegas, networking
- NUTRITION: Hidratação, alimentação saudável

**BR-CHAL-003: Recompensas de XP**
- XP reward DEVE ser > 0
- Range sugerido: 10-30 XP
- Desafios mais difíceis = mais XP (decisão do criador)

**BR-CHAL-004: Completar Desafios**
- Um usuário PODE completar o mesmo desafio apenas 1 vez por dia
- Ao completar:
  1. Marcar `completedAt` com timestamp
  2. Adicionar XP ao usuário
  3. Recalcular nível
  4. Verificar se ganhou badge
  5. Enviar notificação de sucesso

**BR-CHAL-005: Desafios do Dia**
- Endpoint `/challenges/daily` retorna desafios disponíveis
- Lógica:
  - Desafios globais (isGlobal = true)
  - + Desafios da empresa do usuário
  - Filtrar desafios já completados hoje
- Ordenação: Por categoria, depois por XP (descendente)

---

### 1.5 Analytics (Dashboard de RH)

**BR-ANALYTICS-001: Controle de Acesso**
- Apenas MANAGER e ADMIN podem acessar analytics
- EMPLOYEE recebe 403 Forbidden

**BR-ANALYTICS-002: Agregação de Dados**
- Dados DEVEM ser agregados (não individuais)
- Anonimização obrigatória:
  - Não exibir nomes de usuários
  - Apenas métricas: média, mediana, distribuição
- Mínimo de 5 usuários para exibir dados de um departamento (prevenir identificação)

**BR-ANALYTICS-003: Filtros Disponíveis**
- Por período (startDate, endDate)
- Por departamento (se implementado)
- Por categoria de desafio

**BR-ANALYTICS-004: Métricas Calculadas**
- **Mood médio**: média aritmética de todos os mood logs no período
- **Total de check-ins**: contagem de mood logs
- **Distribuição de humor**: % de cada valor (1-5)
- **Tendência**: comparação com período anterior
- **Taxa de engajamento**: (usuários ativos / total de usuários) * 100

---

## 2. Regras Implícitas (Inferidas do Contexto)

### 2.1 Gestão de Empresas

**BR-COMPANY-001: Criação de Empresa (Inferência)**
- Apenas ADMIN do sistema pode criar novas empresas
- Domain DEVE ser único (ex: "acme.com")
- Ao criar empresa, criar automaticamente um usuário MANAGER

**BR-COMPANY-002: Exclusão de Empresa (Inferência)**
- Empresa NÃO pode ser deletada se tiver usuários ativos
- Soft delete recomendado (marcar como inativa)

---

### 2.2 Notificações

**BR-NOTIF-001: Lembretes de Check-in (Inferência)**
- Enviar push notification diária às 18h (horário local do usuário)
- Apenas se o usuário NÃO fez check-in no dia
- Usuário pode desabilitar notificações nas configurações

**BR-NOTIF-002: Novos Desafios (Inferência)**
- Notificar usuários quando novos desafios são criados
- Apenas desafios da empresa do usuário
- Frequência máxima: 1 notificação por dia

**BR-NOTIF-003: Conquistas (Inferência)**
- Notificar imediatamente ao ganhar badge
- Notificar ao subir de nível

---

### 2.3 Privacidade e LGPD

**BR-PRIVACY-001: Consentimento (Inferência baseada em LGPD)**
- Usuário DEVE consentir com termos de uso no primeiro acesso
- Dados de humor são considerados dados sensíveis de saúde
- Usuário pode solicitar exportação de seus dados (LGPD Art. 18)
- Usuário pode solicitar exclusão de seus dados (direito ao esquecimento)

**BR-PRIVACY-002: Retenção de Dados (Inferência)**
- Mood logs: reter por 2 anos
- Dados de usuário inativo: anonimizar após 1 ano
- Logs de auditoria: reter por 5 anos (compliance)

---

## 3. Regras de Validação

### 3.1 Validação de Entrada

**BR-VAL-001: Email**
```typescript
- Formato válido (regex: RFC 5322)
- Máximo 255 caracteres
- Normalização: lowercase, trim
```

**BR-VAL-002: Password**
```typescript
- Mínimo 8 caracteres
- Máximo 128 caracteres
- Recomendado: 1 maiúscula, 1 minúscula, 1 número, 1 especial
- Não pode conter email do usuário
```

**BR-VAL-003: Nome de Usuário**
```typescript
- Mínimo 3 caracteres
- Máximo 100 caracteres
- Apenas letras, números, espaços, hífens
- Trim automático
```

**BR-VAL-004: Mood Value**
```typescript
- Tipo: Integer
- Range: 1-5 (inclusive)
- Obrigatório
```

**BR-VAL-005: Challenge Title**
```typescript
- Mínimo 5 caracteres
- Máximo 100 caracteres
- Não pode conter HTML
```

**BR-VAL-006: Challenge Description**
```typescript
- Mínimo 10 caracteres
- Máximo 500 caracteres
- Sanitização de HTML
```

---

### 3.2 Estados Válidos

**BR-STATE-001: User States**
```
ACTIVE → pode fazer login e usar o sistema
INACTIVE → não pode fazer login (soft delete)
PENDING → aguardando confirmação de email (se implementado)
```

**BR-STATE-002: Challenge States**
```
ACTIVE → disponível para usuários
ARCHIVED → não aparece em /challenges/daily
```

**BR-STATE-003: Company States**
```
ACTIVE → empresa ativa
SUSPENDED → empresa suspensa (usuários não podem fazer login)
TRIAL → período de trial (30 dias)
```

---

### 3.3 Transições Permitidas

**BR-TRANS-001: User State Transitions**
```
PENDING → ACTIVE (confirmação de email)
ACTIVE → INACTIVE (desativação por admin)
INACTIVE → ACTIVE (reativação por admin)
```

**BR-TRANS-002: Challenge State Transitions**
```
ACTIVE → ARCHIVED (apenas MANAGER/ADMIN)
ARCHIVED → ACTIVE (apenas MANAGER/ADMIN)
```

**BR-TRANS-003: Company State Transitions**
```
TRIAL → ACTIVE (conversão para pago)
TRIAL → SUSPENDED (trial expirado sem pagamento)
ACTIVE → SUSPENDED (inadimplência)
SUSPENDED → ACTIVE (regularização)
```

---

## 4. Regras de Consistência

### 4.1 Invariantes de Domínio

**BR-INV-001: User XP e Level**
```typescript
// Invariante: Level SEMPRE deve ser calculado a partir de XP
// Nunca atualizar Level manualmente
assert(user.level === Math.floor(user.xp / 100) + 1);
```

**BR-INV-002: Mood Log Único por Dia**
```typescript
// Invariante: Um usuário não pode ter 2 mood logs no mesmo dia
const existingLog = await findMoodLogByUserAndDate(userId, today);
if (existingLog) {
  // Sobrescrever ou retornar erro
}
```

**BR-INV-003: Challenge Completion**
```typescript
// Invariante: Um desafio só pode ser completado 1 vez por dia por usuário
const alreadyCompleted = await findUserChallenge(userId, challengeId, today);
if (alreadyCompleted) {
  throw new Error('Challenge already completed today');
}
```

**BR-INV-004: Multi-Tenancy**
```typescript
// Invariante: Todas as queries DEVEM filtrar por companyId
// Exceção: ADMIN do sistema
if (user.role !== 'SYSTEM_ADMIN') {
  query.where.companyId = user.companyId;
}
```

---

### 4.2 Restrições de Domínio

**BR-CONST-001: Email Único por Empresa**
```sql
UNIQUE INDEX idx_user_email_company ON users(email, company_id);
```

**BR-CONST-002: Company Domain Único**
```sql
UNIQUE INDEX idx_company_domain ON companies(domain);
```

**BR-CONST-003: XP Não-Negativo**
```sql
CHECK (xp >= 0);
```

**BR-CONST-004: Mood Range**
```sql
CHECK (mood >= 1 AND mood <= 5);
```

---

## 5. Casos Extremos (Edge Cases)

### 5.1 Concorrência

**BR-EDGE-001: Completar Desafio Simultâneo**
- **Cenário**: Usuário clica "Completar" 2 vezes rapidamente
- **Comportamento Esperado**:
  - Usar transação de banco de dados
  - Verificar se já completado DENTRO da transação
  - Retornar erro na segunda tentativa

**BR-EDGE-002: Atualização de XP Concorrente**
- **Cenário**: Usuário completa 2 desafios ao mesmo tempo
- **Comportamento Esperado**:
  - Usar `UPDATE users SET xp = xp + ? WHERE id = ?` (atomic)
  - Recalcular level após cada update
  - Notificar apenas 1 vez se subir de nível

---

### 5.2 Dados Inválidos

**BR-EDGE-003: Mood Log com Data Futura**
- **Cenário**: Cliente envia `loggedAt` no futuro
- **Comportamento Esperado**:
  - Validar que `loggedAt <= now()`
  - Retornar 400 Bad Request

**BR-EDGE-004: XP Negativo por Bug**
- **Cenário**: Bug causa XP negativo
- **Comportamento Esperado**:
  - Constraint de DB impede (CHECK xp >= 0)
  - Logar erro crítico
  - Alertar equipe de desenvolvimento

---

### 5.3 Falhas de Integração

**BR-EDGE-005: SSO Provider Indisponível**
- **Cenário**: Google OAuth está fora do ar
- **Comportamento Esperado**:
  - Retornar 503 Service Unavailable
  - Mensagem: "SSO provider temporarily unavailable. Try again later."
  - Fallback para email/password (se configurado)

**BR-EDGE-006: Redis Cache Indisponível**
- **Cenário**: Redis está fora do ar
- **Comportamento Esperado**:
  - Sistema DEVE continuar funcionando (degraded mode)
  - Buscar dados diretamente do PostgreSQL
  - Logar warning
  - Alertar equipe de DevOps

**BR-EDGE-007: S3 Storage Indisponível**
- **Cenário**: S3 está fora do ar
- **Comportamento Esperado**:
  - Upload de avatar retorna erro temporário
  - Exibir avatar padrão
  - Permitir retry

---

### 5.4 Limites e Quotas

**BR-EDGE-008: Rate Limiting**
- **Cenário**: Usuário faz 100 requests em 1 minuto
- **Comportamento Esperado**:
  - Limitar a 60 requests/minuto por IP
  - Retornar 429 Too Many Requests
  - Header: `Retry-After: 60`

**BR-EDGE-009: Tamanho de Payload**
- **Cenário**: Cliente envia payload > 1MB
- **Comportamento Esperado**:
  - Rejeitar com 413 Payload Too Large
  - Limite: 1MB para JSON, 5MB para uploads

**BR-EDGE-010: Número de Tags**
- **Cenário**: Usuário tenta adicionar 10 tags em mood log
- **Comportamento Esperado**:
  - Validar máximo de 5 tags
  - Retornar 400 Bad Request

---

### 5.5 Timezone e Horários

**BR-EDGE-011: Mudança de Fuso Horário**
- **Cenário**: Usuário viaja para outro timezone
- **Comportamento Esperado**:
  - Armazenar timestamps em UTC
  - Converter para timezone local no frontend
  - "Dia" é definido pelo timezone do usuário (armazenado no perfil)

**BR-EDGE-012: Horário de Verão**
- **Cenário**: Mudança de horário de verão
- **Comportamento Esperado**:
  - Usar biblioteca `date-fns-tz` para conversões
  - Não confiar em Date() do JavaScript

---

## 6. Regras de Auditoria

**BR-AUDIT-001: Operações Auditadas**
- Login/Logout
- Criação/Atualização/Exclusão de usuários
- Criação/Arquivamento de desafios
- Acesso a analytics (MANAGER/ADMIN)
- Mudanças de role

**BR-AUDIT-002: Informações Registradas**
```typescript
{
  userId: string,
  action: 'CREATE' | 'UPDATE' | 'DELETE' | 'READ',
  resource: 'User' | 'Challenge' | 'MoodLog' | 'Analytics',
  resourceId: string,
  changes: object, // antes/depois
  timestamp: Date,
  ipAddress: string,
  userAgent: string
}
```

**BR-AUDIT-003: Retenção de Logs de Auditoria**
- Mínimo: 5 anos (compliance)
- Armazenamento: Tabela separada ou serviço externo (CloudWatch)

---

## 7. Regras de Performance

**BR-PERF-001: Tempo de Resposta**
- API endpoints DEVEM responder em < 200ms (p95)
- Queries complexas (analytics) < 1s (p95)

**BR-PERF-002: Cache**
- Perfis de usuário: cache de 5 minutos
- Leaderboard: cache de 1 minuto
- Analytics: cache de 15 minutos

**BR-PERF-003: Paginação**
- Listas DEVEM ser paginadas
- Limite padrão: 20 itens
- Máximo: 100 itens por página

---

## Conclusão

Estas regras de negócio foram extraídas e formalizadas a partir do PDF do LifeSync. Elas servem como:

1. **Contrato**: Entre produto e engenharia
2. **Validação**: Critérios de aceitação para testes
3. **Documentação**: Referência para novos desenvolvedores
4. **Compliance**: Garantia de LGPD e segurança

Todas as regras devem ser implementadas e testadas. Exceções devem ser documentadas e aprovadas pelo Product Owner.
