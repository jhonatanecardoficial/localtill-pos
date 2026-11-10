# Plano de Implementação - Página de Configurações

## Objetivo
Criar uma página completa de Configurações que permita aos administradores gerenciar todos os aspectos configuráveis do sistema PDV.

## Funcionalidades Necessárias

### 1. **Gestão de Metas de Vendas** ✅ (Prioridade Alta)
- [ ] Interface para definir metas mensais por vendedor
- [ ] Formulário para criar/editar metas com:
  - Seleção de vendedor
  - Mês e ano
  - Valor da meta em R$
- [ ] Tabela mostrando todas as metas configuradas
- [ ] Visualização do progresso atual vs meta em tempo real
- [ ] Indicadores visuais (barras de progresso, percentuais)
- [ ] Permissão apenas para administradores

### 2. **Configuração de Descontos Progressivos** 🔥 (Prioridade Alta)
- [ ] Sistema de regras de desconto automático baseado em:
  - **Por Quantidade de Itens:**
    - Ex: 5% desconto acima de 10 itens
    - Ex: 10% desconto acima de 20 itens
    - Ex: 15% desconto acima de 30 itens
  - **Por Valor Total da Compra:**
    - Ex: 5% desconto acima de R$ 500
    - Ex: 10% desconto acima de R$ 1.000
    - Ex: 15% desconto acima de R$ 2.000
- [ ] Interface para adicionar/remover/editar regras de desconto
- [ ] Possibilidade de ativar/desativar regras
- [ ] Validação para evitar regras conflitantes
- [ ] Aplicação automática no PDV

### 3. **Programa de Fidelidade** 💎 (Prioridade Alta)
- [ ] Configuração de pontos de fidelidade:
  - Quantos pontos equivalem a R$ 1,00 de desconto
  - Ex: 100 pontos = R$ 1,00
- [ ] Regra de acúmulo de pontos:
  - Quantos reais gastos = 1 ponto
  - Ex: Cada R$ 10,00 gastos = 1 ponto
- [ ] Configuração de validade dos pontos (em meses)
- [ ] Possibilidade de multiplicadores em datas especiais
- [ ] Interface para ativar/desativar o programa

### 4. **Gestão de Filiais** 🏢 (Prioridade Média)
- [ ] Adicionar/editar/desativar filiais
- [ ] Configurar:
  - Nome da filial
  - Código único
  - Endereço completo
  - Telefone
  - Gerente responsável
- [ ] Status ativo/inativo
- [ ] Visualização de todas as filiais

### 5. **Configurações de Impressão** 🖨️ (Prioridade Média)
- [ ] Layout do comprovante de venda:
  - Logotipo da empresa
  - Informações da empresa (nome, CNPJ, endereço)
  - Formato do código de barras
  - Mensagem de rodapé customizável
- [ ] Configuração de impressora padrão
- [ ] Tamanho do papel (80mm, A4, etc.)
- [ ] Preview de como ficará o comprovante

### 6. **Gerenciamento de Usuários e Permissões** 👥 (Prioridade Média)
- [ ] Listar todos os usuários do sistema
- [ ] Atribuir/remover papéis:
  - Admin
  - Manager
  - Operator
  - Stock_clerk
- [ ] Ativar/desativar usuários
- [ ] Redefinir senhas (apenas admins)
- [ ] Ver logs de atividade por usuário

### 7. **Configurações Gerais do Sistema** ⚙️ (Prioridade Baixa)
- [ ] Nome da empresa
- [ ] CNPJ
- [ ] Logotipo
- [ ] Cor tema principal
- [ ] Moeda padrão
- [ ] Fuso horário
- [ ] Idioma (preparar para multi-idioma)

### 8. **Alertas e Notificações** 🔔 (Prioridade Baixa)
- [ ] Configurar limite de estoque mínimo global
- [ ] Notificações por e-mail para eventos:
  - Estoque baixo
  - Meta de vendas atingida
  - Vendas acima de X reais
- [ ] Frequência das notificações

### 9. **Backup e Exportação** 💾 (Prioridade Baixa)
- [ ] Agendar backups automáticos
- [ ] Exportar dados para CSV/Excel:
  - Produtos
  - Vendas
  - Clientes
  - Estoque
- [ ] Importar dados em lote

### 10. **Relatórios Customizáveis** 📊 (Prioridade Baixa)
- [ ] Criar templates de relatórios personalizados
- [ ] Agendar envio automático de relatórios
- [ ] Escolher métricas a serem exibidas

## Estrutura de Componentes Sugerida

```
src/pages/Settings.tsx (página principal com tabs)
├── src/components/settings/
│   ├── SalesTargetsSettings.tsx
│   ├── DiscountRulesSettings.tsx
│   ├── LoyaltyProgramSettings.tsx
│   ├── BranchManagement.tsx
│   ├── PrintSettings.tsx
│   ├── UserManagement.tsx
│   ├── GeneralSettings.tsx
│   ├── NotificationSettings.tsx
│   └── BackupSettings.tsx
```

## Tabelas do Banco de Dados Necessárias

### Já existentes:
- ✅ `sales_targets` - para metas de vendas
- ✅ `branches` - filiais
- ✅ `profiles` - usuários
- ✅ `user_roles` - permissões

### A criar:
- ⚠️ `discount_rules` - regras de desconto progressivo
- ⚠️ `loyalty_settings` - configurações do programa de fidelidade
- ⚠️ `system_settings` - configurações gerais (key-value)
- ⚠️ `notification_settings` - configurações de notificações

## Ordem de Implementação Recomendada

1. **Fase 1 - Funcionalidades Críticas** (Prioridade Alta)
   - Metas de Vendas
   - Descontos Progressivos
   - Programa de Fidelidade

2. **Fase 2 - Gestão Operacional** (Prioridade Média)
   - Gestão de Filiais
   - Gerenciamento de Usuários
   - Configurações de Impressão

3. **Fase 3 - Melhorias** (Prioridade Baixa)
   - Configurações Gerais
   - Alertas e Notificações
   - Backup e Exportação
   - Relatórios Customizáveis

## Considerações de Segurança

- ✅ Apenas usuários com role `admin` podem acessar as Configurações
- ✅ Validação de todas as entradas do usuário
- ✅ Logs de auditoria para todas as mudanças críticas
- ✅ Confirmação antes de ações destrutivas (deletar, desativar)

## Próximos Passos Imediatos

1. Criar a estrutura básica da página Settings.tsx com sistema de tabs
2. Implementar gestão de metas de vendas (já temos a tabela)
3. Criar tabela e interface para descontos progressivos
4. Implementar configuração do programa de fidelidade
