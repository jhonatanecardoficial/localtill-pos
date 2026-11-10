-- Ajustar RLS para permitir que qualquer usuário da empresa abra o caixa

-- 1) Remover política atual baseada em user_branch_matches_active
DROP POLICY IF EXISTS "Users can open cash register in active branch" ON public.cash_registers;

-- 2) Remover função auxiliar que não será mais usada
DROP FUNCTION IF EXISTS public.user_branch_matches_active(uuid);

-- 3) Criar nova política que permite abertura de caixa
-- por qualquer usuário pertencente ao mesmo dono da filial
CREATE POLICY "Users can open cash register in company branches"
ON public.cash_registers
FOR INSERT
WITH CHECK (
  -- O operador do registro deve ser o usuário autenticado
  operator_id = auth.uid()
  AND (
    -- Caso 1: o próprio usuário é o dono da filial
    branch_id IN (
      SELECT b.id
      FROM public.branches b
      WHERE b.owner_id = auth.uid()
    )
    OR
    -- Caso 2: usuário interno (perfil) cujo owner_id coincide com o dono da filial
    EXISTS (
      SELECT 1
      FROM public.profiles p
      JOIN public.branches b2 ON b2.id = branch_id
      WHERE p.id = auth.uid()
        AND p.owner_id = b2.owner_id
    )
  )
);