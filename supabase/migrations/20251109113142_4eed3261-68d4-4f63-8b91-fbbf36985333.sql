-- Adicionar políticas RLS para inventory_movements
-- Permitir que usuários autenticados insiram movimentos de estoque
CREATE POLICY "Authenticated users can create movements"
ON public.inventory_movements
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Adicionar políticas RLS para inventory
-- Permitir que usuários autenticados insiram novos registros de inventário
CREATE POLICY "Authenticated users can create inventory"
ON public.inventory
FOR INSERT
TO authenticated
WITH CHECK (true);

-- Permitir que usuários autenticados atualizem inventário
CREATE POLICY "Authenticated users can update inventory"
ON public.inventory
FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);