
-- Corrigir políticas RLS de inventory para permitir que operadores atualizem estoque durante vendas

DROP POLICY IF EXISTS "Users can update inventory of their branches" ON public.inventory;

CREATE POLICY "Users can update inventory of their branches"
ON public.inventory
FOR UPDATE
TO authenticated
USING (
  branch_id IN (
    SELECT b.id
    FROM branches b
    WHERE b.owner_id = auth.uid() 
       OR b.owner_id = (SELECT owner_id FROM profiles WHERE id = auth.uid())
  )
);

-- Corrigir política de SELECT de inventory_movements para permitir que usuários vejam movimentações

DROP POLICY IF EXISTS "Users view movements of their branches" ON public.inventory_movements;

CREATE POLICY "Users view movements of their branches"
ON public.inventory_movements
FOR SELECT
TO authenticated
USING (
  branch_id IN (
    SELECT b.id
    FROM branches b
    WHERE b.owner_id = auth.uid() 
       OR b.owner_id = (SELECT owner_id FROM profiles WHERE id = auth.uid())
  )
);
