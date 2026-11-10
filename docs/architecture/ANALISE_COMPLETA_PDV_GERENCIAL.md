# ANÁLISE COMPLETA - SISTEMA DE VENDAS INTERNO (PDV GERENCIAL)

**Documento de Análise Técnica, Segurança, Boas Práticas e Documentação Arquitetural**

**Data**: Dezembro 2025  
**Versão**: 1.0  
**Autor**: Manus AI - Equipe de Arquitetura e Segurança  
**Classificação**: Confidencial

---

## ÍNDICE

1. [Análise Técnica Completa](#análise-técnica-completa)
2. [Pesquisa de Mercado e Benchmarking](#pesquisa-de-mercado-e-benchmarking)
3. [Análise de Segurança (Cyber Security)](#análise-de-segurança-cyber-security)
4. [Análise de Boas Práticas e Melhorias](#análise-de-boas-práticas-e-melhorias)
5. [Documentação Arquitetural (PM/PO)](#documentação-arquitetural-pmpo)
6. [Prompt Completo para IA/DEV](#prompt-completo-para-iadev)

---

## ANÁLISE TÉCNICA COMPLETA

### 1.1 Visão Geral do Projeto

O **Sistema de Vendas Interno (PDV Gerencial)** é uma aplicação web moderna construída com uma arquitetura **Monolito Modular**, projetada para gerenciar operações de ponto de venda, estoque, devoluções e fechamento de caixa. O projeto utiliza tecnologias contemporâneas e segue padrões de desenvolvimento profissional.

**Métricas do Projeto:**
- **Linhas de Código**: ~5.964 linhas (Back-end + Front-end)
- **Componentes React**: 72 componentes
- **Módulos tRPC**: 6 módulos (Auth, PDV, Estoque, Relatórios, Devoluções, Fechamento)
- **Tabelas de Banco de Dados**: 12 tabelas
- **Stack**: React 19 + Node.js + Express + tRPC + Drizzle ORM + TiDB/MySQL

### 1.2 Arquitetura do Sistema

#### 1.2.1 Estrutura de Camadas

```
┌─────────────────────────────────────────────────────────────┐
│                    FRONT-END (React/Next.js)                │
│  - Login | PDV | Dashboard | Devoluções | Fechamento Caixa │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│              tRPC Client (Type-Safe RPC Layer)              │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│              API Gateway (Express + tRPC)                   │
│  /api/trpc - Roteamento de Procedimentos                    │
│  /api/oauth/callback - Autenticação OAuth                   │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│         MONOLITO MODULAR (Back-end em Processo)             │
│  ┌─────────────────────────────────────────────────────┐    │
│  │ Módulo 1: Autenticação (C4)                         │    │
│  │ - Login/Logout, JWT, RBAC, Permissões              │    │
│  └─────────────────────────────────────────────────────┘    │
│  ┌─────────────────────────────────────────────────────┐    │
│  │ Módulo 2: PDV (C1)                                  │    │
│  │ - Consulta Produtos, Carrinho, Vendas              │    │
│  └─────────────────────────────────────────────────────┘    │
│  ┌─────────────────────────────────────────────────────┐    │
│  │ Módulo 3: Estoque (C2)                              │    │
│  │ - Movimentações, Alertas, Fichas Técnicas          │    │
│  └─────────────────────────────────────────────────────┘    │
│  ┌─────────────────────────────────────────────────────┐    │
│  │ Módulo 4: Relatórios (C3)                           │    │
│  │ - Vendas, Margem, Estoque, Performance             │    │
│  └─────────────────────────────────────────────────────┘    │
│  ┌─────────────────────────────────────────────────────┐    │
│  │ Módulo 5: Devoluções                                │    │
│  │ - Processamento, Reembolso, Aprovação              │    │
│  └─────────────────────────────────────────────────────┘    │
│  ┌─────────────────────────────────────────────────────┐    │
│  │ Módulo 6: Fechamento de Caixa                       │    │
│  │ - Conciliação, Discrepâncias, Histórico            │    │
│  └─────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│    Camada de Dados (Drizzle ORM + TiDB/MySQL)              │
│  - Query Builders Type-Safe                                │
│  - Migrations Automáticas                                  │
│  - Relações entre Entidades                                │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│              Banco de Dados (TiDB/MySQL)                    │
│  - 12 Tabelas Relacionais                                  │
│  - Índices para Performance                                │
│  - Constraints de Integridade                              │
└─────────────────────────────────────────────────────────────┘
```

#### 1.2.2 Fluxo de Dados - Exemplo: Processamento de Venda

```
1. Usuário seleciona produtos no PDV (Front-end)
   ↓
2. Clica em "Finalizar Venda"
   ↓
3. tRPC Client chama pdv.processSale({items, paymentMethod})
   ↓
4. Express recebe requisição em /api/trpc
   ↓
5. Middleware de Autenticação valida JWT
   ↓
6. Procedimento tRPC (protectedProcedure) executa:
   - pdvService.validateCart() [verifica estoque]
   - createSale() [insere venda no BD]
   - addSaleItem() [insere itens da venda]
   - recordStockMovement() [registra saída de estoque]
   ↓
7. Resposta retorna para Front-end com ID da venda
   ↓
8. Front-end exibe confirmação e popup de impressão
```

### 1.3 Banco de Dados - Schema Relacional

| Tabela | Propósito | Registros | Relacionamentos |
|--------|-----------|-----------|-----------------|
| `users` | Usuários e autenticação | ~100 | 1:N com sales, returns, productions |
| `products` | Catálogo de produtos | ~1000 | 1:N com saleItems, stockMovements |
| `sales` | Transações de venda | ~10K | 1:N com saleItems, returns |
| `saleItems` | Itens de cada venda | ~50K | N:1 com sales, products |
| `stockMovements` | Histórico de estoque | ~20K | N:1 com products |
| `recipies` | Fichas técnicas/receitas | ~100 | 1:N com recipeItems, productions |
| `recipeItems` | Ingredientes de receitas | ~500 | N:1 com recipies, products |
| `permissions` | Permissões por role | ~50 | Lookup table |
| `returns` | Devoluções de produtos | ~1K | 1:N com returnItems, N:1 com sales |
| `returnItems` | Itens devolvidos | ~5K | N:1 com returns, products |
| `cashClosures` | Fechamentos diários | ~365 | N:1 com users |
| `cashMovements` | Entradas/saídas de caixa | ~5K | N:1 com users |
| `productions` | Registros de produção | ~2K | N:1 com recipies, users |

### 1.4 Stack Tecnológico - Análise Detalhada

**Front-end:**
- **React 19.1.1**: Framework UI moderno com hooks e concurrent features
- **Next.js**: Não utilizado (apenas React puro com Vite)
- **Vite 7.1.7**: Bundler rápido com HMR (Hot Module Replacement)
- **Tailwind CSS 4.1.14**: Utility-first CSS framework
- **shadcn/ui**: Componentes acessíveis baseados em Radix UI
- **Wouter 3.3.5**: Router leve e type-safe
- **React Hook Form 7.64.0**: Gerenciamento de formulários
- **Recharts 2.15.2**: Gráficos e visualizações
- **Lucide React 0.453.0**: Ícones SVG

**Back-end:**
- **Node.js + Express 4.21.2**: Servidor HTTP
- **tRPC 11.6.0**: RPC type-safe com TypeScript
- **Drizzle ORM 0.44.5**: ORM type-safe com migrações
- **MySQL2 3.15.0**: Driver MySQL
- **Jose 6.1.0**: JWT (JSON Web Tokens)
- **Superjson 1.13.3**: Serialização de tipos complexos

**Banco de Dados:**
- **TiDB/MySQL**: Banco relacional compatível com MySQL
- **Drizzle Kit 0.31.4**: Migrations e schema management

**DevOps & Tooling:**
- **TypeScript 5.9.3**: Tipagem estática
- **Vitest 2.1.4**: Testes unitários
- **Prettier 3.6.2**: Code formatter
- **ESBuild 0.25.0**: Bundler para produção
- **pnpm 10.15.1**: Package manager (melhor performance)

### 1.5 Funcionalidades Implementadas

| Módulo | Funcionalidade | Status | Observações |
|--------|---|---|---|
| **Autenticação** | Login OAuth | ✅ Completo | Integrado com Manus OAuth |
| | RBAC (Role-Based Access Control) | ✅ Completo | 5 roles: user, admin, operator, manager, accountant |
| | JWT Tokens | ✅ Completo | Expiração configurável |
| | Logout | ✅ Completo | Limpeza de sessão |
| **PDV** | Listagem de produtos | ✅ Completo | Busca em tempo real |
| | Carrinho de compras | ✅ Completo | Validação de estoque |
| | Processamento de venda | ✅ Completo | Transação atômica |
| | Cálculo de margem | ✅ Completo | Margem por item |
| **Estoque** | Movimentações (entrada/saída) | ✅ Completo | Tipos: in, out, adjustment, loss |
| | Alertas de estoque mínimo | ✅ Completo | Configurável por produto |
| | Histórico de movimentações | ✅ Completo | Rastreabilidade completa |
| **Relatórios** | Vendas por período | ✅ Completo | Filtros: data, operador, produto |
| | Margem de lucro | ✅ Completo | Análise por produto |
| | Performance por operador | ✅ Completo | Ticket médio, total vendido |
| | Picos de venda | ✅ Completo | Análise por hora do dia |
| **Devoluções** | Processamento de devoluções | ✅ Completo | Status: pending, approved, rejected, completed |
| | Reembolso automático | ✅ Completo | Reversão de estoque |
| | Aprovação por gerente | ✅ Completo | Workflow de aprovação |
| **Fechamento** | Fechamento diário | ✅ Completo | Conciliação de saldo |
| | Discrepâncias | ✅ Completo | Alertas automáticos |
| | Histórico | ✅ Completo | Auditoria de fechamentos |
| **Fichas Técnicas** | Schema criado | ✅ Completo | Tabelas: recipies, recipeItems |
| | Helpers DB | ✅ Completo | Funções de consulta |
| | Endpoints tRPC | ❌ Não implementado | Próxima fase |
| | Interface Front-end | ❌ Não implementado | Próxima fase |

---

## PESQUISA DE MERCADO E BENCHMARKING

### 2.1 Análise de Concorrentes Principais

#### MarketUP
- **Posicionamento**: Melhor opção gratuita
- **Funcionalidades**: PDV mobile, emissão fiscal, integração completa
- **Vantagens**: Gratuito, suporte técnico, atualizações contínuas
- **Público**: Pequenos e médios empreendedores
- **Gap vs. seu sistema**: Inclui emissão fiscal (você excluiu propositalmente)

#### Linx
- **Posicionamento**: Melhor para grandes redes varejistas
- **Funcionalidades**: ERP integrado, compliance, controle financeiro avançado
- **Vantagens**: Escalabilidade, integração ERP, atendimento eficiente
- **Público**: Grandes redes varejistas
- **Gap vs. seu sistema**: Mais robusto para enterprise, você é mais ágil

#### VHSYS
- **Posicionamento**: Solução completa e integrada
- **Funcionalidades**: PDV online, gestão unificada, emissão fiscal
- **Vantagens**: Agilidade, controle financeiro, integração física+online
- **Público**: Pequenos e médios comércios
- **Gap vs. seu sistema**: Muito similar, mas você é mais moderno (React)

#### Bling
- **Posicionamento**: Melhor custo-benefício para e-commerce + varejo
- **Funcionalidades**: 100% online, mobilidade, customizável
- **Vantagens**: Facilidade, redução de custos, personalização
- **Público**: Pequenos comércios, e-commerce
- **Gap vs. seu sistema**: Você é mais completo em relatórios gerenciais

#### Square
- **Posicionamento**: Solução versátil para múltiplos negócios
- **Funcionalidades**: Compatível com diversos tipos de negócio
- **Vantagens**: Flexibilidade, integração de pagamentos
- **Público**: Diversos tipos de negócio
- **Gap vs. seu sistema**: Você é mais especializado em varejo/food

#### Toast
- **Posicionamento**: Especializado em restaurantes
- **Funcionalidades**: Otimizado para food service
- **Vantagens**: Especialização vertical
- **Público**: Restaurantes
- **Gap vs. seu sistema**: Você é mais genérico, ele é mais específico

### 2.2 Tendências do Mercado 2025

1. **Omnichannel**: Integração perfeita entre vendas online e offline
2. **Mobilidade**: Sistemas em tablets e smartphones
3. **Cloud-based**: 100% na nuvem (seu sistema já é)
4. **Integração com pagamentos**: Stripe, Square, PayPal nativa
5. **Relatórios em tempo real**: Analytics e BI
6. **Customização**: Adaptação às necessidades específicas
7. **Compliance automático**: Emissão de notas integrada
8. **Gestão de estoque inteligente**: Alertas automáticos
9. **Suporte multi-moeda**: Operações internacionais
10. **Segurança e conformidade**: LGPD, PCI-DSS

### 2.3 Gap Analysis - Seu Sistema vs. Mercado

| Funcionalidade | Seu Sistema | Mercado | Prioridade |
|---|---|---|---|
| PDV rápido e intuitivo | ✅ Sim | ✅ Sim | Alta |
| Gestão de estoque | ✅ Sim | ✅ Sim | Alta |
| Relatórios financeiros | ✅ Sim | ✅ Sim | Alta |
| Integração pagamentos | ❌ Não | ✅ Sim | **Crítica** |
| Emissão de notas fiscais | ❌ Excluído | ✅ Sim | Média |
| Suporte multi-moeda | ❌ Não | ✅ Sim | **Alta** |
| Aplicativo mobile nativo | ❌ Não | ✅ Sim | Média |
| Integração e-commerce | ❌ Não | ✅ Sim | Média |
| Relatórios PDF/Excel | ❌ Não | ✅ Sim | Média |
| Backup automático | ❌ Não | ✅ Sim | Alta |
| Suporte multi-loja | ❌ Não | ✅ Sim | Média |
| Analytics avançado | ⚠️ Básico | ✅ Avançado | Média |
| Integração fornecedores | ❌ Não | ✅ Sim | Baixa |

---

## ANÁLISE DE SEGURANÇA (CYBER SECURITY)

### 3.1 Vulnerabilidades Identificadas

#### 🔴 CRÍTICAS

**1. Falta de Validação de Entrada em Alguns Endpoints**
- **Localização**: `server/modules/pdv/router.ts`, `server/modules/stock/router.ts`
- **Problema**: Alguns endpoints não validam completamente os dados de entrada com Zod
- **Risco**: Injection attacks, dados inválidos no banco
- **Exemplo**:
  ```typescript
  // ❌ Ruim - sem validação
  async processSale(items: Array<{ productId: number; quantity: number }>) {
    // Processa diretamente sem validação
  }
  
  // ✅ Bom - com validação Zod
  const saleSchema = z.object({
    items: z.array(z.object({
      productId: z.number().positive(),
      quantity: z.number().positive().int(),
    })),
    paymentMethod: z.string().min(1),
  });
  ```
- **Recomendação**: Implementar validação Zod em todos os endpoints tRPC

**2. Ausência de Rate Limiting**
- **Localização**: `server/_core/index.ts`
- **Problema**: Sem proteção contra brute force ou DDoS
- **Risco**: Ataque de força bruta em login, consumo de recursos
- **Recomendação**: Implementar middleware de rate limiting (express-rate-limit)

**3. Falta de CORS Explícito**
- **Localização**: `server/_core/index.ts`
- **Problema**: CORS não está configurado explicitamente
- **Risco**: Requisições cross-origin não autorizadas
- **Recomendação**:
  ```typescript
  import cors from 'cors';
  app.use(cors({
    origin: process.env.ALLOWED_ORIGINS?.split(',') || ['https://yourdomain.com'],
    credentials: true,
  }));
  ```

**4. Cookies com SameSite=none**
- **Localização**: `server/_core/cookies.ts` (linha 45)
- **Problema**: `sameSite: "none"` permite requisições cross-site
- **Risco**: CSRF (Cross-Site Request Forgery) attacks
- **Código Vulnerável**:
  ```typescript
  return {
    httpOnly: true,
    path: "/",
    sameSite: "none",  // ❌ VULNERÁVEL
    secure: isSecureRequest(req),
  };
  ```
- **Recomendação**:
  ```typescript
  return {
    httpOnly: true,
    path: "/",
    sameSite: "strict",  // ✅ Seguro
    secure: isSecureRequest(req),
  };
  ```

#### 🟠 ALTAS

**5. Falta de Validação de Autorização em Operações Sensíveis**
- **Localização**: Múltiplos endpoints
- **Problema**: Alguns endpoints usam `protectedProcedure` mas não validam se o usuário tem permissão específica
- **Risco**: Usuário comum pode executar ações de gerente/admin
- **Exemplo**:
  ```typescript
  // ❌ Ruim - qualquer usuário autenticado pode aprovar devolução
  approveReturn: protectedProcedure.input(z.object({ returnId: z.number() }))
    .mutation(async ({ input }) => {
      // Aprova sem verificar se é gerente
    });
  
  // ✅ Bom - apenas gerentes podem aprovar
  approveReturn: protectedProcedure
    .use(async ({ ctx, next }) => {
      if (ctx.user?.role !== 'manager' && ctx.user?.role !== 'admin') {
        throw new TRPCError({ code: 'FORBIDDEN' });
      }
      return next({ ctx });
    })
    .input(z.object({ returnId: z.number() }))
    .mutation(async ({ input }) => {
      // Aprova com validação
    });
  ```
- **Recomendação**: Implementar middleware de autorização granular

**6. Falta de Logging e Auditoria**
- **Localização**: Todo o projeto
- **Problema**: Sem logs de ações sensíveis (vendas, devoluções, fechamento)
- **Risco**: Impossível rastrear quem fez o quê e quando
- **Recomendação**: Implementar sistema de auditoria com tabela `auditLogs`

**7. Exposição de Detalhes de Erro**
- **Localização**: `server/_core/oauth.ts` (linha 49)
- **Problema**: Erros são logados no console sem tratamento
- **Risco**: Exposição de informações sensíveis em logs
- **Código Vulnerável**:
  ```typescript
  } catch (error) {
    console.error("[OAuth] Callback failed", error);  // ❌ Expõe detalhes
    res.status(500).json({ error: "OAuth callback failed" });
  }
  ```
- **Recomendação**:
  ```typescript
  } catch (error) {
    logger.error("[OAuth] Callback failed", { userId: req.user?.id });
    res.status(500).json({ error: "An error occurred" });  // ✅ Genérico
  }
  ```

#### 🟡 MÉDIAS

**8. Falta de Validação de Quantidade em Vendas**
- **Localização**: `server/modules/pdv/router.ts`
- **Problema**: Quantidade pode ser negativa ou zero
- **Risco**: Vendas inválidas, manipulação de estoque
- **Recomendação**: Validar com `z.number().positive().int()`

**9. Ausência de Proteção contra Manipulação de Preços**
- **Localização**: `server/modules/pdv/router.ts`
- **Problema**: Preço não é validado contra o preço do banco
- **Risco**: Usuário malicioso pode alterar preço na requisição
- **Recomendação**: Sempre buscar preço do banco, não aceitar do cliente

**10. Falta de Criptografia de Dados Sensíveis**
- **Localização**: Banco de dados
- **Problema**: Dados como email não são criptografados
- **Risco**: Exposição de PII (Personally Identifiable Information)
- **Recomendação**: Implementar criptografia para campos sensíveis

**11. Ausência de HTTPS Enforcement**
- **Localização**: `server/_core/cookies.ts`
- **Problema**: Em desenvolvimento, HTTPS não é obrigatório
- **Risco**: Interceptação de sessão em desenvolvimento
- **Recomendação**: Forçar HTTPS em produção

**12. Falta de Validação de Integridade de Dados**
- **Localização**: Transações de venda
- **Problema**: Sem checksum ou hash para validar integridade
- **Risco**: Dados corrompidos não são detectados
- **Recomendação**: Implementar checksums para transações críticas

### 3.2 Resumo de Vulnerabilidades

| Severidade | Quantidade | Exemplos |
|---|---|---|
| 🔴 Crítica | 4 | Falta validação, sem rate limiting, CORS, SameSite=none |
| 🟠 Alta | 3 | Falta autorização granular, sem auditoria, exposição de erro |
| 🟡 Média | 5 | Validação de quantidade, preços, criptografia, HTTPS, integridade |

**Total de Vulnerabilidades**: 12

### 3.3 Recomendações de Segurança Prioritárias

1. **Implementar Rate Limiting** (Semana 1)
2. **Corrigir SameSite Cookie** (Semana 1)
3. **Adicionar Validação Zod Completa** (Semana 1)
4. **Implementar Autorização Granular** (Semana 2)
5. **Adicionar Sistema de Auditoria** (Semana 2)
6. **Configurar CORS Explícito** (Semana 1)
7. **Implementar Logging Seguro** (Semana 2)
8. **Adicionar Criptografia de Dados Sensíveis** (Semana 3)
9. **Validar Preços no Back-end** (Semana 1)
10. **Implementar Checksums para Transações** (Semana 3)

---

## ANÁLISE DE BOAS PRÁTICAS E MELHORIAS

### 4.1 Padrões de Código - Análise

#### ✅ BOAS PRÁTICAS IMPLEMENTADAS

1. **Type Safety com TypeScript**
   - Uso consistente de tipos
   - Interfaces bem definidas
   - Generics para reutilização

2. **Modularização Clara**
   - Separação de responsabilidades
   - Módulos independentes
   - Comunicação in-process

3. **Validação com Zod**
   - Schema validation em alguns endpoints
   - Type inference automático

4. **tRPC para Type Safety End-to-End**
   - Tipos compartilhados entre Front e Back
   - Autocomplete automático
   - Erro handling centralizado

5. **Drizzle ORM**
   - Queries type-safe
   - Migrations automáticas
   - Sem SQL strings vulneráveis

#### ❌ ANTI-PATTERNS E MELHORIAS NECESSÁRIAS

**1. Falta de Camada de Serviço Consistente**
- **Problema**: Lógica de negócio espalhada entre routers e helpers
- **Exemplo Ruim**:
  ```typescript
  // ❌ Lógica no router
  pdvRouter.processSale.mutation(async ({ input, ctx }) => {
    const validation = await pdvService.validateCart(input.items);
    if (!validation.isValid) throw new Error(...);
    const sale = await createSale(...);
    // ... mais lógica aqui
  });
  ```
- **Exemplo Bom**:
  ```typescript
  // ✅ Lógica em serviço
  pdvRouter.processSale.mutation(async ({ input, ctx }) => {
    return await pdvService.processSale(input, ctx.user);
  });
  ```

**2. Falta de Error Handling Centralizado**
- **Problema**: Try-catch espalhados, sem padrão
- **Recomendação**: Implementar error middleware

**3. Ausência de Testes Unitários**
- **Problema**: Sem cobertura de testes
- **Recomendação**: Implementar vitest para lógica crítica

**4. Falta de Documentação de API**
- **Problema**: Sem OpenAPI/Swagger
- **Recomendação**: Gerar documentação automática

**5. Ausência de Paginação em Queries**
- **Problema**: Queries podem retornar muitos registros
- **Recomendação**: Implementar limit/offset em todas as listas

**6. Falta de Caching**
- **Problema**: Sem Redis ou cache em memória
- **Recomendação**: Cachear produtos, permissões, relatórios

**7. Ausência de Transações Explícitas**
- **Problema**: Operações multi-tabela sem transação
- **Recomendação**: Usar transações Drizzle

**8. Falta de Versionamento de API**
- **Problema**: Sem versão de API
- **Recomendação**: Implementar `/api/v1/`, `/api/v2/`

### 4.2 Melhorias de Performance

| Área | Problema | Solução | Impacto |
|---|---|---|---|
| **Queries** | Sem índices otimizados | Adicionar índices em FK | Alto |
| **Cache** | Sem cache | Implementar Redis | Alto |
| **Paginação** | Sem limite de registros | Adicionar limit/offset | Médio |
| **Lazy Loading** | Carrega tudo de uma vez | Implementar lazy loading | Médio |
| **Compressão** | Sem gzip | Ativar compressão | Baixo |
| **Bundle** | Sem tree-shaking | Otimizar imports | Médio |

### 4.3 Melhorias de Manutenibilidade

1. **Adicionar Testes Unitários**
   - Cobertura mínima: 70%
   - Foco em lógica crítica (vendas, estoque)

2. **Documentação de Código**
   - JSDoc para funções públicas
   - README para cada módulo

3. **Logging Estruturado**
   - Usar Winston ou Pino
   - Diferentes níveis: debug, info, warn, error

4. **Configuração Centralizada**
   - Arquivo de config único
   - Variáveis de ambiente validadas

5. **Versionamento Semântico**
   - Seguir SemVer
   - Changelog automático

---

## DOCUMENTAÇÃO ARQUITETURAL (PM/PO)

### 5.1 Visão de Negócio

O **Sistema de Vendas Interno (PDV Gerencial)** é uma plataforma de software para gerenciar operações de varejo, com foco em:

- **Agilidade**: PDV rápido e intuitivo para vendedores
- **Controle**: Visibilidade total sobre estoque e vendas
- **Análise**: Relatórios gerenciais para tomada de decisão
- **Conformidade**: Rastreabilidade completa de transações

**Público-Alvo:**
- Pequenas e médias empresas de varejo
- Restaurantes e food service
- Lojas de conveniência
- Supermercados pequenos

**Diferencial Competitivo:**
- Arquitetura moderna e escalável
- Interface intuitiva otimizada para toque
- Modularização interna para fácil manutenção
- Relatórios gerenciais em tempo real

### 5.2 Requisitos Funcionais Principais

#### RF1: Autenticação e Controle de Acesso
- **Descrição**: Sistema de login seguro com controle de permissões
- **Atores**: Operador, Gerente, Contador, Admin
- **Fluxo Principal**:
  1. Usuário acessa login
  2. Sistema redireciona para OAuth
  3. Usuário autentica
  4. Sistema cria sessão JWT
  5. Usuário acessa sistema conforme seu role

#### RF2: Ponto de Venda (PDV)
- **Descrição**: Interface para processar vendas de forma rápida
- **Atores**: Operador
- **Fluxo Principal**:
  1. Operador busca produto
  2. Adiciona ao carrinho
  3. Valida estoque
  4. Processa pagamento
  5. Gera comprovante
  6. Atualiza estoque automaticamente

#### RF3: Gestão de Estoque
- **Descrição**: Controle de inventário com alertas
- **Atores**: Operador, Gerente
- **Fluxo Principal**:
  1. Sistema registra movimentações (entrada/saída)
  2. Atualiza saldo em tempo real
  3. Alerta quando atinge estoque mínimo
  4. Permite ajustes manuais

#### RF4: Relatórios Gerenciais
- **Descrição**: Análise de vendas, margem e performance
- **Atores**: Gerente, Contador
- **Fluxo Principal**:
  1. Gerente acessa dashboard
  2. Filtra por período, operador, produto
  3. Visualiza gráficos e métricas
  4. Exporta relatório

#### RF5: Devoluções
- **Descrição**: Processamento de devoluções com reembolso
- **Atores**: Operador, Gerente
- **Fluxo Principal**:
  1. Operador inicia devolução
  2. Seleciona itens da venda original
  3. Insere motivo
  4. Gerente aprova/rejeita
  5. Sistema processa reembolso
  6. Estoque é atualizado

#### RF6: Fechamento de Caixa
- **Descrição**: Conciliação diária de caixa
- **Atores**: Operador, Gerente
- **Fluxo Principal**:
  1. Operador inicia fechamento
  2. Sistema calcula saldo esperado
  3. Operador insere saldo real
  4. Sistema identifica discrepâncias
  5. Gerente verifica e aprova

### 5.3 Requisitos Não Funcionais

| Requisito | Descrição | Métrica |
|---|---|---|
| **Performance** | Resposta rápida do PDV | <500ms para busca de produtos |
| **Disponibilidade** | Sistema sempre disponível | 99.5% uptime |
| **Escalabilidade** | Suporta crescimento | 10K vendas/dia |
| **Segurança** | Proteção de dados | PCI-DSS, LGPD |
| **Usabilidade** | Interface intuitiva | NPS > 8 |
| **Confiabilidade** | Sem perda de dados | Backup diário |
| **Manutenibilidade** | Fácil de manter | Cobertura de testes > 70% |

### 5.4 Roadmap de Funcionalidades

**Phase 1 (Atual - Dezembro 2025):**
- ✅ PDV básico
- ✅ Estoque
- ✅ Devoluções
- ✅ Fechamento de caixa
- ✅ Relatórios básicos

**Phase 2 (Janeiro 2026):**
- 🔄 Integração Stripe
- 🔄 Suporte multi-moeda
- 🔄 Fichas técnicas (interface)
- 🔄 Aplicativo mobile
- 🔄 Exportação de relatórios (PDF/Excel)

**Phase 3 (Fevereiro 2026):**
- 📋 Integração e-commerce
- 📋 Multi-loja
- 📋 Analytics avançado
- 📋 Integração com fornecedores
- 📋 Backup automático

**Phase 4 (Março 2026):**
- 📋 Emissão de notas fiscais (opcional)
- 📋 Integração com sistemas contábeis
- 📋 App mobile nativo
- 📋 Suporte multi-idioma

---

## PROMPT COMPLETO PARA IA/DEV

### 6.1 Contexto Geral

Você está trabalhando em um **Sistema de Vendas Interno (PDV Gerencial)** - uma plataforma web moderna para gerenciar operações de varejo. O sistema foi arquitetado como um **Monolito Modular** usando React 19 + Node.js + tRPC + Drizzle ORM.

**Objetivo**: Implementar novas funcionalidades críticas e corrigir vulnerabilidades de segurança identificadas na análise.

**Prioridades**:
1. Segurança (corrigir vulnerabilidades críticas)
2. Funcionalidades (integração Stripe, multi-moeda)
3. Qualidade (testes, documentação)

### 6.2 Instruções Detalhadas para Implementação

#### TAREFA 1: CORRIGIR VULNERABILIDADES DE SEGURANÇA

**Objetivo**: Eliminar todas as vulnerabilidades críticas e altas identificadas.

**Subtarefas**:

**1.1 - Implementar Rate Limiting**
- **Arquivo**: `server/_core/index.ts`
- **Descrição**: Proteger contra brute force e DDoS
- **Implementação**:
  - Instalar `express-rate-limit`
  - Configurar limite de 100 requisições por IP a cada 15 minutos
  - Aplicar a `/api/trpc` e `/api/oauth/callback`
  - Retornar erro 429 (Too Many Requests) quando limite excedido
- **Testes**: Fazer 101 requisições e verificar se a 101ª é bloqueada

**1.2 - Corrigir SameSite Cookie**
- **Arquivo**: `server/_core/cookies.ts` (linha 45)
- **Descrição**: Prevenir CSRF attacks
- **Implementação**:
  - Alterar `sameSite: "none"` para `sameSite: "strict"`
  - Manter `secure: true` em produção
  - Adicionar comentário explicando a mudança
- **Teste**: Verificar que cookie não é enviado em requisições cross-site

**1.3 - Implementar Validação Zod Completa**
- **Arquivos**: Todos os routers em `server/modules/*/router.ts`
- **Descrição**: Validar todos os inputs com Zod
- **Implementação**:
  - Criar schema Zod para cada input
  - Validar tipos: string, number, enum, array
  - Validar ranges: positive, min, max
  - Usar `.input(schema)` em todos os procedimentos
- **Exemplo**:
  ```typescript
  processSale: protectedProcedure
    .input(z.object({
      items: z.array(z.object({
        productId: z.number().positive("Product ID must be positive"),
        quantity: z.number().positive().int("Quantity must be integer"),
      })),
      paymentMethod: z.enum(['cash', 'card', 'check']),
    }))
    .mutation(async ({ input, ctx }) => {
      // Implementação
    })
  ```

**1.4 - Implementar Autorização Granular**
- **Arquivos**: `server/modules/*/router.ts`
- **Descrição**: Validar permissões antes de executar ações sensíveis
- **Implementação**:
  - Criar middleware `managerProcedure` para ações de gerente
  - Criar middleware `accountantProcedure` para ações de contador
  - Aplicar em endpoints sensíveis: approveReturn, finalizeClosure, etc.
  - Verificar `ctx.user.role` antes de permitir
- **Exemplo**:
  ```typescript
  const managerProcedure = protectedProcedure.use(async ({ ctx, next }) => {
    if (ctx.user?.role !== 'manager' && ctx.user?.role !== 'admin') {
      throw new TRPCError({ code: 'FORBIDDEN', message: 'Only managers can perform this action' });
    }
    return next({ ctx });
  });
  ```

**1.5 - Implementar Sistema de Auditoria**
- **Arquivo**: Criar `drizzle/schema.ts` - adicionar tabela `auditLogs`
- **Descrição**: Rastrear todas as ações sensíveis
- **Implementação**:
  - Criar tabela com campos: id, userId, action, entityType, entityId, oldValue, newValue, timestamp
  - Criar função `logAudit(userId, action, entity, oldValue, newValue)`
  - Chamar em: createSale, approveReturn, finalizeClosure, recordProduction
  - Implementar endpoint para consultar logs (apenas admin)

**1.6 - Configurar CORS Explícito**
- **Arquivo**: `server/_core/index.ts`
- **Descrição**: Permitir apenas origens autorizadas
- **Implementação**:
  ```typescript
  import cors from 'cors';
  
  const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(',') || [
    'http://localhost:3000',
    'https://yourdomain.com'
  ];
  
  app.use(cors({
    origin: allowedOrigins,
    credentials: true,
    methods: ['GET', 'POST', 'OPTIONS'],
  }));
  ```

**1.7 - Implementar Logging Seguro**
- **Arquivo**: Criar `server/_core/logger.ts`
- **Descrição**: Registrar eventos sem expor dados sensíveis
- **Implementação**:
  - Usar Winston ou Pino
  - Diferentes níveis: debug, info, warn, error
  - Nunca logar senhas, tokens, dados pessoais
  - Logar: ações do usuário, erros, tentativas de acesso não autorizado
  - Arquivo de log: `/var/log/pdv-system/app.log`

**1.8 - Validar Preços no Back-end**
- **Arquivo**: `server/modules/pdv/router.ts`
- **Descrição**: Nunca confiar em preço do cliente
- **Implementação**:
  - Em `processSale`, buscar preço do banco para cada produto
  - Comparar com preço enviado pelo cliente
  - Se diferente, usar preço do banco
  - Logar discrepância para auditoria
  ```typescript
  const dbPrice = await getProductById(item.productId);
  if (dbPrice.salePrice !== item.unitPrice) {
    logAudit(ctx.user.id, 'PRICE_MISMATCH', 'sale', item.unitPrice, dbPrice.salePrice);
  }
  ```

#### TAREFA 2: INTEGRAÇÃO COM STRIPE

**Objetivo**: Permitir pagamentos com cartão de crédito via Stripe.

**Subtarefas**:

**2.1 - Configurar Stripe SDK**
- **Arquivo**: `server/_core/stripe.ts` (criar novo)
- **Descrição**: Inicializar cliente Stripe
- **Implementação**:
  - Instalar `stripe`
  - Inicializar com `process.env.STRIPE_SECRET_KEY`
  - Exportar instância
  - Adicionar variáveis de ambiente: `STRIPE_SECRET_KEY`, `STRIPE_PUBLISHABLE_KEY`

**2.2 - Criar Endpoint de Pagamento**
- **Arquivo**: `server/modules/pdv/router.ts`
- **Descrição**: Processar pagamento com Stripe
- **Implementação**:
  - Novo endpoint: `createPaymentIntent`
  - Input: amount, currency
  - Chamar `stripe.paymentIntents.create()`
  - Retornar clientSecret para Front-end
  - Exemplo:
    ```typescript
    createPaymentIntent: protectedProcedure
      .input(z.object({
        amount: z.number().positive(),
        currency: z.enum(['usd', 'eur', 'brl']),
      }))
      .mutation(async ({ input }) => {
        const intent = await stripe.paymentIntents.create({
          amount: Math.round(input.amount * 100),
          currency: input.currency,
        });
        return { clientSecret: intent.client_secret };
      })
    ```

**2.3 - Implementar Webhook de Confirmação**
- **Arquivo**: `server/_core/index.ts`
- **Descrição**: Confirmar pagamento quando Stripe notifica
- **Implementação**:
  - Criar endpoint `/api/webhooks/stripe`
  - Validar assinatura do webhook
  - Atualizar status da venda quando pagamento confirmado
  - Registrar em auditoria

**2.4 - Integrar Front-end com Stripe**
- **Arquivo**: `client/src/pages/PDV.tsx`
- **Descrição**: Mostrar formulário de pagamento
- **Implementação**:
  - Instalar `@stripe/react-stripe-js`
  - Renderizar `CardElement` quando usuário clica "Finalizar Venda"
  - Chamar `createPaymentIntent` para obter clientSecret
  - Confirmar pagamento com `stripe.confirmCardPayment()`
  - Mostrar resultado (sucesso/erro)

#### TAREFA 3: SUPORTE A MÚLTIPLAS MOEDAS

**Objetivo**: Permitir operações em EUR, USD e BRL.

**Subtarefas**:

**3.1 - Adicionar Campo de Moeda**
- **Arquivo**: `drizzle/schema.ts`
- **Descrição**: Armazenar moeda de cada transação
- **Implementação**:
  - Adicionar coluna `currency` em `sales` (enum: 'brl', 'usd', 'eur')
  - Adicionar coluna `currency` em `cashClosures`
  - Executar migration

**3.2 - Criar Tabela de Configuração**
- **Arquivo**: `drizzle/schema.ts`
- **Descrição**: Armazenar moeda padrão e taxas de câmbio
- **Implementação**:
  - Criar tabela `systemConfig` com campos: id, defaultCurrency, exchangeRates (JSON)
  - Exemplo:
    ```typescript
    export const systemConfig = mysqlTable("systemConfig", {
      id: int("id").primaryKey(),
      defaultCurrency: mysqlEnum("defaultCurrency", ['brl', 'usd', 'eur']).default('brl'),
      exchangeRates: json("exchangeRates").$type<Record<string, number>>(),
      updatedAt: timestamp("updatedAt").onUpdateNow(),
    });
    ```

**3.3 - Criar Endpoint de Configuração**
- **Arquivo**: `server/modules/auth/router.ts`
- **Descrição**: Permitir admin alterar moeda padrão
- **Implementação**:
  - Endpoint: `updateSystemConfig`
  - Input: defaultCurrency
  - Apenas admin pode chamar
  - Atualizar banco de dados

**3.4 - Implementar Conversão de Moeda**
- **Arquivo**: `server/_core/currency.ts` (criar novo)
- **Descrição**: Converter valores entre moedas
- **Implementação**:
  - Função `convertCurrency(amount, fromCurrency, toCurrency)`
  - Buscar taxas de câmbio da API (ex: exchangerate-api.com)
  - Cachear taxas por 1 hora
  - Exemplo:
    ```typescript
    export async function convertCurrency(
      amount: number,
      from: string,
      to: string
    ): Promise<number> {
      if (from === to) return amount;
      const rates = await getExchangeRates();
      return amount * (rates[to] / rates[from]);
    }
    ```

**3.5 - Integrar no Front-end**
- **Arquivo**: `client/src/pages/PDV.tsx`
- **Descrição**: Mostrar seletor de moeda
- **Implementação**:
  - Adicionar dropdown com EUR, USD, BRL
  - Converter preços ao alterar moeda
  - Salvar moeda selecionada em localStorage
  - Enviar moeda ao processar venda

#### TAREFA 4: POPUP DE IMPRESSÃO DE NOTA FISCAL

**Objetivo**: Exibir comprovante de compra para impressão após finalizar venda.

**Subtarefas**:

**4.1 - Criar Componente de Recibo**
- **Arquivo**: `client/src/components/SaleReceipt.tsx` (criar novo)
- **Descrição**: Renderizar recibo em formato imprimível
- **Implementação**:
  - Componente React que recebe dados da venda
  - Mostrar: data/hora, operador, produtos, total, método pagamento
  - Estilo otimizado para impressora (80mm de largura)
  - Exemplo:
    ```typescript
    interface SaleReceiptProps {
      saleId: number;
      items: Array<{ name: string; qty: number; price: number }>;
      total: number;
      paymentMethod: string;
      timestamp: Date;
    }
    
    export function SaleReceipt({ saleId, items, total, paymentMethod, timestamp }: SaleReceiptProps) {
      return (
        <div className="receipt-container" style={{ width: '80mm' }}>
          <h2>COMPROVANTE DE VENDA</h2>
          <p>ID: {saleId}</p>
          <p>{timestamp.toLocaleString('pt-BR')}</p>
          <table>
            <tbody>
              {items.map(item => (
                <tr key={item.name}>
                  <td>{item.name}</td>
                  <td>{item.qty}</td>
                  <td>R$ {item.price.toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <h3>TOTAL: R$ {total.toFixed(2)}</h3>
          <p>Método: {paymentMethod}</p>
        </div>
      );
    }
    ```

**4.2 - Criar Modal de Impressão**
- **Arquivo**: `client/src/components/PrintModal.tsx` (criar novo)
- **Descrição**: Modal que abre após venda com opção de imprimir
- **Implementação**:
  - Usar `window.print()` para abrir diálogo de impressão
  - Mostrar preview do recibo
  - Botões: "Imprimir", "Fechar"
  - CSS para impressão: `@media print { ... }`

**4.3 - Integrar no PDV**
- **Arquivo**: `client/src/pages/PDV.tsx`
- **Descrição**: Mostrar modal após venda bem-sucedida
- **Implementação**:
  - Após `pdv.processSale` retornar sucesso
  - Abrir `PrintModal` com dados da venda
  - Permitir impressão ou fechar
  - Limpar carrinho após fechar

#### TAREFA 5: ADICIONAR TESTES UNITÁRIOS

**Objetivo**: Implementar testes para lógica crítica.

**Subtarefas**:

**5.1 - Testes do Serviço PDV**
- **Arquivo**: `server/modules/pdv/router.test.ts` (criar novo)
- **Descrição**: Testar validação de carrinho e processamento de venda
- **Implementação**:
  - Teste 1: Validar carrinho com estoque suficiente ✅
  - Teste 2: Rejeitar carrinho com estoque insuficiente ❌
  - Teste 3: Rejeitar produto inativo ❌
  - Teste 4: Processar venda com sucesso ✅
  - Teste 5: Atualizar estoque após venda ✅
  - Usar vitest + mocking do banco de dados

**5.2 - Testes de Autorização**
- **Arquivo**: `server/_core/trpc.test.ts` (criar novo)
- **Descrição**: Testar middlewares de autorização
- **Implementação**:
  - Teste 1: Usuário não autenticado não pode acessar protectedProcedure ❌
  - Teste 2: Usuário comum não pode acessar adminProcedure ❌
  - Teste 3: Admin pode acessar adminProcedure ✅

**5.3 - Testes de Validação**
- **Arquivo**: `server/modules/pdv/validation.test.ts` (criar novo)
- **Descrição**: Testar schemas Zod
- **Implementação**:
  - Teste 1: Validar input correto ✅
  - Teste 2: Rejeitar quantidade negativa ❌
  - Teste 3: Rejeitar productId inválido ❌

#### TAREFA 6: DOCUMENTAÇÃO

**Objetivo**: Documentar arquitetura e APIs.

**Subtarefas**:

**6.1 - Documentação de Arquitetura**
- **Arquivo**: `docs/ARCHITECTURE.md` (criar novo)
- **Descrição**: Explicar estrutura do projeto
- **Conteúdo**:
  - Visão geral
  - Diagrama de arquitetura
  - Descrição de cada módulo
  - Fluxos de dados principais
  - Decisões arquiteturais

**6.2 - Documentação de API**
- **Arquivo**: `docs/API.md` (criar novo)
- **Descrição**: Documentar endpoints tRPC
- **Conteúdo**:
  - Lista de todos os procedimentos
  - Input/Output schemas
  - Exemplos de uso
  - Erros possíveis

**6.3 - Guia de Desenvolvimento**
- **Arquivo**: `CONTRIBUTING.md` (criar novo)
- **Descrição**: Como contribuir ao projeto
- **Conteúdo**:
  - Setup local
  - Estrutura de pastas
  - Padrões de código
  - Como rodar testes
  - Como fazer deploy

### 6.3 Checklist de Implementação

**Segurança:**
- [ ] Rate limiting implementado
- [ ] SameSite cookie corrigido
- [ ] Validação Zod completa
- [ ] Autorização granular
- [ ] Sistema de auditoria
- [ ] CORS configurado
- [ ] Logging seguro
- [ ] Preços validados no back-end

**Funcionalidades:**
- [ ] Stripe integrado
- [ ] Suporte multi-moeda
- [ ] Popup de impressão
- [ ] Fichas técnicas (interface)
- [ ] Aplicativo mobile

**Qualidade:**
- [ ] Testes unitários (70% cobertura)
- [ ] Documentação completa
- [ ] Linting e formatting
- [ ] Performance otimizada
- [ ] Segurança validada

### 6.4 Métricas de Sucesso

| Métrica | Meta | Atual |
|---|---|---|
| Cobertura de testes | 70% | 0% |
| Vulnerabilidades críticas | 0 | 4 |
| Vulnerabilidades altas | 0 | 3 |
| Performance (PDV) | <500ms | ⏱️ |
| Uptime | 99.5% | ⏱️ |
| Satisfação (NPS) | >8 | ⏱️ |

---

## CONCLUSÃO

Este documento fornece uma análise completa do **Sistema de Vendas Interno (PDV Gerencial)**, incluindo:

1. **Análise Técnica**: Arquitetura moderna, bem estruturada e escalável
2. **Pesquisa de Mercado**: Identificação de gaps vs. concorrentes
3. **Análise de Segurança**: 12 vulnerabilidades identificadas com recomendações
4. **Boas Práticas**: Sugestões de melhoria de código e performance
5. **Documentação Arquitetural**: Requisitos funcionais e não-funcionais
6. **Prompt Detalhado**: Instruções precisas para implementação

**Próximos Passos:**
1. Priorizar correção de vulnerabilidades de segurança (Semana 1)
2. Implementar integração Stripe (Semana 2)
3. Adicionar suporte multi-moeda (Semana 2)
4. Implementar testes unitários (Semana 3)
5. Documentação completa (Semana 3)

**Estimativa de Esforço:**
- Segurança: 40 horas
- Funcionalidades: 60 horas
- Testes: 30 horas
- Documentação: 20 horas
- **Total**: ~150 horas (3-4 semanas com 1 dev full-time)

---

**Documento Preparado por**: Manus AI  
**Data**: Dezembro 2025  
**Versão**: 1.0  
**Status**: Pronto para Implementação
