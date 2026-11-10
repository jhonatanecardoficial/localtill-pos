-- Fase 1: Atualizar políticas RLS para categories
DROP POLICY IF EXISTS "Owners manage own categories" ON categories;

-- Usuários podem ver categorias do seu dono
CREATE POLICY "Users can view owner categories"
ON categories FOR SELECT
USING (
  owner_id = auth.uid() 
  OR 
  owner_id = (SELECT owner_id FROM profiles WHERE id = auth.uid())
);

-- Apenas donos podem gerenciar categorias
CREATE POLICY "Owners can manage categories"
ON categories FOR ALL
USING (owner_id = auth.uid())
WITH CHECK (owner_id = auth.uid());

-- Fase 2: Atualizar políticas RLS para products
DROP POLICY IF EXISTS "Owners manage own products" ON products;

-- Usuários podem ver produtos do seu dono
CREATE POLICY "Users can view owner products"
ON products FOR SELECT
USING (
  owner_id = auth.uid() 
  OR 
  owner_id = (SELECT owner_id FROM profiles WHERE id = auth.uid())
);

-- Admins, managers e stock clerks podem gerenciar produtos do dono
CREATE POLICY "Authorized users can manage products"
ON products FOR ALL
USING (
  owner_id = auth.uid()
  OR
  (owner_id = (SELECT owner_id FROM profiles WHERE id = auth.uid())
   AND (has_role(auth.uid(), 'admin'::app_role) 
        OR has_role(auth.uid(), 'manager'::app_role)
        OR has_role(auth.uid(), 'stock_clerk'::app_role)))
)
WITH CHECK (
  owner_id = auth.uid()
  OR
  (owner_id = (SELECT owner_id FROM profiles WHERE id = auth.uid())
   AND (has_role(auth.uid(), 'admin'::app_role) 
        OR has_role(auth.uid(), 'manager'::app_role)
        OR has_role(auth.uid(), 'stock_clerk'::app_role)))
);

-- Fase 3: Atualizar políticas RLS para shifts
DROP POLICY IF EXISTS "Owners manage own shifts" ON shifts;
DROP POLICY IF EXISTS "Owners view active shifts" ON shifts;

-- Usuários podem ver turnos ativos do seu dono
CREATE POLICY "Users can view owner active shifts"
ON shifts FOR SELECT
USING (
  is_active = true
  AND (
    owner_id = auth.uid() 
    OR 
    owner_id = (SELECT owner_id FROM profiles WHERE id = auth.uid())
  )
);

-- Apenas admins e managers podem gerenciar turnos
CREATE POLICY "Admins and managers can manage shifts"
ON shifts FOR ALL
USING (
  owner_id = auth.uid()
  OR
  (owner_id = (SELECT owner_id FROM profiles WHERE id = auth.uid())
   AND (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'manager'::app_role)))
)
WITH CHECK (
  owner_id = auth.uid()
  OR
  (owner_id = (SELECT owner_id FROM profiles WHERE id = auth.uid())
   AND (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'manager'::app_role)))
);

-- Fase 4: Atualizar políticas RLS para inventory
DROP POLICY IF EXISTS "Users can view inventory of their branches" ON inventory;

CREATE POLICY "Users can view owner branch inventory"
ON inventory FOR SELECT
USING (
  branch_id IN (
    SELECT b.id FROM branches b
    WHERE b.owner_id = auth.uid()
    OR b.owner_id = (SELECT owner_id FROM profiles WHERE id = auth.uid())
  )
);