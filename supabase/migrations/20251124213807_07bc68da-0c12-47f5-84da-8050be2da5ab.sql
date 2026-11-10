
-- Corrigir política RLS de INSERT na tabela sales para permitir operadores criarem vendas
-- O problema é que a política atual só verifica cashier_id mas não valida o branch_id

DROP POLICY IF EXISTS "Users can create their own sales" ON public.sales;

CREATE POLICY "Users can create their own sales"
ON public.sales
FOR INSERT
TO authenticated
WITH CHECK (
  cashier_id = auth.uid()
  AND branch_id IN (
    SELECT b.id
    FROM branches b
    WHERE b.owner_id = auth.uid() 
       OR b.owner_id = (SELECT owner_id FROM profiles WHERE id = auth.uid())
  )
);
