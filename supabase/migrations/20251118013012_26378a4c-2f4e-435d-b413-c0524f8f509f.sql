-- Corrigir política RLS para permitir fechamento de caixa
DROP POLICY IF EXISTS "Users can update their own open cash register" ON public.cash_registers;

-- Nova política permite atualizar caixa próprio, incluindo fechar
CREATE POLICY "Users can update their own cash register" 
ON public.cash_registers 
FOR UPDATE 
USING (operator_id = auth.uid())
WITH CHECK (operator_id = auth.uid());