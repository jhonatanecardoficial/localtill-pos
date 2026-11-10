-- Remover a política atual que usa a função
DROP POLICY IF EXISTS "Users can open cash register in active branch" ON public.cash_registers;

-- Criar nova política com lógica inline
CREATE POLICY "Users can open cash register in active branch"
ON public.cash_registers
FOR INSERT
WITH CHECK (
  operator_id = auth.uid()
  AND EXISTS (
    SELECT 1
    FROM public.user_active_branch
    WHERE user_id = auth.uid()
      AND branch_id = cash_registers.branch_id
  )
);