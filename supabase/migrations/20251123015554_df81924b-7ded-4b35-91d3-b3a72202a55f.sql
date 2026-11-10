-- Ajuste definitivo das políticas de RLS do caixa para permitir abertura por operadores da mesma empresa

-- Remover políticas antigas conflitantes
DROP POLICY IF EXISTS "Users can open cash register" ON public.cash_registers;
DROP POLICY IF EXISTS "Users can update their branch cash registers" ON public.cash_registers;
DROP POLICY IF EXISTS "Users can view cash registers of their branches" ON public.cash_registers;

-- Política de SELECT: donos e funcionários podem ver caixas das filiais da mesma empresa
CREATE POLICY "Company users can view cash registers"
ON public.cash_registers
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.branches b
    WHERE b.id = cash_registers.branch_id
      AND (
        b.owner_id = auth.uid() -- dono
        OR EXISTS (             -- funcionário vinculado ao mesmo owner
          SELECT 1
          FROM public.profiles p
          WHERE p.id = auth.uid()
            AND p.owner_id = b.owner_id
        )
      )
  )
);

-- Política de INSERT: operador autenticado pode abrir caixa em filial da sua empresa
CREATE POLICY "Company users can open cash register"
ON public.cash_registers
FOR INSERT
TO authenticated
WITH CHECK (
  operator_id = auth.uid()
  AND EXISTS (
    SELECT 1
    FROM public.branches b
    WHERE b.id = branch_id
      AND (
        b.owner_id = auth.uid() -- dono abrindo caixa
        OR EXISTS (             -- funcionário da mesma empresa
          SELECT 1
          FROM public.profiles p
          WHERE p.id = auth.uid()
            AND p.owner_id = b.owner_id
        )
      )
  )
);

-- Política de UPDATE: donos e funcionários podem atualizar registros de caixa da empresa
CREATE POLICY "Company users can update cash registers"
ON public.cash_registers
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.branches b
    WHERE b.id = cash_registers.branch_id
      AND (
        b.owner_id = auth.uid()
        OR EXISTS (
          SELECT 1
          FROM public.profiles p
          WHERE p.id = auth.uid()
            AND p.owner_id = b.owner_id
        )
      )
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.branches b
    WHERE b.id = cash_registers.branch_id
      AND (
        b.owner_id = auth.uid()
        OR EXISTS (
          SELECT 1
          FROM public.profiles p
          WHERE p.id = auth.uid()
            AND p.owner_id = b.owner_id
        )
      )
  )
);