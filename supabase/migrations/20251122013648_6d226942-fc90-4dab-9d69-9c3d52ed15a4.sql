-- Corrigir definitivamente a função user_branch_matches_active
-- removendo a política primeiro para evitar dependências

-- 1) Remover a política que depende da função
DROP POLICY IF EXISTS "Users can open cash register in active branch" ON public.cash_registers;

-- 2) Remover função antiga (qualquer assinatura existente)
DROP FUNCTION IF EXISTS public.user_branch_matches_active(uuid);
DROP FUNCTION IF EXISTS public.user_branch_matches_active(uuid, uuid);

-- 3) Criar nova função que usa auth.uid() diretamente
CREATE OR REPLACE FUNCTION public.user_branch_matches_active(
  _branch_id uuid
)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_active_branch
    WHERE user_id = auth.uid()
      AND branch_id = _branch_id
  );
$$;

-- 4) Recriar política usando a nova assinatura da função
CREATE POLICY "Users can open cash register in active branch"
ON public.cash_registers
FOR INSERT
WITH CHECK (
  operator_id = auth.uid()
  AND public.user_branch_matches_active(branch_id)
);