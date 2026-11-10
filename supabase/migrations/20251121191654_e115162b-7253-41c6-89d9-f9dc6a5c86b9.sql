-- Recriar a política garantindo que a função seja chamada com o esquema completo
DROP POLICY IF EXISTS "Users can open cash register in active branch" ON public.cash_registers;

CREATE POLICY "Users can open cash register in active branch"
ON public.cash_registers
FOR INSERT
WITH CHECK (
  operator_id = auth.uid()
  AND public.user_branch_matches_active(auth.uid(), branch_id) = true
);