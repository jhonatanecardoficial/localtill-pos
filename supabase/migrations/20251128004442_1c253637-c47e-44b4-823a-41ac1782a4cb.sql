-- Políticas para operadores abrirem e fecharem caixa

-- 1. DROP políticas existentes de cash_registers
DROP POLICY IF EXISTS "Company users can open cash register" ON public.cash_registers;
DROP POLICY IF EXISTS "Company users can update cash registers" ON public.cash_registers;
DROP POLICY IF EXISTS "Company users can view cash registers" ON public.cash_registers;

-- 2. Criar novas políticas simplificadas para cash_registers
-- Permite visualizar caixas da própria filial ou do mesmo owner
CREATE POLICY "Users can view cash registers"
ON public.cash_registers
FOR SELECT
TO authenticated
USING (
  operator_id = auth.uid()
  OR
  EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid() 
    AND (
      p.owner_id = (SELECT owner_id FROM public.profiles WHERE id = cash_registers.operator_id)
      OR p.branch_id = cash_registers.branch_id
    )
  )
);

-- Permite abrir caixa (INSERT)
CREATE POLICY "Users can open cash register"
ON public.cash_registers
FOR INSERT
TO authenticated
WITH CHECK (
  operator_id = auth.uid()
);

-- Permite atualizar/fechar o próprio caixa
CREATE POLICY "Users can close their own cash register"
ON public.cash_registers
FOR UPDATE
TO authenticated
USING (operator_id = auth.uid())
WITH CHECK (operator_id = auth.uid());

-- 3. DROP e recriar políticas de sales
DROP POLICY IF EXISTS "Users can create their own sales" ON public.sales;
DROP POLICY IF EXISTS "Users can view sales of their branches" ON public.sales;
DROP POLICY IF EXISTS "Users can update sales of their branches" ON public.sales;

-- Permite criar vendas se for o cashier
CREATE POLICY "Users can create sales"
ON public.sales
FOR INSERT
TO authenticated
WITH CHECK (cashier_id = auth.uid());

-- Permite visualizar vendas da própria filial ou do mesmo owner
CREATE POLICY "Users can view branch sales"
ON public.sales
FOR SELECT
TO authenticated
USING (
  cashier_id = auth.uid()
  OR
  EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid() 
    AND (
      p.owner_id = (SELECT owner_id FROM public.profiles WHERE id = sales.cashier_id)
      OR p.branch_id = sales.branch_id
    )
  )
);

-- Permite atualizar vendas apenas para admins
CREATE POLICY "Admins can update sales"
ON public.sales
FOR UPDATE
TO authenticated
USING (
  has_role(auth.uid(), 'admin')
);