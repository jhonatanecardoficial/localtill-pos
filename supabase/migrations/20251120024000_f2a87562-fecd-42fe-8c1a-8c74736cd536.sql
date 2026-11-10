-- Fase 1: Remover políticas INSERT conflitantes
DROP POLICY IF EXISTS "Users can create cash registers for their branches" ON cash_registers;
DROP POLICY IF EXISTS "Users can open their own cash register" ON cash_registers;

-- Fase 2: Criar política unificada para abertura de caixa
CREATE POLICY "Users can open cash register in their branch"
ON cash_registers FOR INSERT
WITH CHECK (
  -- Operador deve ser o próprio usuário
  operator_id = auth.uid()
  AND
  -- Branch deve ser do dono do usuário OU a branch à qual o usuário está vinculado
  branch_id IN (
    SELECT b.id FROM branches b
    WHERE b.owner_id = auth.uid()  -- Se for dono, qualquer branch dele
    OR b.id = (SELECT branch_id FROM profiles WHERE id = auth.uid())  -- Se for usuário interno, só sua branch
  )
);

-- Fase 3: Validar e ajustar políticas UPDATE se necessário
-- Verificar se as políticas UPDATE já permitem o fechamento correto
DROP POLICY IF EXISTS "Users can update cash registers of their branches" ON cash_registers;
DROP POLICY IF EXISTS "Users can update their own cash register" ON cash_registers;

-- Política unificada para atualização de caixa (fechamento, etc)
CREATE POLICY "Users can update their branch cash registers"
ON cash_registers FOR UPDATE
USING (
  operator_id = auth.uid()  -- Só pode atualizar seu próprio caixa
  OR
  (branch_id IN (SELECT id FROM branches WHERE owner_id = auth.uid()))  -- Ou donos podem atualizar caixas de suas branches
)
WITH CHECK (
  operator_id = auth.uid()
  OR
  (branch_id IN (SELECT id FROM branches WHERE owner_id = auth.uid()))
);