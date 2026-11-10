# Plano de Implementação: Modo Touch e Acessibilidade no PDV (Tablet/Mobile)

> **Objetivo:** Eliminar a abertura indesejada do teclado virtual em tablets/celulares ao adicionar produtos e melhorar a ergonomia/acessibilidade para operadores idosos, garantindo **zero regressão** no sistema desktop e versionamento com rollback imediato.

---

## 1. Diagnóstico do Problema Atual

- **Causa Raiz em `src/pages/POSNew.tsx` (linhas 993-1043):**
  Ao tocar em qualquer produto, abre-se o modal `QuantityDialog` contendo `<Input id="quantity" type="number" ... autoFocus />`. O atributo `autoFocus` força o sistema operacional móvel (Android/iOS/Windows Touch) a abrir o teclado virtual imediatamente, cobrindo os botões "Adicionar" e a tela.
- **Tamanho dos alvos de toque no carrinho (linhas 940-955):**
  Botões de alterar quantidade no mobile têm tamanho `h-7 w-7` (28px). A norma de acessibilidade (WCAG 2.2 / Apple / Android) exige o mínimo de 44x44px ou 48x48px para evitar toques acidentais por pessoas idosas.
- **Falta de controle numérico na própria tela (Touch Numpad / Stepper):**
  Sem um teclado numérico virtual nativo da tela e botões grandes de incremento (+/-), o operador é obrigado a usar o teclado do sistema operacional.

---

## 2. Estratégia de Versionamento e Segurança (Rollback Imediato)

Para garantir que nada seja quebrado e permitir retorno a qualquer momento:

1. **Snapshot Pré-Implementação:**
   - Commitar as pendências atuais do `package.json` / `public/icon.png` ou criar branch limpa.
   - Criar tag de segurança: `git tag checkpoint-pos-pre-touch`.
2. **Branch Dedicada:**
   - Criar e mudar para a branch: `git checkout -b feature/pos-touch-accessibility`.
3. **Commits Atômicos por Etapa:**
   - Commit 1: `feat(pos): desativa autofocus e teclado os em touch (inputMode none)`
   - Commit 2: `feat(pos): adiciona teclado numerico touch e botoes stepper grandes`
   - Commit 3: `feat(pos): aumenta alvos de clique no carrinho mobile para 48px`
4. **Comando de Rollback (se necessário):**
   - `git checkout release/v1.0.0-rc1` (volta instantânea sem afetar a produção).

---

## 3. Tarefas de Implementação

### Tarefa 1: Bloquear Abertura do Teclado Virtual em Dispositivos Touch
- **Arquivo:** `src/pages/POSNew.tsx`
- **Ação:**
  - Remover `autoFocus` incondicional do input de quantidade.
  - Adicionar `inputMode="none"` e detecção de toque/toggle, impedindo que o teclado do sistema operacional suba.
- **Critério de Aceite:** Tocar em um produto em tablet/celular abre a confirmação sem que o teclado do sistema operacional suba.

### Tarefa 2: Adicionar Stepper (+ / -) e Teclado Numérico Virtual Grande no Modal
- **Arquivo:** `src/components/pos/TouchQuantityModal.tsx` (ou extensão do dialog existente)
- **Ação:**
  - Botões grandes de incremento rápido: `[-]`, `[+]`, `+1`, `+5`.
  - Numpad virtual na tela (dígitos 0-9, Limpar, Confirmar) com botões de no mínimo 52px de altura.
  - Dígitos em fonte grande (24px+) e alto contraste para operadores idosos.
- **Critério de Aceite:** O operador altera a quantidade com um único toque na tela sem precisar do teclado físico ou virtual do OS.

### Tarefa 3: Otimizar Alvos de Clique do Carrinho Mobile (WCAG Acessibilidade)
- **Arquivo:** `src/pages/POSNew.tsx`
- **Ação:**
  - Aumentar botões `+` e `-` do carrinho móvel de `h-7 w-7` (28px) para `h-11 w-11` (44px) com ícones visíveis.
  - Espaçamento adequado entre os botões para evitar cliques errados.
- **Critério de Aceite:** Botões fáceis de tocar por dedos de operadores idosos.

### Tarefa 4: Adicionar Opção "Toque Direto (+1 ao Carrinho)" (Opcional/Configurável)
- **Arquivo:** `src/pages/POSNew.tsx`
- **Ação:**
  - Permitir modo PDV rápido: 1 toque no produto adiciona 1 unidade diretamente ao carrinho (como nos PDVs modernos), abrindo o modal de quantidade apenas se pressionado longamente ou se configurado.
- **Critério de Aceite:** Fluxo de venda fica até 3x mais rápido sem abrir caixas de diálogo a cada item.

### Tarefa 5: Verificação e Testes de Não-Regressão
- **Ação:**
  - Testar fluxo completo no Desktop com mouse e teclado (deve continuar funcionando exatamente como antes).
  - Testar emulação de touch / mobile via Chrome DevTools / Playwright.
  - Executar linter e TypeScript check (`npm run build:web` ou `tsc`).
- **Critério de Aceite:** Zero erros de tipagem, zero regressão nas vendas, cálculos de total, cupons e pagamentos 100% preservados.
