# 📌 PROMPT DE REFATORAÇÃO GUIADA --- LifeSync Backend

Aja como um **Arquiteto de Software Sênior especializado em NestJS,
Clean Architecture, SOLID, Segurança de APIs, Escalabilidade e
Testabilidade**.

Você deve utilizar integralmente o arquivo **`relatorio_tecnico.md`**
como fonte oficial de diagnóstico técnico.

⚠️ REGRAS OBRIGATÓRIAS:

-   Não ignorar nenhum ponto do relatório.
-   Não propor melhorias genéricas fora do relatório.
-   Não remover funcionalidades existentes.
-   Não quebrar contratos públicos da API.
-   Trabalhar de forma incremental e estruturada.
-   Referenciar explicitamente cada seção do relatório ao implementar
    melhorias.

------------------------------------------------------------------------

# 🎯 OBJETIVO

Executar uma **refatoração completa e incremental**, cobrindo TODOS os
pontos descritos no:

-   Diagnóstico de Dívida Técnica
-   Violações de Arquitetura
-   Violações SOLID
-   Problemas de Acoplamento
-   Qualidade de Código
-   Testabilidade
-   Segurança
-   Performance
-   Organização Arquitetural
-   Plano de Refatoração Prioritário

------------------------------------------------------------------------

# 🔴 FASE 1 --- ALTA PRIORIDADE (Segurança e Riscos Críticos)

Implementar obrigatoriamente:

## 1️⃣ Corrigir Login Sem Isolamento de Empresa

(Seção 4 --- Segurança)

-   Alterar DTO de login
-   Exigir companyDomain ou companyId
-   Ajustar query Prisma
-   Garantir isolamento multi-tenant

------------------------------------------------------------------------

## 2️⃣ Implementar Rate Limiting

(Seção 4 --- Segurança)

-   Usar `@nestjs/throttler`
-   Aplicar em `/login` e `/register`
-   Configuração global adequada

------------------------------------------------------------------------

## 3️⃣ Implementar Revogação de Refresh Token

(Seção 1.2 + Seção 4)

-   Armazenar hash do refresh token no banco
-   Validar no refresh
-   Invalidar após uso
-   Implementar logout seguro
-   Atualizar `schema.prisma`
-   Explicar migration

------------------------------------------------------------------------

## 4️⃣ Tornar bcrypt configurável

(Seção 4 --- Segurança)

-   Remover rounds hardcoded
-   Usar variável `BCRYPT_ROUNDS`

------------------------------------------------------------------------

# 🟡 FASE 2 --- MÉDIA PRIORIDADE (Arquitetura e Desacoplamento)

Baseado nas seções:

-   1.2 Violações de Arquitetura
-   1.3 Violações SOLID
-   1.4 Acoplamento
-   6 Organização Arquitetural

Implementar:

## 5️⃣ Desacoplamento via EventEmitter

-   Criar eventos:
    -   MoodLogCreatedEvent
    -   ChallengeCompletedEvent
-   Remover dependência direta entre módulos
-   Aplicar Event-Driven Architecture

------------------------------------------------------------------------

## 6️⃣ Implementar Repository Pattern

Criar interfaces:

-   IUserRepository
-   IMoodLogRepository
-   IChallengeRepository

Requisitos:

-   Services dependem de abstrações
-   Implementações concretas usam Prisma
-   Uso de Injection Tokens

------------------------------------------------------------------------

## 7️⃣ Refatorar AuthService

-   Extrair TokenService
-   Aplicar Single Responsibility

------------------------------------------------------------------------

## 8️⃣ Eliminar Magic Strings

-   Substituir por enums (`Role`, `BadgeType`)
-   Aplicar Open/Closed Principle

------------------------------------------------------------------------

# 🟡 FASE 3 --- PERFORMANCE E ESCALABILIDADE

Baseado nas seções:

-   5 Performance
-   2 Qualidade de Código

Implementar:

## 9️⃣ Refatorar AnalyticsService

-   Substituir agregação em memória por SQL (`AVG`, `COUNT`, `GROUP BY`)
-   Usar `$queryRaw` se necessário

------------------------------------------------------------------------

## 🔟 Implementar Cache Redis

-   Usar `ioredis` já instalado
-   Cachear `getMoodSummary`
-   TTL 5 minutos
-   Invalidar cache ao criar MoodLog

------------------------------------------------------------------------

## 1️⃣1️⃣ Migrar SQLite → PostgreSQL

-   Atualizar `schema.prisma`
-   Criar docker-compose
-   Ajustar variáveis de ambiente
-   Explicar impactos

------------------------------------------------------------------------

# 🟢 FASE 4 --- TESTABILIDADE

Baseado na Seção 3 --- Testabilidade

Implementar:

-   Testes unitários para:
    -   AuthService
    -   MoodLogsService
    -   GamificationService
-   Mock via interfaces (não classes concretas)
-   Mock de DateService
-   Testes de sucesso e falha
-   Testes de edge cases

Criar estrutura:

test/ unit/ integration/ e2e/

------------------------------------------------------------------------

# 🟢 FASE 5 --- CLEAN CODE E MANUTENIBILIDADE

Baseado nas seções:

-   1.1 Code Smells
-   2 Qualidade do Código

Implementar:

-   Remover todos os `any`
-   Criar interface `AuthenticatedUser`
-   Adicionar `readonly` nas injeções
-   Extrair helpers duplicados (tagsToString / stringToTags)
-   Implementar logging estruturado JSON
-   Remover dependências não utilizadas
-   Implementar cursor-based pagination
-   Resolver stub do NotificationsService

------------------------------------------------------------------------

# 📌 ESTRUTURA OBRIGATÓRIA DE RESPOSTA

Para cada fase:

1️⃣ Itens do relatório sendo tratados (referenciar seção)\
2️⃣ Estratégia de refatoração\
3️⃣ Código completo atualizado por arquivo\
4️⃣ Impacto arquitetural\
5️⃣ Princípios SOLID aplicados\
6️⃣ Ganhos em segurança, performance ou testabilidade

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
-   Escalabilidade ≥ 8/10
-   Testabilidade ≥ 7/10

------------------------------------------------------------------------

Este prompt deve usar EXCLUSIVAMENTE os pontos do `relatorio_tecnico.md`
como base de decisão.
