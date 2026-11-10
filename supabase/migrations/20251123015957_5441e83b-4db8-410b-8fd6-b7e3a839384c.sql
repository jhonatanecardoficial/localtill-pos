-- Corrigir políticas de RLS para permitir que operadores da mesma empresa criem vendas

-- Remover políticas antigas conflitantes
DROP POLICY IF EXISTS "Operators can create sales" ON public.sales;
DROP POLICY IF EXISTS "Users can create sales for their branches" ON public.sales;

-- Nova política de INSERT que permite operadores e donos da mesma empresa
CREATE POLICY "Company users can create sales"
ON public.sales
FOR INSERT
TO authenticated
WITH CHECK (
  cashier_id = auth.uid()
  AND EXISTS (
    SELECT 1
    FROM public.branches b
    WHERE b.id = branch_id
      AND (
        b.owner_id = auth.uid() -- dono criando venda
        OR EXISTS (             -- funcionário da mesma empresa
          SELECT 1
          FROM public.profiles p
          WHERE p.id = auth.uid()
            AND p.owner_id = b.owner_id
        )
      )
  )
);