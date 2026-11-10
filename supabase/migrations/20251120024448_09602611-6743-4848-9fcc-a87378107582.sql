-- Ajustar política de INSERT em cash_registers para usar a filial ativa do usuário
DROP POLICY IF EXISTS "Users can open cash register in their branch" ON cash_registers;

CREATE POLICY "Users can open cash register in active branch"
ON cash_registers FOR INSERT
WITH CHECK (
  operator_id = auth.uid()
  AND branch_id IN (
    SELECT branch_id
    FROM user_active_branch
    WHERE user_id = auth.uid()
  )
);