# 🔎 Diagnóstico Completo de Dívida Técnica e Arquitetura

Aja como um **Arquiteto de Software Sênior e Especialista em Clean Code,
SOLID e Arquitetura de Sistemas**.

Sua tarefa é realizar uma **análise profunda do projeto fornecido**,
gerando um **Relatório Técnico Estruturado de Dívida Técnica e Qualidade
Arquitetural**.

------------------------------------------------------------------------

# 1️⃣ Diagnóstico de Dívida Técnica

## 1.1 Code Smells

Identifique e explique:

-   Métodos excessivamente longos
-   Classes com múltiplas responsabilidades
-   Nomes pouco descritivos
-   Métodos com alta complexidade ciclomática
-   Código duplicado
-   Comentários desnecessários ou que indicam código confuso
-   Uso incorreto de exceções
-   Uso excessivo de `if/else` ao invés de polimorfismo
-   Classes "Deus" (God Objects)

Para cada ocorrência: - Arquivo - Linha (se possível) - Problema
identificado - Impacto técnico - Sugestão de refatoração

------------------------------------------------------------------------

## 1.2 Violações de Arquitetura

Verifique:

-   Lógica de negócio dentro de Controllers
-   Acesso a banco fora da camada de repositório
-   Violação do padrão MVC
-   Dependência direta entre camadas
-   Ausência de interfaces para abstração
-   Falta de separação entre domínio e infraestrutura
-   Inversão de dependência mal aplicada

Explique: - Qual padrão está sendo violado - Por que isso é
problemático - Como corrigir

------------------------------------------------------------------------

## 1.3 Violação dos Princípios SOLID

Analise cada princípio separadamente:

-   S -- Single Responsibility
-   O -- Open/Closed
-   L -- Liskov Substitution
-   I -- Interface Segregation
-   D -- Dependency Inversion

Para cada violação: - Classe envolvida - Tipo de violação -
Consequência - Refatoração recomendada

------------------------------------------------------------------------

## 1.4 Acoplamento e Coesão

Analise:

-   Dependências desnecessárias
-   Alto acoplamento entre classes
-   Baixa coesão interna
-   Dependência concreta ao invés de abstração
-   Uso incorreto de @Autowired
-   Falta de injeção por construtor

Classifique o nível de acoplamento: - Baixo - Médio - Alto - Crítico

------------------------------------------------------------------------

# 2️⃣ Qualidade do Código

Avalie:

-   Padronização de nomenclatura
-   Organização de pacotes
-   Estrutura de camadas
-   Clareza da regra de negócio
-   Uso adequado de DTOs
-   Uso adequado de records (se aplicável)
-   Tratamento de exceções global
-   Logging estruturado
-   Uso correto de Optional
-   Uso moderno da linguagem (Streams, Lambdas, etc.)

Identifique também:

-   Uso de código legado
-   Uso de APIs obsoletas
-   Padrões antigos que poderiam ser modernizados

------------------------------------------------------------------------

# 3️⃣ Testabilidade

Analise:

-   Existência de testes unitários
-   Cobertura aproximada
-   Uso correto de Mockito
-   Testes frágeis
-   Dependências difíceis de mockar
-   Código difícil de testar

Aponte: - Classes não testáveis - Métodos com forte dependência
externa - Sugestões para melhorar testabilidade

------------------------------------------------------------------------

# 4️⃣ Segurança

Verifique:

-   Exposição indevida de dados sensíveis
-   Problemas de autenticação/autorização
-   Uso incorreto de JWT
-   Validação insuficiente de entrada
-   Possível SQL Injection
-   Falta de sanitização
-   Exposição de stacktrace

Classifique riscos: - Baixo - Médio - Alto - Crítico

------------------------------------------------------------------------

# 5️⃣ Performance e Escalabilidade

Analise:

-   Consultas ineficientes
-   N+1 queries
-   Falta de paginação
-   Carregamento excessivo de entidades
-   Uso incorreto de Lazy/Eager
-   Operações síncronas bloqueantes
-   Falta de cache

Sugira melhorias práticas.

------------------------------------------------------------------------

# 6️⃣ Organização Arquitetural

Avalie:

-   Se a arquitetura está próxima de:
    -   Clean Architecture
    -   Hexagonal
    -   Layered Architecture tradicional
-   Se há mistura entre domínio e infraestrutura
-   Se existe separação clara entre regras de negócio e framework

Sugira: - Melhor modelo arquitetural para o projeto - Estrutura ideal de
pacotes - Possível evolução futura

------------------------------------------------------------------------

# 7️⃣ Score Geral do Projeto

Forneça:

-   Nota de 0 a 10 para:
    -   Qualidade do Código
    -   Arquitetura
    -   Manutenibilidade
    -   Escalabilidade
    -   Segurança
-   Diagnóstico final
-   Nível do projeto:
    -   Iniciante
    -   Júnior
    -   Pleno
    -   Sênior

------------------------------------------------------------------------

# 8️⃣ Plano de Refatoração Prioritário

Crie um plano dividido em:

-   🔴 Alta prioridade
-   🟡 Média prioridade
-   🟢 Baixa prioridade

Com estimativa qualitativa de esforço: - Baixo - Médio - Alto

------------------------------------------------------------------------

# FORMATO DE RESPOSTA

O relatório deve ser:

-   Estruturado em tópicos
-   Objetivo e técnico
-   Sem respostas genéricas
-   Baseado em evidências do código
-   Com exemplos concretos
-   Com sugestões claras de melhoria
